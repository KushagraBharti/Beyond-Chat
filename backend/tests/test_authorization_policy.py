from __future__ import annotations

import pytest
from fastapi import HTTPException

from src.authorization.policy import (
    OrganizationRole,
    Principal,
    ProjectRole,
    ResourcePermission,
    evaluate_project_access,
    require_organization_role,
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
