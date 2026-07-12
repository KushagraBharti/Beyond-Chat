from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.runtime.coordinator import MemoryOutputStore, RuntimeCoordinator
from src.runtime.in_memory import AllowPolicy, InMemoryRuntimeQueue, InMemoryRuntimeRepository, OwnedConnections
from src.runtime.router import RuntimePrincipal, create_runtime_router


def _app(repository: InMemoryRuntimeRepository, *, actor: str = "actor-a", organization: str = "org-a") -> TestClient:
    coordinator = RuntimeCoordinator(
        repository=repository,
        queue=InMemoryRuntimeQueue(),
        policy=AllowPolicy(),
        connections=OwnedConnections(),
        outputs=MemoryOutputStore(),
        organization_concurrency=1,
        lease_seconds=1,
    )

    async def principal() -> RuntimePrincipal:
        return RuntimePrincipal(actor_id=actor, organization_id=organization)

    async def mutation() -> None:
        return None

    app = FastAPI()
    app.include_router(create_runtime_router(coordinator, principal, mutation))
    return TestClient(app)


def test_duplicate_api_command_restart_replay_and_cancel() -> None:
    repository = InMemoryRuntimeRepository()
    client = _app(repository)
    payload = {"run_id": "run-phase4c", "project_id": "project-a", "agent_version_id": "general-v1"}
    first = client.post("/api/runtime/runs", json=payload, headers={"Idempotency-Key": "duplicate-001"})
    duplicate = client.post("/api/runtime/runs", json=payload, headers={"Idempotency-Key": "duplicate-001"})
    assert first.status_code == 202 and duplicate.json() == first.json()

    # A new API process reuses the durable repository and can replay/cancel the same run.
    restarted = _app(repository)
    replay = restarted.get("/api/runtime/runs/run-phase4c/events")
    assert replay.status_code == 200 and replay.json() == {"events": [], "cursor": 0}
    canceled = restarted.post("/api/runtime/runs/run-phase4c/cancel")
    assert canceled.status_code == 202 and canceled.json()["state"] == "canceled"


def test_worker_loss_requeues_once_and_cross_tenant_api_guess_is_hidden() -> None:
    repository = InMemoryRuntimeRepository()
    client = _app(repository)
    client.post(
        "/api/runtime/runs",
        json={"run_id": "run-worker-loss", "project_id": "project-a", "agent_version_id": "research-v1"},
        headers={"Idempotency-Key": "worker-loss-001"},
    )
    coordinator_client = _app(repository)
    lease = next(iter(repository.leases.values()), None)
    if lease is None:
        # Claims are worker-only and intentionally absent from the public API.
        from datetime import timedelta
        from src.runtime.models import utc_now
        from src.runtime.coordinator import RuntimeCoordinator
        coordinator = RuntimeCoordinator(repository=repository, queue=InMemoryRuntimeQueue(), policy=AllowPolicy(), connections=OwnedConnections(), outputs=MemoryOutputStore(), lease_seconds=1)
        lease = coordinator.claim("worker-that-dies")
        assert lease is not None
        assert repository.reconcile_expired(lease.expires_at + timedelta(seconds=1)) == ["run-worker-loss"]
    assert _app(repository, actor="actor-b", organization="org-b").get(
        "/api/runtime/runs/run-worker-loss/events"
    ).status_code == 404
    coordinator_client.close()


def test_parity_fixture_keeps_all_builtins_at_zero_traffic() -> None:
    fixture = Path(__file__).resolve().parents[2] / "fixtures" / "runtime" / "phase4c_parity.json"
    import json
    payload = json.loads(fixture.read_text(encoding="utf-8"))
    assert [item["agent"] for item in payload["runs"]] == ["General", "Research", "Finance"]
    assert payload["trafficPercent"] == 0
    assert payload["productionRoutingAuthorized"] is False


def test_approval_resolution_is_idempotent_and_tenant_bound() -> None:
    repository = InMemoryRuntimeRepository()
    client = _app(repository)
    client.post(
        "/api/runtime/runs",
        json={"run_id": "run-approval", "project_id": "project-a", "agent_version_id": "general-v1"},
        headers={"Idempotency-Key": "approval-idem-001"},
    )
    from dataclasses import replace
    repository.runs["run-approval"] = replace(repository.runs["run-approval"], state="running")
    coordinator = RuntimeCoordinator(repository=repository, queue=InMemoryRuntimeQueue(), policy=AllowPolicy(), connections=OwnedConnections(), outputs=MemoryOutputStore())
    coordinator.request_approval(approval_id="approval-1", run_id="run-approval", sequence=1, operation="tool.external_write", argument_summary={"target": "draft"})
    first = client.post("/api/runtime/approvals/approval-1/resolve", json={"decision": "approved"})
    duplicate = client.post("/api/runtime/approvals/approval-1/resolve", json={"decision": "approved"})
    assert first.status_code == 200 and duplicate.status_code == 200
    assert first.json()["state"] == duplicate.json()["state"] == "queued"
    repository.approvals["approval-2"] = ("run-approval", "pending")
    assert _app(repository, actor="actor-b", organization="org-b").post(
        "/api/runtime/approvals/approval-2/resolve", json={"decision": "approved"}
    ).status_code >= 400
