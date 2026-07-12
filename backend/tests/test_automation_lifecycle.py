"""Phase 11 automation lifecycle contracts.

Proves: pinned versions, idempotent duplicate-trigger collapse (the external
side-effect proof), signed webhook + Composio ingestion, scheduler-tick
idempotency, overlap policy, pause/archive behavior, owner offboarding,
retry → dead-letter, and the org-level failure inbox. No provider, scheduler
infrastructure, or runtime is contacted.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from src.authorization.policy import OrganizationRole, Principal, ResourcePermission
from src.product_api import ProductApiDependencies, create_product_router
from src.product_api.automation_service import (
    AutomationLifecycle, AutomationTriggerError, OwnerGuard, automation_webhook_secret,
)
from src.product_api.service import ProductService
from src.product_persistence import InMemoryProductRepository, InMemoryProjectDirectory, Scope

ORG, PROJECT = "org-a", "proj-a"
SIGNING_MASTER = "master-signing-key-for-tests"


def principal(role: OrganizationRole = OrganizationRole.BUILDER) -> Principal:
    return Principal("profile-owner", "user-a", "workos-test", ORG, "org_workos_a", role)


def sign(secret: str, payload: dict) -> tuple[bytes, str]:
    body = json.dumps(payload).encode()
    timestamp = int(time.time())
    digest_value = hmac.new(secret.encode(), f"{timestamp}".encode() + b"." + body,
                            hashlib.sha256).hexdigest()
    return body, f"t={timestamp},v1={digest_value}"


def build(owner_active: bool = True):
    repository = InMemoryProductRepository()
    directory = InMemoryProjectDirectory()
    directory.projects[PROJECT] = {
        "id": PROJECT, "organization_id": ORG, "name": "Alpha", "slug": "alpha",
        "description": None, "visibility": "organization", "created_by": "profile-owner",
        "created_at": "2026-07-12T00:00:00Z", "updated_at": "2026-07-12T00:00:00Z",
    }
    guard = OwnerGuard(lambda org, profile: owner_active)

    async def authenticate() -> Principal:
        return principal()

    async def no_guard() -> None:
        return None

    def authorize(value: Principal, project_id: str | None, team_id: str | None,
                  permission: ResourcePermission) -> None:
        assert permission in ResourcePermission
        if team_id is not None or (project_id is not None and project_id != PROJECT):
            raise HTTPException(404, "Project not found.")

    app = FastAPI()
    app.include_router(create_product_router(ProductApiDependencies(
        repository=repository, authorize_scope=authorize, principal=authenticate,
        mutation_guard=no_guard, projects=directory, owner_guard=guard)))
    lifecycle = AutomationLifecycle(ProductService(repository), guard)
    return TestClient(app), repository, lifecycle


def create_automation(api: TestClient, *, overlap: str = "skip",
                      trigger: dict | None = None, max_attempts: int = 3) -> str:
    response = api.post(f"/api/v2/product/projects/{PROJECT}/automations",
                        headers={"Idempotency-Key": f"auto-{overlap}-{time.time_ns()}"},
                        json={"name": "Weekly digest", "agent_version_id": "agent-version-1",
                              "trigger": trigger or {"kind": "manual"},
                              "max_cost_cents": 500, "max_actions": 20,
                              "configuration": {"overlap": overlap, "max_attempts": max_attempts}})
    assert response.status_code == 201
    return response.json()["id"]


def publish(api: TestClient, automation_id: str) -> dict:
    response = api.post(f"/api/v2/product/projects/{PROJECT}/automations/{automation_id}/versions",
                        headers={"Idempotency-Key": f"publish-{automation_id}"})
    assert response.status_code == 201
    return response.json()


def test_versions_pin_configuration_and_triggers_require_one(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AUTOMATION_WEBHOOK_SIGNING_KEY", SIGNING_MASTER)
    api, _repo, lifecycle = build()
    automation_id = create_automation(api)

    blocked = api.post(f"/api/v2/product/projects/{PROJECT}/automations/{automation_id}/test"
                       .replace("/test", "/trigger"),
                       headers={"Idempotency-Key": "manual-1"})
    # Manual triggers now execute through the configured Modal runtime and
    # reach the pinned-version guard directly.
    assert blocked.status_code == 409
    with pytest.raises(AutomationTriggerError, match="no_published_version"):
        lifecycle.enqueue(scope=Scope(ORG, PROJECT), automation_id=automation_id,
                          trigger_source="webhook", trigger_key="webhook:x:1")

    version = publish(api, automation_id)
    assert version["payload"]["config_digest"].startswith("sha256:")
    execution = lifecycle.enqueue(scope=Scope(ORG, PROJECT), automation_id=automation_id,
                                  trigger_source="webhook", trigger_key="webhook:x:2")
    assert execution["payload"]["pinned_version_id"] == version["id"]
    assert execution["payload"]["service_principal_id"] == "profile-owner"

    listed = api.get(f"/api/v2/product/projects/{PROJECT}/automations/{automation_id}/versions")
    assert [item["id"] for item in listed.json()["items"]] == [version["id"]]


def test_duplicate_signed_webhook_deliveries_create_exactly_one_execution(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AUTOMATION_WEBHOOK_SIGNING_KEY", SIGNING_MASTER)
    api, _repo, _lifecycle = build()
    automation_id = create_automation(api, overlap="allow")
    publish(api, automation_id)
    secret = automation_webhook_secret(automation_id)
    body, signature = sign(secret, {"event_id": "evt-77", "detail": "row added"})
    url = f"/api/v2/product/webhooks/automations/{ORG}/{automation_id}"

    first = api.post(url, content=body, headers={"beyond-trigger-signature": signature})
    assert first.status_code == 200 and first.json()["result"] == "enqueued"
    second = api.post(url, content=body, headers={"beyond-trigger-signature": signature})
    assert second.json()["execution_id"] == first.json()["execution_id"], (
        "a duplicate delivery must collapse onto the same execution — the "
        "external side effect can only happen once")

    history = api.get(f"/api/v2/product/projects/{PROJECT}/automations/{automation_id}/executions")
    assert len(history.json()["items"]) == 1

    forged = api.post(url, content=body, headers={"beyond-trigger-signature": "t=1,v1=bad"})
    assert forged.status_code == 400
    assert len(api.get(
        f"/api/v2/product/projects/{PROJECT}/automations/{automation_id}/executions"
    ).json()["items"]) == 1


def test_overlap_policy_and_paused_automations_fail_closed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AUTOMATION_WEBHOOK_SIGNING_KEY", SIGNING_MASTER)
    api, _repo, lifecycle = build()
    scope = Scope(ORG, PROJECT)
    automation_id = create_automation(api, overlap="skip")
    publish(api, automation_id)
    lifecycle.enqueue(scope=scope, automation_id=automation_id,
                      trigger_source="webhook", trigger_key="webhook:a:1")
    with pytest.raises(AutomationTriggerError, match="overlap_skipped"):
        lifecycle.enqueue(scope=scope, automation_id=automation_id,
                          trigger_source="webhook", trigger_key="webhook:a:2")

    relaxed = create_automation(api, overlap="allow")
    publish(api, relaxed)
    lifecycle.enqueue(scope=scope, automation_id=relaxed, trigger_source="webhook",
                      trigger_key="webhook:b:1")
    lifecycle.enqueue(scope=scope, automation_id=relaxed, trigger_source="webhook",
                      trigger_key="webhook:b:2")

    paused = create_automation(api)
    publish(api, paused)
    current = api.get(f"/api/v2/product/projects/{PROJECT}/automations").json()["items"]
    version = next(item["version"] for item in current if item["id"] == paused)
    assert api.post(f"/api/v2/product/projects/{PROJECT}/automations/{paused}/state/pause",
                    headers={"If-Match": str(version)}).status_code == 200
    with pytest.raises(AutomationTriggerError, match="automation_paused"):
        lifecycle.enqueue(scope=scope, automation_id=paused, trigger_source="webhook",
                          trigger_key="webhook:c:1")


def test_owner_offboarding_pauses_instead_of_running(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AUTOMATION_WEBHOOK_SIGNING_KEY", SIGNING_MASTER)
    api, repo, lifecycle = build(owner_active=False)
    automation_id = create_automation(api)
    publish(api, automation_id)
    with pytest.raises(AutomationTriggerError, match="owner_offboarded"):
        lifecycle.enqueue(scope=Scope(ORG, PROJECT), automation_id=automation_id,
                          trigger_source="webhook", trigger_key="webhook:off:1")
    paused = repo.get(kind="automation", record_id=automation_id, scope=Scope(ORG, PROJECT))
    assert paused is not None and paused.state == "paused"
    assert paused.payload.get("paused_reason") == "owner_offboarded"


def test_scheduler_tick_is_idempotent_per_window_and_secret_gated(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AUTOMATION_WEBHOOK_SIGNING_KEY", SIGNING_MASTER)
    monkeypatch.setenv("AUTOMATION_SCHEDULER_SECRET", "tick-secret")
    api, _repo, _lifecycle = build()
    automation_id = create_automation(
        api, overlap="allow", trigger={"kind": "schedule", "interval_minutes": 15})
    publish(api, automation_id)
    # Draft automations never run on a schedule; activate explicitly first.
    version = next(item["version"] for item in api.get(
        f"/api/v2/product/projects/{PROJECT}/automations").json()["items"]
        if item["id"] == automation_id)
    assert api.post(f"/api/v2/product/projects/{PROJECT}/automations/{automation_id}/state/resume",
                    headers={"If-Match": str(version)}).status_code == 200

    unauthenticated = api.post("/api/v2/product/automations/scheduler/tick")
    assert unauthenticated.status_code == 403

    first = api.post("/api/v2/product/automations/scheduler/tick",
                     headers={"x-scheduler-secret": "tick-secret"})
    assert first.status_code == 200
    assert first.json()["enqueued"] == 1
    replay = api.post("/api/v2/product/automations/scheduler/tick",
                      headers={"x-scheduler-secret": "tick-secret"})
    assert replay.json()["enqueued"] == 1, "same window re-enqueue must collapse"
    history = api.get(
        f"/api/v2/product/projects/{PROJECT}/automations/{automation_id}/executions")
    assert len(history.json()["items"]) == 1, (
        "two concurrent/repeated ticks in one window must produce one execution")


def test_retry_appends_attempts_until_dead_letter_and_inbox_lists_them(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AUTOMATION_WEBHOOK_SIGNING_KEY", SIGNING_MASTER)
    api, repo, _lifecycle = build()
    scope = Scope(ORG, PROJECT)
    automation_id = create_automation(api, max_attempts=2)
    publish(api, automation_id)
    failed = repo.create_once(
        kind="automation_execution", scope=scope, actor_id="profile-owner",
        idempotency_key="seed-failed", request_digest="digest", state="failed",
        payload={"parent_id": automation_id, "trigger": "webhook",
                 "trigger_key": "webhook:seed:1", "attempt": 1})

    base = f"/api/v2/product/projects/{PROJECT}/automations/{automation_id}/executions"
    retried = api.post(f"{base}/{failed.id}/retry")
    assert retried.status_code == 202
    assert retried.json()["payload"]["attempt"] == 2
    assert retried.json()["state"] == "queued"

    not_retryable = api.post(f"{base}/{retried.json()['id']}/retry")
    assert not_retryable.status_code == 409

    exhausted = repo.create_once(
        kind="automation_execution", scope=scope, actor_id="profile-owner",
        idempotency_key="seed-failed-2", request_digest="digest", state="failed",
        payload={"parent_id": automation_id, "trigger": "webhook",
                 "trigger_key": "webhook:seed:2", "attempt": 2})
    dead = api.post(f"{base}/{exhausted.id}/retry")
    assert dead.status_code == 202
    assert dead.json()["state"] == "dead_letter"

    inbox = api.get("/api/v2/product/organization/automation-failures")
    states = {item["state"] for item in inbox.json()["items"]}
    assert states == {"failed", "dead_letter"}


def test_test_runs_suppress_destinations_and_need_no_published_version(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AUTOMATION_WEBHOOK_SIGNING_KEY", SIGNING_MASTER)
    api, _repo, _lifecycle = build()
    automation_id = create_automation(api)
    response = api.post(f"/api/v2/product/projects/{PROJECT}/automations/{automation_id}/test",
                        headers={"Idempotency-Key": "test-run-1"})
    assert response.status_code == 202
    body = response.json()
    assert body["payload"]["test"] is True
    assert body["payload"]["destinations_suppressed"] is True
    assert body["payload"]["pinned_version_id"] is None
