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


class OrganizationPermission(StrEnum):
    """Named organization-level actions. Routes must gate on permissions,
    never on ad-hoc role comparisons, so role semantics stay in one place."""

    VIEW_ORGANIZATION = "view_organization"
    VIEW_MEMBER_DIRECTORY = "view_member_directory"
    VIEW_MEMBER_LIFECYCLE = "view_member_lifecycle"
    INVITE_MEMBERS = "invite_members"
    CHANGE_MEMBER_ROLES = "change_member_roles"
    SUSPEND_MEMBERS = "suspend_members"
    REVOKE_MEMBERS = "revoke_members"
    RESTORE_MEMBERS = "restore_members"
    MANAGE_ORGANIZATION_SETTINGS = "manage_organization_settings"
    BUILD_AGENTS = "build_agents"
    PUBLISH_AGENTS = "publish_agents"
    MANAGE_KNOWLEDGE_APPS = "manage_knowledge_apps"
    EXECUTE_AGENT_WORK = "execute_agent_work"
    VIEW_SHARED_OUTPUTS = "view_shared_outputs"
    COLLABORATE = "collaborate"
    ACCESS_ADMIN_SURFACES = "access_admin_surfaces"
    MANAGE_OWNER_LIFECYCLE = "manage_owner_lifecycle"


_VIEWER_PERMISSIONS = frozenset(
    {
        OrganizationPermission.VIEW_ORGANIZATION,
        OrganizationPermission.VIEW_MEMBER_DIRECTORY,
        OrganizationPermission.VIEW_SHARED_OUTPUTS,
    }
)
_MEMBER_PERMISSIONS = _VIEWER_PERMISSIONS | {
    OrganizationPermission.EXECUTE_AGENT_WORK,
    OrganizationPermission.COLLABORATE,
}
_BUILDER_PERMISSIONS = _MEMBER_PERMISSIONS | {
    OrganizationPermission.BUILD_AGENTS,
    OrganizationPermission.PUBLISH_AGENTS,
    OrganizationPermission.MANAGE_KNOWLEDGE_APPS,
}
_ADMIN_PERMISSIONS = _BUILDER_PERMISSIONS | {
    OrganizationPermission.VIEW_MEMBER_LIFECYCLE,
    OrganizationPermission.INVITE_MEMBERS,
    OrganizationPermission.CHANGE_MEMBER_ROLES,
    OrganizationPermission.SUSPEND_MEMBERS,
    OrganizationPermission.REVOKE_MEMBERS,
    OrganizationPermission.RESTORE_MEMBERS,
    OrganizationPermission.MANAGE_ORGANIZATION_SETTINGS,
    OrganizationPermission.ACCESS_ADMIN_SURFACES,
}
_OWNER_PERMISSIONS = _ADMIN_PERMISSIONS | {
    OrganizationPermission.MANAGE_OWNER_LIFECYCLE,
}

ORGANIZATION_ROLE_PERMISSIONS: dict[OrganizationRole, frozenset[OrganizationPermission]] = {
    OrganizationRole.VIEWER: _VIEWER_PERMISSIONS,
    OrganizationRole.MEMBER: _MEMBER_PERMISSIONS,
    OrganizationRole.BUILDER: frozenset(_BUILDER_PERMISSIONS),
    OrganizationRole.ADMIN: frozenset(_ADMIN_PERMISSIONS),
    OrganizationRole.OWNER: frozenset(_OWNER_PERMISSIONS),
}


def organization_permissions(role: OrganizationRole | str) -> frozenset[OrganizationPermission]:
    """Permissions for a role; unknown or unparsable roles get no permissions."""

    if not isinstance(role, OrganizationRole):
        try:
            role = OrganizationRole(str(role))
        except ValueError:
            return frozenset()
    return ORGANIZATION_ROLE_PERMISSIONS.get(role, frozenset())


def strict_organization_role(value: object) -> OrganizationRole:
    """Parse a role value, failing closed on anything unknown."""

    try:
        return OrganizationRole(str(value))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unknown organization role.",
        ) from exc

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


def require_organization_permission(
    principal: Principal,
    permission: OrganizationPermission,
) -> Principal:
    if permission not in organization_permissions(principal.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This action requires the {permission.value} permission.",
        )
    return principal


def require_role_assignable(principal: Principal, role: OrganizationRole) -> None:
    """Granting a role requires holding every consequence of that role.

    Assigning or removing the owner role is an owner-lifecycle action; every
    other role may be granted by anyone permitted to administer members.
    """

    if role is OrganizationRole.OWNER:
        require_organization_permission(principal, OrganizationPermission.MANAGE_OWNER_LIFECYCLE)


def require_target_modifiable(
    principal: Principal,
    target_role: OrganizationRole,
    *,
    target_profile_id: str,
) -> None:
    """Member-lifecycle safety rails shared by role change, suspend, and revoke.

    Acting on an owner is an owner-lifecycle action. Acting on yourself through
    the administrative surface is always rejected so an admin cannot bypass
    organization safeguards (for example, revoking themselves to dodge audit,
    or a lone owner demoting themselves) — session logout and owner transfer
    are the supported paths.
    """

    if target_profile_id == principal.profile_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Administrative member actions cannot target your own membership.",
        )
    if target_role is OrganizationRole.OWNER:
        require_organization_permission(principal, OrganizationPermission.MANAGE_OWNER_LIFECYCLE)


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
