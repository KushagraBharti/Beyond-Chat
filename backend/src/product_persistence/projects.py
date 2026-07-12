"""Organization-scoped project directory for the product plane.

Projects live in the canonical identity tables (``projects`` +
``project_memberships``); the identity plane owns per-project authorization
(`get_project_access`). This module adds the missing product-plane surface:
listing the projects a principal may see, creating a project, and reading a
single project — always scoped by the verified organization from the
principal, never by client-supplied organization IDs.

Visibility rules mirror the canonical RLS policies: owner/admin/builder see
every organization project; members and viewers see organization-visibility
projects plus private projects they created or belong to.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from threading import RLock
from typing import Any, Protocol
from uuid import uuid4

from ..authorization.policy import OrganizationRole
from ..supabase_service import supabase_service
from .contracts import ConflictError

_PROJECT_VISIBILITIES = frozenset({"organization", "private"})
_BROAD_PROJECT_ROLES = frozenset(
    {OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.BUILDER}
)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def project_slug(name: str) -> str:
    candidate = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")[:63]
    if len(candidate) < 3:
        candidate = f"project-{uuid4().hex[:10]}"
    return candidate


def validate_visibility(value: str | None) -> str:
    visibility = (value or "organization").strip().lower()
    if visibility not in _PROJECT_VISIBILITIES:
        raise ValueError("Project visibility must be 'organization' or 'private'.")
    return visibility


def _public_project(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "organizationId": str(row["organization_id"]),
        "name": row.get("name"),
        "slug": row.get("slug"),
        "description": row.get("description"),
        "visibility": row.get("visibility"),
        "createdBy": row.get("created_by"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


class ProjectDirectory(Protocol):
    def list_projects(
        self, *, organization_id: str, profile_id: str, role: OrganizationRole
    ) -> list[dict[str, Any]]: ...

    def get_project(
        self, *, organization_id: str, project_id: str, profile_id: str, role: OrganizationRole
    ) -> dict[str, Any] | None: ...

    def create_project(
        self,
        *,
        organization_id: str,
        profile_id: str,
        name: str,
        description: str | None,
        visibility: str,
    ) -> dict[str, Any]: ...


class SupabaseProjectDirectory:
    def _client(self):
        client = supabase_service.client()
        if client is None:
            raise RuntimeError(
                "Project directory requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
            )
        return client

    def _member_project_ids(self, client: Any, profile_id: str) -> set[str]:
        rows = (
            client.table("project_memberships")
            .select("project_id")
            .eq("profile_id", profile_id)
            .execute()
            .data
            or []
        )
        return {str(row["project_id"]) for row in rows}

    def list_projects(
        self, *, organization_id: str, profile_id: str, role: OrganizationRole
    ) -> list[dict[str, Any]]:
        client = self._client()
        rows = (
            client.table("projects")
            .select("*")
            .eq("organization_id", organization_id)
            .order("updated_at", desc=True)
            .limit(200)
            .execute()
            .data
            or []
        )
        if role in _BROAD_PROJECT_ROLES:
            visible = rows
        else:
            memberships = self._member_project_ids(client, profile_id)
            visible = [
                row
                for row in rows
                if row.get("visibility") == "organization"
                or str(row.get("created_by")) == profile_id
                or str(row.get("id")) in memberships
            ]
        return [_public_project(dict(row)) for row in visible]

    def get_project(
        self, *, organization_id: str, project_id: str, profile_id: str, role: OrganizationRole
    ) -> dict[str, Any] | None:
        client = self._client()
        rows = (
            client.table("projects")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("id", project_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        if not rows:
            return None
        row = dict(rows[0])
        if role not in _BROAD_PROJECT_ROLES and row.get("visibility") != "organization":
            if str(row.get("created_by")) != profile_id and project_id not in self._member_project_ids(
                client, profile_id
            ):
                return None
        return _public_project(row)

    def create_project(
        self,
        *,
        organization_id: str,
        profile_id: str,
        name: str,
        description: str | None,
        visibility: str,
    ) -> dict[str, Any]:
        client = self._client()
        slug = project_slug(name)
        existing = (
            client.table("projects")
            .select("id")
            .eq("organization_id", organization_id)
            .eq("slug", slug)
            .limit(1)
            .execute()
            .data
            or []
        )
        if existing:
            slug = f"{slug[:52]}-{uuid4().hex[:8]}"
        created = (
            client.table("projects")
            .insert(
                {
                    "organization_id": organization_id,
                    "name": name,
                    "slug": slug,
                    "description": description,
                    "visibility": visibility,
                    "created_by": profile_id,
                }
            )
            .execute()
            .data
        )
        row = created[0] if isinstance(created, list) and created else created
        if not isinstance(row, dict):
            raise RuntimeError("Project creation did not return a row.")
        client.table("project_memberships").insert(
            {
                "project_id": row["id"],
                "profile_id": profile_id,
                "role": "owner",
                "created_by": profile_id,
            }
        ).execute()
        return _public_project(dict(row))


class InMemoryProjectDirectory:
    """Deterministic directory for contract tests; mirrors the RLS semantics."""

    def __init__(self) -> None:
        self.projects: dict[str, dict[str, Any]] = {}
        self.memberships: set[tuple[str, str]] = set()
        self._lock = RLock()

    def list_projects(
        self, *, organization_id: str, profile_id: str, role: OrganizationRole
    ) -> list[dict[str, Any]]:
        with self._lock:
            rows = [
                row
                for row in self.projects.values()
                if row["organization_id"] == organization_id
            ]
            if role not in _BROAD_PROJECT_ROLES:
                rows = [
                    row
                    for row in rows
                    if row["visibility"] == "organization"
                    or row["created_by"] == profile_id
                    or (row["id"], profile_id) in self.memberships
                ]
            rows.sort(key=lambda row: str(row.get("updated_at")), reverse=True)
            return [_public_project(dict(row)) for row in rows]

    def get_project(
        self, *, organization_id: str, project_id: str, profile_id: str, role: OrganizationRole
    ) -> dict[str, Any] | None:
        with self._lock:
            row = self.projects.get(project_id)
            if not row or row["organization_id"] != organization_id:
                return None
            if role not in _BROAD_PROJECT_ROLES and row["visibility"] != "organization":
                if row["created_by"] != profile_id and (project_id, profile_id) not in self.memberships:
                    return None
            return _public_project(dict(row))

    def create_project(
        self,
        *,
        organization_id: str,
        profile_id: str,
        name: str,
        description: str | None,
        visibility: str,
    ) -> dict[str, Any]:
        with self._lock:
            slug = project_slug(name)
            if any(
                row["organization_id"] == organization_id and row["slug"] == slug
                for row in self.projects.values()
            ):
                slug = f"{slug[:52]}-{uuid4().hex[:8]}"
            row = {
                "id": str(uuid4()),
                "organization_id": organization_id,
                "name": name,
                "slug": slug,
                "description": description,
                "visibility": visibility,
                "created_by": profile_id,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
            self.projects[row["id"]] = row
            self.memberships.add((row["id"], profile_id))
            return _public_project(dict(row))


class UnavailableProjectDirectory:
    """Fails closed when no durable persistence is configured."""

    def _unavailable(self) -> RuntimeError:
        return RuntimeError("provider_unavailable: project directory persistence is not configured")

    def list_projects(self, **_kwargs: Any) -> list[dict[str, Any]]:
        raise self._unavailable()

    def get_project(self, **_kwargs: Any) -> dict[str, Any] | None:
        raise self._unavailable()

    def create_project(self, **_kwargs: Any) -> dict[str, Any]:
        raise self._unavailable()


def configured_project_directory() -> ProjectDirectory:
    if supabase_service.client() is not None:
        return SupabaseProjectDirectory()
    return UnavailableProjectDirectory()


__all__ = [
    "ConflictError",
    "InMemoryProjectDirectory",
    "ProjectDirectory",
    "SupabaseProjectDirectory",
    "UnavailableProjectDirectory",
    "configured_project_directory",
    "project_slug",
    "validate_visibility",
]
