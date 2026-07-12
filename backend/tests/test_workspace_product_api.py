"""Contract tests for the Phase 5 workspace product surfaces.

Covers the project directory routes, organization-level recent listings, and
the truthful workspace capability report. Isolation invariants: organization
boundaries are absolute, private projects stay invisible to non-members, and
capability readiness is server-computed rather than implied by catalog rows.
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from src.authorization.policy import OrganizationRole, Principal, ResourcePermission
from src.product_api import ProductApiDependencies, create_product_router
from src.product_persistence import InMemoryProductRepository, InMemoryProjectDirectory, Scope


def principal(role: OrganizationRole = OrganizationRole.ADMIN, *, organization_id: str = "org-a",
              profile_id: str = "profile-a") -> Principal:
    return Principal(profile_id, "user-a", "workos-test", organization_id, "org_workos_a", role)


def build_client(*, role: OrganizationRole = OrganizationRole.ADMIN,
                 organization_id: str = "org-a", profile_id: str = "profile-a",
                 repository: InMemoryProductRepository | None = None,
                 directory: InMemoryProjectDirectory | None = None):
    repository = repository if repository is not None else InMemoryProductRepository()
    directory = directory if directory is not None else InMemoryProjectDirectory()
    actor = principal(role, organization_id=organization_id, profile_id=profile_id)

    async def authenticate() -> Principal:
        return actor

    async def guard() -> None:
        return None

    def authorize(value: Principal, project_id: str | None, team_id: str | None,
                  permission: ResourcePermission) -> None:
        # Mirrors the real authorizer's shape: org-level access is fine, but a
        # project reference must exist inside the caller's organization.
        assert permission in ResourcePermission
        if team_id is not None:
            raise HTTPException(403, "scope denied")
        if project_id is not None:
            row = directory.projects.get(project_id)
            if row is None or row["organization_id"] != value.organization_id:
                raise HTTPException(404, "Project not found.")

    app = FastAPI()
    app.include_router(create_product_router(ProductApiDependencies(
        repository=repository, authorize_scope=authorize, principal=authenticate,
        mutation_guard=guard, projects=directory)))
    return TestClient(app), repository, directory


def test_project_create_list_get_roundtrip() -> None:
    api, _repository, directory = build_client(role=OrganizationRole.MEMBER)

    created = api.post("/api/v2/product/projects",
                       json={"name": "Market entry", "description": "Launch analysis"})
    assert created.status_code == 201
    body = created.json()
    assert body["organizationId"] == "org-a"
    assert body["slug"] == "market-entry"
    assert body["visibility"] == "organization"

    listed = api.get("/api/v2/product/projects")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()["items"]] == [body["id"]]

    fetched = api.get(f"/api/v2/product/projects/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Market entry"

    missing = api.get("/api/v2/product/projects/00000000-0000-0000-0000-00000000dead")
    assert missing.status_code == 404
    assert directory.projects[body["id"]]["created_by"] == "profile-a"


def test_viewer_cannot_create_projects() -> None:
    api, _repository, directory = build_client(role=OrganizationRole.VIEWER)
    denied = api.post("/api/v2/product/projects", json={"name": "Should fail"})
    assert denied.status_code == 403
    assert directory.projects == {}


def test_private_projects_are_invisible_to_non_members() -> None:
    directory = InMemoryProjectDirectory()
    owner_project = directory.create_project(
        organization_id="org-a", profile_id="profile-owner",
        name="Private plan", description=None, visibility="private")
    directory.create_project(
        organization_id="org-a", profile_id="profile-owner",
        name="Org visible", description=None, visibility="organization")

    member_api, _, _ = build_client(role=OrganizationRole.MEMBER, profile_id="profile-b",
                                    directory=directory)
    names = [item["name"] for item in member_api.get("/api/v2/product/projects").json()["items"]]
    assert names == ["Org visible"]
    hidden = member_api.get(f"/api/v2/product/projects/{owner_project['id']}")
    assert hidden.status_code == 404

    builder_api, _, _ = build_client(role=OrganizationRole.BUILDER, profile_id="profile-c",
                                     directory=directory)
    broad = [item["name"] for item in builder_api.get("/api/v2/product/projects").json()["items"]]
    assert sorted(broad) == ["Org visible", "Private plan"]


def test_projects_are_organization_isolated() -> None:
    directory = InMemoryProjectDirectory()
    foreign = directory.create_project(
        organization_id="org-b", profile_id="profile-z",
        name="Foreign project", description=None, visibility="organization")

    api, _, _ = build_client(role=OrganizationRole.OWNER, directory=directory)
    assert api.get("/api/v2/product/projects").json()["items"] == []
    # A guessed cross-organization project ID is indistinguishable from a
    # missing one.
    assert api.get(f"/api/v2/product/projects/{foreign['id']}").status_code == 404


def test_organization_recent_lists_cross_project_but_never_cross_org() -> None:
    repository = InMemoryProductRepository()
    for index, (org, project) in enumerate(
            [("org-a", "project-1"), ("org-a", "project-2"), ("org-b", "project-9")]):
        repository.create_once(kind="output", scope=Scope(org, project), actor_id="profile-x",
                               idempotency_key=f"output-{index}", request_digest="digest",
                               state="draft", payload={"name": f"Output {index}"})
    repository.create_once(kind="capability_approval", scope=Scope("org-a", "project-1"),
                           actor_id="profile-x", idempotency_key="approval-1",
                           request_digest="digest", state="pending", payload={"name": "Approval"})
    repository.create_once(kind="capability_approval", scope=Scope("org-a", "project-1"),
                           actor_id="profile-x", idempotency_key="approval-2",
                           request_digest="digest-2", state="approved", payload={"name": "Old"})

    api, _, _ = build_client(role=OrganizationRole.VIEWER, repository=repository)
    outputs = api.get("/api/v2/product/organization/recent/outputs")
    assert outputs.status_code == 200
    projects_seen = {item["scope"]["project_id"] for item in outputs.json()["items"]}
    assert projects_seen == {"project-1", "project-2"}

    approvals = api.get("/api/v2/product/organization/recent/approvals")
    assert [item["state"] for item in approvals.json()["items"]] == ["pending"]

    unknown = api.get("/api/v2/product/organization/recent/everything")
    assert unknown.status_code == 404


def test_workspace_capabilities_are_truthful_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BEYOND_RUNTIME_CONTROL_PLANE_ENABLED", raising=False)
    api, _, _ = build_client(role=OrganizationRole.VIEWER)
    report = api.get("/api/v2/product/workspace/capabilities")
    assert report.status_code == 200
    body = report.json()
    assert body["runtime_execution"] is False
    assert set(body["providers"]) == {"models", "retrieval", "actions", "billing"}
    assert all(entry["state"] == "unavailable" and entry["externally_verified"] is False
               for entry in body["providers"].values())

    monkeypatch.setenv("BEYOND_RUNTIME_CONTROL_PLANE_ENABLED", "true")
    enabled = api.get("/api/v2/product/workspace/capabilities").json()
    assert enabled["runtime_execution"] is True
