from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum

from fastapi import HTTPException, status


class OrganizationRole(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    BUILDER = "builder"
    MEMBER = "member"
    VIEWER = "viewer"


class ProjectRole(StrEnum):
    OWNER = "owner"
    EDITOR = "editor"
    CONTRIBUTOR = "contributor"
    VIEWER = "viewer"


class ResourcePermission(StrEnum):
    VIEW = "view"
    USE = "use"
    EDIT = "edit"
    MANAGE = "manage"


ORGANIZATION_ROLE_RANK: dict[OrganizationRole, int] = {
    OrganizationRole.VIEWER: 10,
    OrganizationRole.MEMBER: 20,
    OrganizationRole.BUILDER: 30,
    OrganizationRole.ADMIN: 40,
    OrganizationRole.OWNER: 50,
}

PROJECT_ROLE_PERMISSIONS: dict[ProjectRole, frozenset[ResourcePermission]] = {
    ProjectRole.VIEWER: frozenset({ResourcePermission.VIEW}),
    ProjectRole.CONTRIBUTOR: frozenset({ResourcePermission.VIEW, ResourcePermission.USE}),
    ProjectRole.EDITOR: frozenset(
        {ResourcePermission.VIEW, ResourcePermission.USE, ResourcePermission.EDIT}
    ),
    ProjectRole.OWNER: frozenset(ResourcePermission),
}


@dataclass(frozen=True)
class Principal:
    """A canonical, currently active Beyond identity.

    The WorkOS token is identity evidence only. ``role`` is always the role
    re-read from the canonical database for the selected organization so a
    suspended/revoked membership is denied immediately.
    """

    profile_id: str
    subject: str
    issuer: str
    organization_id: str
    workos_organization_id: str
    role: OrganizationRole
    email: str | None = None
    session_id: str | None = None
    token_permissions: frozenset[str] = field(default_factory=frozenset)


@dataclass(frozen=True)
class AuthorizationDecision:
    allowed: bool
    reason: str
    effective_permissions: frozenset[ResourcePermission] = field(default_factory=frozenset)


def require_organization_role(
    principal: Principal,
    minimum: OrganizationRole,
) -> Principal:
    if ORGANIZATION_ROLE_RANK[principal.role] < ORGANIZATION_ROLE_RANK[minimum]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This action requires the {minimum.value} organization role or higher.",
        )
    return principal


def evaluate_project_access(
    *,
    principal: Principal,
    project_organization_id: str,
    visibility: str,
    direct_role: ProjectRole | None,
    grants: set[ResourcePermission] | frozenset[ResourcePermission],
    required: ResourcePermission,
) -> AuthorizationDecision:
    """Evaluate project access without accepting organization IDs from token-only state."""

    if project_organization_id != principal.organization_id:
        return AuthorizationDecision(False, "cross_organization")

    effective = set(grants)
    if direct_role is not None:
        effective.update(PROJECT_ROLE_PERMISSIONS[direct_role])
    if visibility == "organization":
        effective.add(ResourcePermission.VIEW)
    if principal.role in {OrganizationRole.OWNER, OrganizationRole.ADMIN}:
        effective.update(ResourcePermission)
    elif principal.role is OrganizationRole.BUILDER:
        effective.update(
            {ResourcePermission.VIEW, ResourcePermission.USE, ResourcePermission.EDIT}
        )

    permissions = frozenset(effective)
    return AuthorizationDecision(
        required in permissions,
        "allowed" if required in permissions else "insufficient_permission",
        permissions,
    )
