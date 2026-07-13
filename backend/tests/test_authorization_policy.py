from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi import HTTPException

from src.authorization.policy import (
    ORGANIZATION_ROLE_PERMISSIONS,
    OrganizationPermission,
    OrganizationRole,
    Principal,
    ProjectRole,
    ResourcePermission,
    evaluate_project_access,
    organization_permissions,
    require_organization_permission,
    require_organization_role,
    require_role_assignable,
    require_target_modifiable,
    strict_organization_role,
)

ROLE_PERMISSIONS_FIXTURE = (
    Path(__file__).resolve().parents[2] / "fixtures" / "phase2" / "role-permissions.json"
)


def principal(role: OrganizationRole, *, organization_id: str = "org-internal-a") -> Principal:
    return Principal(
        profile_id="profile-a",
        subject="workos-user-a",
        issuer="https://api.workos.com/user_management/client_test",
        organization_id=organization_id,
        workos_organization_id="org_workos_a",
        role=role,
    )


@pytest.mark.parametrize(
    ("role", "minimum", "allowed"),
    [
        (OrganizationRole.OWNER, OrganizationRole.OWNER, True),
        (OrganizationRole.ADMIN, OrganizationRole.ADMIN, True),
        (OrganizationRole.BUILDER, OrganizationRole.BUILDER, True),
        (OrganizationRole.MEMBER, OrganizationRole.MEMBER, True),
        (OrganizationRole.VIEWER, OrganizationRole.MEMBER, False),
        (OrganizationRole.MEMBER, OrganizationRole.BUILDER, False),
        (OrganizationRole.BUILDER, OrganizationRole.ADMIN, False),
        (OrganizationRole.ADMIN, OrganizationRole.OWNER, False),
    ],
)
def test_organization_role_ordering(
    role: OrganizationRole, minimum: OrganizationRole, allowed: bool
) -> None:
    if allowed:
        assert require_organization_role(principal(role), minimum).role is role
    else:
        with pytest.raises(HTTPException) as exc_info:
            require_organization_role(principal(role), minimum)
        assert exc_info.value.status_code == 403


@pytest.mark.parametrize("role", list(OrganizationRole))
def test_cross_organization_project_is_always_denied(role: OrganizationRole) -> None:
    decision = evaluate_project_access(
        principal=principal(role),
        project_organization_id="org-internal-b",
        visibility="organization",
        direct_role=ProjectRole.OWNER,
        grants=frozenset(ResourcePermission),
        required=ResourcePermission.MANAGE,
    )

    assert decision.allowed is False
    assert decision.reason == "cross_organization"
    assert decision.effective_permissions == frozenset()


def test_explicit_project_role_and_grant_are_intersected_after_tenant_check() -> None:
    use_decision = evaluate_project_access(
        principal=principal(OrganizationRole.MEMBER),
        project_organization_id="org-internal-a",
        visibility="private",
        direct_role=ProjectRole.VIEWER,
        grants={ResourcePermission.USE},
        required=ResourcePermission.USE,
    )
    edit_decision = evaluate_project_access(
        principal=principal(OrganizationRole.MEMBER),
        project_organization_id="org-internal-a",
        visibility="private",
        direct_role=ProjectRole.VIEWER,
        grants={ResourcePermission.USE},
        required=ResourcePermission.EDIT,
    )

    assert use_decision.allowed is True
    assert use_decision.effective_permissions == {
        ResourcePermission.VIEW,
        ResourcePermission.USE,
    }
    assert edit_decision.allowed is False
    assert edit_decision.reason == "insufficient_permission"


def test_organization_member_can_do_work_in_organization_visible_project() -> None:
    decision = evaluate_project_access(
        principal=principal(OrganizationRole.MEMBER),
        project_organization_id="org-internal-a",
        visibility="organization",
        direct_role=None,
        grants=frozenset(),
        required=ResourcePermission.EDIT,
    )

    assert decision.allowed is True
    assert ResourcePermission.USE in decision.effective_permissions
    assert ResourcePermission.EDIT in decision.effective_permissions


def test_role_permission_matrix_matches_shared_fixture() -> None:
    fixture = json.loads(ROLE_PERMISSIONS_FIXTURE.read_text(encoding="utf-8"))
    fixture_roles = {
        role: sorted(permissions) for role, permissions in fixture["roles"].items()
    }
    policy_roles = {
        role.value: sorted(permission.value for permission in permissions)
        for role, permissions in ORGANIZATION_ROLE_PERMISSIONS.items()
    }
    assert policy_roles == fixture_roles


