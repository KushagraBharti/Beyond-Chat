"""Service-level invariants for membership administration.

The API route layer already prevents self-targeting and non-owner actors, so
the last-owner guard can only fire when canonical state changes between the
principal's authentication and the lifecycle mutation (for example a
concurrent demotion). These tests drive the service directly with a stale
principal to prove the race fails closed.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from typing import Any

import pytest
from fastapi import HTTPException

from src.authorization.policy import OrganizationRole, Principal
from src.identity.membership_admin import (
    InMemoryMembershipAdminRepository,
    MembershipAdminService,
)
from src.identity.repository import InMemoryIdentityRepository


class FakeMembershipProvider:
    def __init__(self) -> None:
        self.actions: list[tuple[str, str]] = []

    def find_membership(self, *, user_id: str, organization_id: str) -> dict[str, Any] | None:
        return None

    def update_membership_role(self, membership_id: str, role: str) -> dict[str, Any]:
        self.actions.append((f"update_role:{role}", membership_id))
        return {"id": membership_id}

    def deactivate_membership(self, membership_id: str) -> dict[str, Any]:
        self.actions.append(("deactivate", membership_id))
        return {"id": membership_id}

    def reactivate_membership(self, membership_id: str) -> dict[str, Any]:
        self.actions.append(("reactivate", membership_id))
        return {"id": membership_id}

    def delete_membership(self, membership_id: str) -> None:
        self.actions.append(("delete", membership_id))


def _sync(repository: InMemoryIdentityRepository, subject: str, role: OrganizationRole):
    return repository.sync_authenticated_identity(
        issuer="https://api.workos.com/",
        subject=subject,
        email=f"{subject}@example.com",
        email_verified=True,
        display_name=subject,
        avatar_url=None,
        locale=None,
        workos_organization_id="org_main",
        organization_name="Main Organization",
        organization_slug="main-organization",
        workos_membership_id=f"membership_{subject}",
        role=role,
    )


@pytest.fixture
def stack():
    repository = InMemoryIdentityRepository()
    actor = _sync(repository, "user_actor", OrganizationRole.OWNER)
    target = _sync(repository, "user_target", OrganizationRole.OWNER)
    provider = FakeMembershipProvider()
    admin = InMemoryMembershipAdminRepository(repository)
    service = MembershipAdminService(admin, provider)
    principal = Principal(
        profile_id=actor.profile_id,
        subject=actor.subject,
        issuer=actor.issuer,
        organization_id=actor.organization_id,
        workos_organization_id=actor.workos_organization_id,
        role=OrganizationRole.OWNER,
    )
    target_membership_id = str(
        repository.memberships[(actor.organization_id, target.profile_id)]["id"]
    )
    return repository, provider, service, principal, actor, target, target_membership_id


def test_owner_can_manage_second_owner_while_two_owners_remain(stack) -> None:
    _repository, provider, service, principal, _actor, _target, target_id = stack

    demoted = service.change_role(principal, target_id, OrganizationRole.ADMIN)

    assert demoted.role is OrganizationRole.ADMIN
    assert provider.actions == [("update_role:admin", "membership_user_target")]


def test_concurrent_actor_demotion_cannot_remove_the_last_active_owner(stack) -> None:
    repository, provider, service, principal, actor, _target, target_id = stack
    # The actor's canonical membership was demoted after their request was
    # authenticated; the stale principal still claims the owner role. The
    # target is now the only active owner and must be protected.
    repository.memberships[(actor.organization_id, actor.profile_id)]["role"] = "admin"

    for operation in (
        lambda: service.revoke(principal, target_id),
        lambda: service.suspend(principal, target_id),
        lambda: service.change_role(principal, target_id, OrganizationRole.MEMBER),
    ):
        with pytest.raises(HTTPException) as exc_info:
            operation()
        assert exc_info.value.status_code == 403
        assert "manage_owner_lifecycle" in exc_info.value.detail

    assert provider.actions == []
    membership = repository.memberships[(actor.organization_id, _target.profile_id)]
    assert membership["state"] == "active"
    assert membership["role"] == "owner"


def test_suspending_one_of_two_owners_is_allowed_but_not_the_survivor(stack) -> None:
    repository, _provider, service, principal, actor, target, target_id = stack

    suspended = service.suspend(principal, target_id)
    assert suspended.state == "suspended"

    # With the target suspended the actor is the sole active owner; a stale
    # second session acting for the (now suspended) target must not be able to
    # take down the survivor.
    stale_target_principal = Principal(
        profile_id=target.profile_id,
        subject=target.subject,
        issuer=target.issuer,
        organization_id=target.organization_id,
        workos_organization_id=target.workos_organization_id,
        role=OrganizationRole.OWNER,
    )
    actor_membership_id = str(
        repository.memberships[(actor.organization_id, actor.profile_id)]["id"]
    )
    with pytest.raises(HTTPException) as exc_info:
        stale_target_principal and service.revoke(stale_target_principal, actor_membership_id)
    assert exc_info.value.status_code == 403
    assert "no longer active" in exc_info.value.detail


@pytest.mark.parametrize(
    ("actor_role", "actor_state"),
    [
        ("member", "active"),
        ("viewer", "active"),
        ("owner", "suspended"),
        ("owner", "revoked"),
    ],
)
def test_stale_actor_is_reread_before_provider_mutation(
    stack, actor_role: str, actor_state: str
) -> None:
    repository, provider, service, principal, actor, _target, _target_id = stack
    member = _sync(repository, "user_ordinary_target", OrganizationRole.MEMBER)
    target_id = str(repository.memberships[(actor.organization_id, member.profile_id)]["id"])
    actor_row = repository.memberships[(actor.organization_id, actor.profile_id)]
    actor_row.update({"role": actor_role, "state": actor_state})

    with pytest.raises(HTTPException) as exc_info:
        service.suspend(principal, target_id)
    assert exc_info.value.status_code == 403
    assert provider.actions == []


def test_removed_actor_is_reread_before_provider_mutation(stack) -> None:
    repository, provider, service, principal, actor, _target, _target_id = stack
    member = _sync(repository, "user_removed_target", OrganizationRole.MEMBER)
    target_id = str(repository.memberships[(actor.organization_id, member.profile_id)]["id"])
    del repository.memberships[(actor.organization_id, actor.profile_id)]

    with pytest.raises(HTTPException) as exc_info:
        service.revoke(principal, target_id)
    assert exc_info.value.status_code == 403
    assert provider.actions == []


def test_actor_is_reread_again_immediately_before_provider_side_effect(stack) -> None:
    repository, provider, service, principal, actor, _target, _target_id = stack
    member = _sync(repository, "user_resolution_target", OrganizationRole.MEMBER)
    target_id = str(repository.memberships[(actor.organization_id, member.profile_id)]["id"])
    admin_repository = service._repository  # noqa: SLF001 - adversarial orchestration test
    original = admin_repository.get_actor_membership
    reads = 0

    def race(*, organization_id: str, profile_id: str):  # type: ignore[no-untyped-def]
        nonlocal reads
        reads += 1
        if reads == 2:
            repository.memberships[(organization_id, profile_id)]["state"] = "suspended"
        return original(organization_id=organization_id, profile_id=profile_id)

    admin_repository.get_actor_membership = race  # type: ignore[method-assign]
    with pytest.raises(HTTPException) as exc_info:
        service.suspend(principal, target_id)
    assert exc_info.value.status_code == 403
    assert reads == 2
    assert provider.actions == []


def test_non_atomic_last_owner_guard_contract_exposes_distributed_race() -> None:
    identity = InMemoryIdentityRepository()
    first = _sync(identity, "user_owner_first", OrganizationRole.OWNER)
    second = _sync(identity, "user_owner_second", OrganizationRole.OWNER)
    barrier = Barrier(2)

    class RacingRepository(InMemoryMembershipAdminRepository):
        def count_active_owners(self, *, organization_id: str) -> int:
            count = super().count_active_owners(organization_id=organization_id)
            barrier.wait(timeout=2)
            return count

    repository = RacingRepository(identity)
    provider = FakeMembershipProvider()
    service = MembershipAdminService(repository, provider)

    def principal(snapshot):  # type: ignore[no-untyped-def]
        return Principal(
            profile_id=snapshot.profile_id,
            subject=snapshot.subject,
            issuer=snapshot.issuer,
            organization_id=snapshot.organization_id,
            workos_organization_id=snapshot.workos_organization_id,
            role=OrganizationRole.OWNER,
        )

    first_id = str(identity.memberships[(first.organization_id, first.profile_id)]["id"])
    second_id = str(identity.memberships[(second.organization_id, second.profile_id)]["id"])
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(
            executor.map(
                lambda operation: operation(),
                (
                    lambda: service.revoke(principal(first), second_id),
                    lambda: service.revoke(principal(second), first_id),
                ),
            )
        )
    assert [result.state for result in results] == ["revoked", "revoked"]
    assert sum(
        row["state"] == "active" and row["role"] == "owner"
        for row in identity.memberships.values()
    ) == 0
