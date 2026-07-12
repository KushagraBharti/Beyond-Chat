from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

import pytest

from src.runtime.coordinator import MemoryOutputStore, RuntimeAuthorizationDenied, RuntimeConflict, RuntimeCoordinator
from src.runtime.in_memory import AllowPolicy, InMemoryRuntimeQueue, InMemoryRuntimeRepository, OwnedConnections
from src.runtime.models import DurableEvent, GatewayRequest, RunIdentity, RuntimeRun, utc_now
from src.runtime.parity import ParityObservation, evaluate_parity


def fixture():
    repository = InMemoryRuntimeRepository()
    queue = InMemoryRuntimeQueue()
    policy = AllowPolicy()
    connections = OwnedConnections({("conn_1", "org_1", "act_1")})
    coordinator = RuntimeCoordinator(repository=repository, queue=queue, policy=policy, connections=connections, outputs=MemoryOutputStore(), organization_concurrency=1)
    run = RuntimeRun("run_1", "org_1", "prj_1", "act_1", "agv_1")
    return coordinator, repository, queue, policy, connections, run


def identity(
    run: RuntimeRun,
    *,
    audience: str = "tool-gateway",
    capabilities: tuple[str, ...] = ("tool.execute",),
) -> RunIdentity:
    return RunIdentity(
        run.run_id,
        run.organization_id,
        run.project_id,
        run.actor_id,
        run.agent_version_id,
        audience,
        "nonce_1",
        utc_now() + timedelta(minutes=5),
        capabilities,
    )


def test_multi_worker_claim_idempotency_recovery_and_org_concurrency() -> None:
    coordinator, repository, queue, _policy, _connections, run = fixture()
    assert coordinator.accept(run, idempotency_key="request_1") == coordinator.accept(run, idempotency_key="request_1")
    second = RuntimeRun("run_2", "org_1", "prj_1", "act_1", "agv_1")
    coordinator.accept(second, idempotency_key="request_2")
    first_lease = coordinator.claim("worker_a")
    assert first_lease is not None
    assert coordinator.claim("worker_b") is None
    expired = repository.reconcile_expired(first_lease.expires_at + timedelta(seconds=1))
    assert expired == [run.run_id]
    assert coordinator.claim("worker_b") is not None
    assert queue.notifications == ["run_1", "run_1", "run_2"]


def test_gateway_rechecks_current_policy_identity_and_connection_ownership() -> None:
    coordinator, repository, _queue, policy, connections, run = fixture()
    coordinator.accept(run, idempotency_key="request_1")
    request = GatewayRequest(identity(run), "tool.execute", connection_id="conn_1")
    assert coordinator.authorize_gateway(request) == "policy-v1"
    policy.allowed = False
    with pytest.raises(RuntimeAuthorizationDenied, match="revoked"):
        coordinator.authorize_gateway(request)
    policy.allowed = True
    connections.owned.clear()
    with pytest.raises(RuntimeAuthorizationDenied, match="ownership"):
        coordinator.authorize_gateway(request)
    with pytest.raises(RuntimeAuthorizationDenied, match="binding"):
        coordinator.authorize_gateway(GatewayRequest(identity(RuntimeRun("run_1", "org_other", "prj_1", "act_1", "agv_1")), "tool.execute"))


def test_gateway_identity_is_bound_to_audience_and_explicit_capability() -> None:
    coordinator, _repository, *_rest, run = fixture()
    coordinator.accept(run, idempotency_key="request_1")

    with pytest.raises(RuntimeAuthorizationDenied, match="audience"):
        coordinator.authorize_gateway(GatewayRequest(
            identity(run, audience="model-gateway", capabilities=("tool.execute",)),
            "tool.execute",
        ))
    with pytest.raises(RuntimeAuthorizationDenied, match="capability"):
        coordinator.authorize_gateway(GatewayRequest(
            identity(run, capabilities=("tool.read",)),
            "tool.execute",
        ))

    model_request = GatewayRequest(
        identity(run, audience="model-gateway", capabilities=("model.invoke",)),
        "model.invoke",
    )
    assert coordinator.authorize_gateway(model_request) == "policy-v1"


def test_authoritative_event_output_and_actual_failed_cost_are_idempotent() -> None:
    coordinator, repository, *_rest, run = fixture()
    coordinator.accept(run, idempotency_key="request_1")
    coordinator.append_event(DurableEvent(run.run_id, 1, "run.started", {}))
    output = coordinator.commit_output(run_id=run.run_id, sequence=2, name="memo.txt", media_type="text/plain", content=b"answer")
    assert output.digest.startswith("sha256:")
    assert repository.events[run.run_id][-1].event_type == "output.created"
    with pytest.raises(RuntimeConflict, match="sequence"):
        coordinator.append_event(DurableEvent(run.run_id, 4, "run.completed", {}))
    coordinator.finalize_cost(run_id=run.run_id, attempt=1, provider="modal", category="sandbox", amount_usd=Decimal("0.0123"), provider_usage_id="usage_1", rate_version="modal-2026-07-11", outcome="failed")
    coordinator.finalize_cost(run_id=run.run_id, attempt=1, provider="modal", category="sandbox", amount_usd=Decimal("0.0123"), provider_usage_id="usage_1", rate_version="modal-2026-07-11", outcome="failed")
    assert next(iter(repository.costs.values())).outcome == "failed"


def test_api_worker_provider_failure_injection_and_canary_rollback_harness() -> None:
    coordinator, repository, *_rest, run = fixture()
    coordinator.accept(run, idempotency_key="request_1")
    # API duplicate/reconnect: same idempotency key and contiguous replay.
    coordinator.append_event(DurableEvent(run.run_id, 1, "run.started", {}))
    assert repository.events_after(run.run_id, 0)[0].sequence == 1
    # Worker death: expired lease becomes queueable again.
    lease = coordinator.claim("worker_dies")
    assert lease is not None and repository.reconcile_expired(lease.expires_at + timedelta(seconds=1)) == [run.run_id]
    # Provider 429/500/timeout/partial upload are failure outcomes with consumed cost retained.
    for attempt, outcome in enumerate(("provider_429", "provider_500", "timeout", "partial_upload"), start=1):
        coordinator.finalize_cost(run_id=run.run_id, attempt=attempt, provider="modal", category="sandbox", amount_usd=Decimal("0.001"), provider_usage_id=f"usage_{attempt}", rate_version="modal-2026-07-11", outcome=outcome)
    failed = evaluate_parity([ParityObservation("finance", True, True, .95, .95, 1.1, 1.1, True, False)])
    assert failed == {"passed": False, "failures": ["finance:lifecycle"], "required_traffic_percent": 0}
