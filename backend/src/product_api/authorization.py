from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Protocol

from fastapi import HTTPException, status

from ..authorization.policy import Principal, ResourcePermission, evaluate_project_access
from ..identity.repository import IdentityRepository, IdentitySnapshot


class ScopeAuthorizer(Protocol):
    def __call__(self, principal: Principal, project_id: str | None,
                 team_id: str | None, permission: ResourcePermission) -> None: ...


class WorkOSScopeAuthorizer:
    """Reuses canonical membership/project grants; unknown team scopes deny."""

    def __init__(self, identity_repository: IdentityRepository, authorization_client: Any | None = None) -> None:
        self.identity_repository = identity_repository
        self.authorization_client = authorization_client

    def _authorize_team(self, principal: Principal, team_id: str, permission: ResourcePermission) -> None:
        if self.authorization_client is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Team scope is unavailable without canonical authorization storage.")
        try:
            rows = (self.authorization_client.table("teams").select("id,organization_id,state")
                    .eq("id", team_id).eq("organization_id", principal.organization_id)
                    .eq("state", "active").limit(1).execute().data or [])
            if not rows:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Team not found.")
            if principal.role.value in {"owner", "admin"}:
                return
            memberships = (self.authorization_client.table("team_memberships").select("team_id")
                           .eq("team_id", team_id).eq("profile_id", principal.profile_id)
                           .limit(1).execute().data or [])
            if memberships:
                return
            grants = (self.authorization_client.table("resource_grants").select("permission,expires_at")
                      .eq("organization_id", principal.organization_id).eq("resource_type", "team")
                      .eq("resource_id", team_id).eq("principal_type", "profile")
                      .eq("principal_id", principal.profile_id).execute().data or [])
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Team authorization could not be verified.") from exc
        rank = {"view": 10, "use": 20, "edit": 30, "manage": 40}
        def active(item: dict[str, Any]) -> bool:
            expires_at = item.get("expires_at")
            if expires_at is None:
                return True
            try:
                return datetime.fromisoformat(str(expires_at).replace("Z", "+00:00")) > datetime.now(UTC)
            except ValueError:
                return False
        if any(active(item) and rank.get(str(item.get("permission")), 0) >= rank[permission.value] for item in grants):
            return
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Team access denied.")

    def __call__(self, principal: Principal, project_id: str | None,
                 team_id: str | None, permission: ResourcePermission) -> None:
        if project_id is None:
            if permission is ResourcePermission.VIEW or principal.role.value != "viewer":
                if team_id is not None:
                    self._authorize_team(principal, team_id, permission)
                return
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Organization mutation is not permitted.")
        snapshot = IdentitySnapshot(
            profile_id=principal.profile_id, issuer=principal.issuer, subject=principal.subject,
            email=principal.email, organization_id=principal.organization_id,
            workos_organization_id=principal.workos_organization_id, organization_name="",
            role=principal.role, membership_state="active",
        )
        access = self.identity_repository.get_project_access(principal=snapshot, project_id=project_id)
        if access is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found.")
        decision = evaluate_project_access(
            principal=principal, project_organization_id=access.organization_id,
            visibility=access.visibility, direct_role=access.direct_role,
            grants=access.grants, required=permission,
        )
        if not decision.allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Project access denied: {decision.reason}.")
        if team_id is not None:
            self._authorize_team(principal, team_id, permission)