def test_role_permissions_are_strictly_cumulative() -> None:
    ordered = [
        OrganizationRole.VIEWER,
        OrganizationRole.MEMBER,
        OrganizationRole.BUILDER,
        OrganizationRole.ADMIN,
        OrganizationRole.OWNER,
    ]
    for lower, higher in zip(ordered, ordered[1:]):
        lower_permissions = ORGANIZATION_ROLE_PERMISSIONS[lower]
        higher_permissions = ORGANIZATION_ROLE_PERMISSIONS[higher]
        assert lower_permissions < higher_permissions


def test_every_permission_is_granted_to_some_role() -> None:
    granted = frozenset().union(*ORGANIZATION_ROLE_PERMISSIONS.values())
    assert granted == frozenset(OrganizationPermission)


@pytest.mark.parametrize(
    ("role", "permission", "allowed"),
    [
        (OrganizationRole.VIEWER, OrganizationPermission.VIEW_MEMBER_DIRECTORY, True),
        (OrganizationRole.VIEWER, OrganizationPermission.EXECUTE_AGENT_WORK, False),
        (OrganizationRole.MEMBER, OrganizationPermission.COLLABORATE, True),
        (OrganizationRole.MEMBER, OrganizationPermission.BUILD_AGENTS, False),
        (OrganizationRole.BUILDER, OrganizationPermission.PUBLISH_AGENTS, True),
        (OrganizationRole.BUILDER, OrganizationPermission.INVITE_MEMBERS, False),
        (OrganizationRole.BUILDER, OrganizationPermission.SUSPEND_MEMBERS, False),
        (OrganizationRole.ADMIN, OrganizationPermission.REVOKE_MEMBERS, True),
        (OrganizationRole.ADMIN, OrganizationPermission.MANAGE_OWNER_LIFECYCLE, False),
        (OrganizationRole.OWNER, OrganizationPermission.MANAGE_OWNER_LIFECYCLE, True),
    ],
)
def test_permission_gate_enforces_matrix(
    role: OrganizationRole, permission: OrganizationPermission, allowed: bool
) -> None:
    if allowed:
        assert require_organization_permission(principal(role), permission).role is role
    else:
        with pytest.raises(HTTPException) as exc_info:
            require_organization_permission(principal(role), permission)
        assert exc_info.value.status_code == 403


def test_unknown_role_receives_no_permissions() -> None:
    assert organization_permissions("superuser") == frozenset()
    assert organization_permissions("") == frozenset()


def test_strict_role_parse_fails_closed() -> None:
    assert strict_organization_role("builder") is OrganizationRole.BUILDER
    for invalid in ("superuser", "", None, 42):
        with pytest.raises(HTTPException) as exc_info:
            strict_organization_role(invalid)
        assert exc_info.value.status_code == 400


def test_owner_role_assignment_requires_owner_lifecycle_permission() -> None:
    require_role_assignable(principal(OrganizationRole.OWNER), OrganizationRole.OWNER)
    require_role_assignable(principal(OrganizationRole.ADMIN), OrganizationRole.ADMIN)
    with pytest.raises(HTTPException) as exc_info:
        require_role_assignable(principal(OrganizationRole.ADMIN), OrganizationRole.OWNER)
    assert exc_info.value.status_code == 403


def test_owner_membership_modification_requires_owner_lifecycle_permission() -> None:
    require_target_modifiable(
        principal(OrganizationRole.OWNER),
        OrganizationRole.OWNER,
        target_profile_id="profile-target",
    )
    require_target_modifiable(
        principal(OrganizationRole.ADMIN),
        OrganizationRole.ADMIN,
        target_profile_id="profile-target",
    )
    with pytest.raises(HTTPException) as exc_info:
        require_target_modifiable(
            principal(OrganizationRole.ADMIN),
            OrganizationRole.OWNER,
            target_profile_id="profile-target",
        )
    assert exc_info.value.status_code == 403


def test_administrative_actions_never_target_self() -> None:
    with pytest.raises(HTTPException) as exc_info:
        require_target_modifiable(
            principal(OrganizationRole.OWNER),
            OrganizationRole.MEMBER,
            target_profile_id="profile-a",
        )
    assert exc_info.value.status_code == 409
