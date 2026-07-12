from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
import pytest

from src.authorization.policy import OrganizationRole, Principal, ResourcePermission
from src.product_api import ProductApiDependencies, create_product_router
from src.product_persistence import ConflictError, InMemoryProductRepository, Scope
from src.product_persistence import PRODUCT_KINDS, schema_manifest


def principal(role: OrganizationRole = OrganizationRole.ADMIN, organization_id: str = "org-a") -> Principal:
    return Principal("profile-a", "user-a", "workos-test", organization_id, "org_workos_a", role)


class Providers:
    def __init__(self, ready: set[str] | None = None) -> None:
        self.ready = ready or set()

    def status(self, capability: str, *, organization_id: str):
        if capability == "billing":
            return {"state": "ready" if capability in self.ready else "unavailable",
                    "externally_verified": capability in self.ready,
                    "entitlement_state": "enabled" if capability in self.ready else "enabled"}
        return {"state": "ready" if capability in self.ready else "unavailable",
                "externally_verified": capability in self.ready, "organization_id": organization_id}


def client(*, role: OrganizationRole = OrganizationRole.ADMIN, providers: Providers | None = None):
    repository = InMemoryProductRepository()

    async def authenticate() -> Principal:
        return principal(role)

    async def guard() -> None:
        return None

    def authorize(value: Principal, project_id: str | None, team_id: str | None,
                  permission: ResourcePermission) -> None:
        assert value.organization_id == "org-a"
        if project_id not in {None, "project-a"} or team_id is not None:
            raise HTTPException(403, "scope denied")
        assert permission in ResourcePermission

    app = FastAPI()
    app.include_router(create_product_router(ProductApiDependencies(
        repository=repository, authorize_scope=authorize, principal=authenticate,
        mutation_guard=guard, providers=providers or Providers())))
    return TestClient(app), repository


def test_repository_idempotency_scope_and_optimistic_concurrency() -> None:
    repository = InMemoryProductRepository()
    scope = Scope("org-a", "project-a")
    first = repository.create_once(kind="output", scope=scope, actor_id="profile-a",
        idempotency_key="output-key", request_digest="digest-a", state="draft", payload={"name": "Memo"})
    replay = repository.create_once(kind="output", scope=scope, actor_id="profile-a",
        idempotency_key="output-key", request_digest="digest-a", state="draft", payload={"name": "Memo"})
    assert replay.id == first.id
    assert repository.get(kind="output", record_id=first.id, scope=Scope("org-b", "project-a")) is None
    with pytest.raises(ConflictError, match="idempotency_key_reused"):
        repository.create_once(kind="output", scope=scope, actor_id="profile-a",
            idempotency_key="output-key", request_digest="digest-b", state="draft", payload={})
    updated = repository.update(kind="output", record_id=first.id, scope=scope, actor_id="profile-a",
        expected_version=1, payload={"name": "Memo v2"})
    assert updated.version == 2
    with pytest.raises(ConflictError, match="stale_version"):
        repository.update(kind="output", record_id=first.id, scope=scope, actor_id="profile-a",
            expected_version=1, payload={})


def test_output_version_and_comment_contract() -> None:
    api, _ = client()
    headers = {"Idempotency-Key": "output-create-001"}
    created = api.post("/api/v2/product/projects/project-a/outputs", headers=headers,
        json={"name": "Quarterly memo", "configuration": {"type": "document"}})
    assert created.status_code == 201
    output_id = created.json()["id"]
    replay = api.post("/api/v2/product/projects/project-a/outputs", headers=headers,
        json={"name": "Quarterly memo", "configuration": {"type": "document"}})
    assert replay.json()["id"] == output_id
    version = api.post(f"/api/v2/product/projects/project-a/outputs/{output_id}/versions",
        headers={"Idempotency-Key": "output-version-001"},
        json={"content": {"blocks": []}, "change_summary": "Initial"})
    assert version.status_code == 201
    comment = api.post(f"/api/v2/product/projects/project-a/outputs/{output_id}/comments",
        headers={"Idempotency-Key": "output-comment-001"}, json={"body": "Please verify source 3."})
    assert comment.status_code == 201


def test_provider_operations_deny_by_default_and_billing_cannot_be_client_granted() -> None:
    api, _ = client()
    retrieval = api.post("/api/v2/product/projects/project-a/knowledge/retrieval",
        headers={"Idempotency-Key": "retrieval-001"}, json={"query": "forecast assumptions"})
    assert retrieval.status_code == 503
    billing = api.get("/api/v2/product/billing/status")
    assert billing.status_code == 200
    assert billing.json()["externally_verified"] is False
    assert billing.json()["entitlement_state"] == "disabled"


def test_publish_requires_builder_and_compare_and_swap_is_required_for_mutation() -> None:
    member_api, _ = client(role=OrganizationRole.MEMBER)
    draft = member_api.post("/api/v2/product/projects/project-a/agents/drafts",
        headers={"Idempotency-Key": "agent-draft-001"},
        json={"name": "Operations brief", "configuration": {"model": "pinned-model"}})
    assert draft.status_code == 201
    denied = member_api.post(
        f"/api/v2/product/projects/project-a/agents/drafts/{draft.json()['id']}/publish",
        headers={"Idempotency-Key": "agent-publish-001"})
    assert denied.status_code == 403
    missing_version = member_api.patch(
        f"/api/v2/product/projects/project-a/agents/drafts/{draft.json()['id']}",
        json={"description": "Changed"})
    assert missing_version.status_code == 422


def test_team_scope_denies_without_explicit_team_authorization() -> None:
    api, _ = client()
    denied = api.post("/api/v2/product/projects/project-a/outputs",
        headers={"Idempotency-Key": "team-output-001"},
        json={"name": "Team memo", "team_id": "team-a"})
    assert denied.status_code == 403


def test_admitted_manifest_normalizes_all_kinds_into_one_record_table() -> None:
    manifest = schema_manifest()
    assert manifest["status"] == "admitted"
    assert len(PRODUCT_KINDS) == 26
    assert set(manifest["physical_tables"]) == {"product_records", "product_idempotency_keys"}


def test_main_application_mounts_aggregate_product_router() -> None:
    from src.main import app

    paths = {route.path for route in app.routes}
    assert "/api/v2/product/schema-manifest" in paths
    assert "/api/v2/product/projects/{project_id}/outputs" in paths
