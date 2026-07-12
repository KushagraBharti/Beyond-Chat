"""Organization membership lifecycle administration (Phase 2).

Role change, suspend, restore, and revoke for organization members. This module
deliberately does not modify ``repository.py`` (owned by another workstream);
it reads and writes the same canonical tables through its own narrow adapter.

Ordering contract: WorkOS is mutated first, then canonical state. Both orders
fail closed for access (``require_principal`` re-reads canonical membership on
every request, and WorkOS refuses to mint sessions for deactivated or deleted
memberships), but provider-first means a canonical write failure is healed by
the membership webhook instead of leaving WorkOS able to resurrect access on
the next login (``sync_authenticated_identity`` upserts state to active).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal, Protocol
from uuid import uuid4

from fastapi import HTTPException, status

from ..authorization.policy import (
    OrganizationPermission,
    OrganizationRole,
    Principal,
    require_organization_permission,
    require_role_assignable,
    require_target_modifiable,
)
from ..supabase_service import supabase_service

LOGGER = logging.getLogger("beyond_chat.identity.membership_admin")

MembershipLifecycleState = Literal["invited", "active", "suspended", "revoked"]
MembershipLifecycleOperation = Literal["change_role", "suspend", "restore", "revoke"]


def _iso(value: datetime | None = None) -> str:
    return (value or datetime.now(UTC)).isoformat()


@dataclass(frozen=True)
class MemberDetail:
    membership_id: str
    profile_id: str
    workos_membership_id: str | None
    subject: str | None
    role: OrganizationRole
    state: str
    display_name: str | None
    email: str | None

    def as_response(self) -> dict[str, Any]:
        return {
            "id": self.membership_id,
            "displayName": self.display_name,
            "email": self.email,
            "role": self.role.value,
            "state": self.state,
        }


@dataclass(frozen=True)
class MembershipLifecycleClaim:
    """Future database-backed claim returned by the atomic lifecycle RPC.

    The current service deliberately does not fabricate this guarantee.  This
    type is the integration boundary for the migration/reconciler specified in
    the Phase 2 evidence document.
    """

    claim_id: str
    organization_id: str
    actor_profile_id: str
    target_membership_id: str
    operation: MembershipLifecycleOperation
    request_digest: str
    state: str
    lease_expires_at: str


class AtomicMembershipLifecycleClaims(Protocol):
    def claim_lifecycle_operation(
        self,
        *,
        organization_id: str,
        actor_profile_id: str,
        target_membership_id: str,
        operation: MembershipLifecycleOperation,
        desired_role: OrganizationRole | None,
        desired_state: MembershipLifecycleState | None,
        idempotency_key: str,
        request_digest: str,
        lease_seconds: int,
    ) -> MembershipLifecycleClaim: ...

    def record_provider_outcome(
        self, *, claim_id: str, provider_operation_id: str | None, succeeded: bool
    ) -> MembershipLifecycleClaim: ...

    def commit_lifecycle_operation(self, *, claim_id: str) -> MemberDetail: ...


class MembershipAdminRepository(Protocol):
    def get_member(self, *, organization_id: str, membership_id: str) -> MemberDetail | None: ...

    def get_actor_membership(
        self, *, organization_id: str, profile_id: str
    ) -> MemberDetail | None: ...

    def count_active_owners(self, *, organization_id: str) -> int: ...

    def update_member(
        self,
        *,
        organization_id: str,
        membership_id: str,
        role: OrganizationRole | None = None,
        state: MembershipLifecycleState | None = None,
        workos_membership_id: str | None = None,
    ) -> MemberDetail: ...

    def record_audit(
        self,
        *,
        organization_id: str,
        actor_profile_id: str,
        action: str,
        resource_id: str,
        metadata: dict[str, Any],
    ) -> None: ...


class WorkOSMembershipProvider(Protocol):
    """The membership-mutation slice of the WorkOS provider."""

    def find_membership(self, *, user_id: str, organization_id: str) -> dict[str, Any] | None: ...

    def update_membership_role(self, membership_id: str, role: str) -> dict[str, Any]: ...

    def deactivate_membership(self, membership_id: str) -> dict[str, Any]: ...

    def reactivate_membership(self, membership_id: str) -> dict[str, Any]: ...

    def delete_membership(self, membership_id: str) -> None: ...


class SupabaseMembershipAdminRepository:
    """Service-role adapter over the canonical membership tables."""

    def _client(self):
        client = supabase_service.client()
        if client is None:
            raise RuntimeError(
                "Membership administration requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
            )
        return client

    @staticmethod
    def _row_detail(row: dict[str, Any], subject: str | None) -> MemberDetail:
        profile = row.get("profiles") if isinstance(row.get("profiles"), dict) else {}
        try:
            role = OrganizationRole(str(row.get("role")))
        except ValueError:
            # An unknown persisted role must never widen into a valid one.
            role = OrganizationRole.VIEWER
        return MemberDetail(
            membership_id=str(row["id"]),
            profile_id=str(row["profile_id"]),
            workos_membership_id=row.get("workos_membership_id"),
            subject=subject,
            role=role,
            state=str(row.get("state") or ""),
            display_name=profile.get("display_name"),
            email=profile.get("primary_email"),
        )

    def get_member(self, *, organization_id: str, membership_id: str) -> MemberDetail | None:
        client = self._client()
        rows = (
            client.table("organization_memberships")
            .select(
                "id,profile_id,workos_membership_id,role,state,"
                "profiles!inner(display_name,primary_email)"
            )
            .eq("organization_id", organization_id)
            .eq("id", membership_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        if not rows:
            return None
        row = rows[0]
        identities = (
            client.table("external_identities")
            .select("subject")
            .eq("provider", "workos")
            .eq("profile_id", row["profile_id"])
            .limit(1)
            .execute()
            .data
            or []
        )
        subject = str(identities[0]["subject"]) if identities else None
        return self._row_detail(row, subject)

    def get_actor_membership(
        self, *, organization_id: str, profile_id: str
    ) -> MemberDetail | None:
        rows = (
            self._client()
            .table("organization_memberships")
            .select(
                "id,profile_id,workos_membership_id,role,state,"
                "profiles!inner(display_name,primary_email)"
            )
            .eq("organization_id", organization_id)
            .eq("profile_id", profile_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        if not rows:
            return None
        row = rows[0]
        identities = (
            self._client()
            .table("external_identities")
            .select("subject")
            .eq("provider", "workos")
            .eq("profile_id", profile_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        subject = str(identities[0]["subject"]) if identities else None
        return self._row_detail(row, subject)

    def count_active_owners(self, *, organization_id: str) -> int:
        rows = (
            self._client()
            .table("organization_memberships")
            .select("id")
            .eq("organization_id", organization_id)
            .eq("role", OrganizationRole.OWNER.value)
            .eq("state", "active")
            .execute()
            .data
            or []
        )
        return len(rows)

    def update_member(
        self,
        *,
        organization_id: str,
        membership_id: str,
        role: OrganizationRole | None = None,
        state: MembershipLifecycleState | None = None,
        workos_membership_id: str | None = None,
    ) -> MemberDetail:
        payload: dict[str, Any] = {"updated_at": _iso()}
        if role is not None:
            payload["role"] = role.value
        if state is not None:
            payload["state"] = state
            payload["revoked_at"] = _iso() if state == "revoked" else None
        if workos_membership_id is not None:
            payload["workos_membership_id"] = workos_membership_id
        (
            self._client()
            .table("organization_memberships")
            .update(payload)
            .eq("organization_id", organization_id)
            .eq("id", membership_id)
            .execute()
        )
        updated = self.get_member(organization_id=organization_id, membership_id=membership_id)
        if updated is None:
            raise RuntimeError("Membership update completed but the row could not be re-read.")
        return updated

    def record_audit(
        self,
        *,
        organization_id: str,
        actor_profile_id: str,
        action: str,
        resource_id: str,
        metadata: dict[str, Any],
    ) -> None:
        try:
            self._client().table("audit_events").insert(
                {
                    "organization_id": organization_id,
                    "actor_profile_id": actor_profile_id,
                    "action": action,
                    "resource_type": "organization_membership",
                    "resource_id": resource_id,
                    "metadata": metadata,
                }
            ).execute()
        except Exception:
            # Auditing is best-effort by contract: the lifecycle change itself
            # already succeeded in both planes and must not be rolled back or
            # reported as failed because the audit insert was unavailable.
            LOGGER.exception("Membership audit event could not be recorded.")


class InMemoryMembershipAdminRepository:
    """Adapter over ``InMemoryIdentityRepository`` state for contract tests."""

    def __init__(self, identity_repository: Any) -> None:
        self._identity = identity_repository
        self.audit_events: list[dict[str, Any]] = []

    def _find(self, organization_id: str, membership_id: str) -> dict[str, Any] | None:
        for membership in self._identity.memberships.values():
            if (
                str(membership.get("id")) == membership_id
                and str(membership.get("organization_id")) == organization_id
            ):
                return membership
        return None

    def _detail(self, membership: dict[str, Any]) -> MemberDetail:
        profile = self._identity.profiles.get(membership["profile_id"], {})
        subject = next(
            (
                key[1]
                for key, identity in self._identity.identities.items()
                if identity.get("profile_id") == membership["profile_id"]
            ),
            None,
        )
        try:
            role = OrganizationRole(str(membership.get("role")))
        except ValueError:
            role = OrganizationRole.VIEWER
        return MemberDetail(
            membership_id=str(membership["id"]),
            profile_id=str(membership["profile_id"]),
            workos_membership_id=membership.get("workos_membership_id"),
            subject=subject,
            role=role,
            state=str(membership.get("state") or ""),
            display_name=profile.get("display_name"),
            email=profile.get("primary_email"),
        )

    def get_member(self, *, organization_id: str, membership_id: str) -> MemberDetail | None:
        membership = self._find(organization_id, membership_id)
        return self._detail(membership) if membership else None

    def get_actor_membership(
        self, *, organization_id: str, profile_id: str
    ) -> MemberDetail | None:
        membership = next(
            (
                row
                for row in self._identity.memberships.values()
                if str(row.get("organization_id")) == organization_id
                and str(row.get("profile_id")) == profile_id
            ),
            None,
        )
        return self._detail(membership) if membership else None

    def count_active_owners(self, *, organization_id: str) -> int:
        return sum(
            1
            for membership in self._identity.memberships.values()
            if str(membership.get("organization_id")) == organization_id
            and membership.get("role") == OrganizationRole.OWNER.value
            and membership.get("state") == "active"
        )

    def update_member(
        self,
        *,
        organization_id: str,
        membership_id: str,
        role: OrganizationRole | None = None,
        state: MembershipLifecycleState | None = None,
        workos_membership_id: str | None = None,
    ) -> MemberDetail:
        membership = self._find(organization_id, membership_id)
        if membership is None:
            raise RuntimeError("Membership update completed but the row could not be re-read.")
        membership["updated_at"] = _iso()
        if role is not None:
            membership["role"] = role.value
        if state is not None:
            membership["state"] = state
            membership["revoked_at"] = _iso() if state == "revoked" else None
        if workos_membership_id is not None:
            membership["workos_membership_id"] = workos_membership_id
        return self._detail(membership)

    def record_audit(
        self,
        *,
        organization_id: str,
        actor_profile_id: str,
        action: str,
        resource_id: str,
        metadata: dict[str, Any],
    ) -> None:
        self.audit_events.append(
            {
                "id": str(uuid4()),
                "organization_id": organization_id,
                "actor_profile_id": actor_profile_id,
                "action": action,
                "resource_type": "organization_membership",
                "resource_id": resource_id,
                "metadata": metadata,
                "occurred_at": _iso(),
            }
        )


class MembershipAdminService:
    """Fail-closed orchestration of member lifecycle actions.

    Same-state operations succeed idempotently; every other invalid transition
    returns a stable 409. Cross-organization member identifiers return 404
    because the lookup itself is organization-scoped, so existence in another
    tenant is not distinguishable from non-existence.
    """

    def __init__(
        self,
        repository: MembershipAdminRepository,
        provider: WorkOSMembershipProvider,
    ) -> None:
        self._repository = repository
        self._provider = provider

    def _member_or_404(self, principal: Principal, membership_id: str) -> MemberDetail:
        member = self._repository.get_member(
            organization_id=principal.organization_id, membership_id=membership_id
        )
        if member is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found.")
        return member

    def _fresh_actor(
        self, principal: Principal, permission: OrganizationPermission
    ) -> Principal:
        actor = self._repository.get_actor_membership(
            organization_id=principal.organization_id,
            profile_id=principal.profile_id,
        )
        if actor is None or actor.state != "active":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Organization access is no longer active.")
        fresh = Principal(
            profile_id=principal.profile_id,
            subject=principal.subject,
            issuer=principal.issuer,
            organization_id=principal.organization_id,
            workos_organization_id=principal.workos_organization_id,
            role=actor.role,
            email=principal.email,
            session_id=principal.session_id,
            token_permissions=principal.token_permissions,
        )
        require_organization_permission(fresh, permission)
        return fresh

    def _workos_membership_id(self, principal: Principal, member: MemberDetail) -> str:
        if member.workos_membership_id:
            return member.workos_membership_id
        if member.subject:
            found = self._provider.find_membership(
                user_id=member.subject,
                organization_id=principal.workos_organization_id,
            )
            identifier = str((found or {}).get("id") or "")
            if identifier:
                return identifier
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "The membership is not linked to the identity provider.",
        )

    def _require_not_last_owner(self, principal: Principal, member: MemberDetail) -> None:
        if member.role is not OrganizationRole.OWNER or member.state != "active":
            return
        if self._repository.count_active_owners(organization_id=principal.organization_id) <= 1:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "An organization must keep at least one active owner.",
            )

    def _provider_call(self, description: str, call, *args: Any, **kwargs: Any) -> Any:
        try:
            return call(*args, **kwargs)
        except HTTPException:
            raise
        except Exception as exc:
            # Canonical state is untouched at this point, so the member's
            # access is unchanged and the operation can simply be retried.
            LOGGER.exception("WorkOS membership operation failed: %s", description)
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "The identity provider rejected the membership change.",
            ) from exc

    def change_role(
        self, principal: Principal, membership_id: str, new_role: OrganizationRole
    ) -> MemberDetail:
        principal = self._fresh_actor(principal, OrganizationPermission.CHANGE_MEMBER_ROLES)
        member = self._member_or_404(principal, membership_id)
        require_target_modifiable(principal, member.role, target_profile_id=member.profile_id)
        require_role_assignable(principal, new_role)
        if member.state != "active":
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Only active memberships can change roles."
            )
        if member.role is new_role:
            return member
        if member.role is OrganizationRole.OWNER:
            self._require_not_last_owner(principal, member)
        workos_id = self._workos_membership_id(principal, member)
        principal = self._fresh_actor(principal, OrganizationPermission.CHANGE_MEMBER_ROLES)
        require_target_modifiable(principal, member.role, target_profile_id=member.profile_id)
        require_role_assignable(principal, new_role)
        if member.role is OrganizationRole.OWNER:
            self._require_not_last_owner(principal, member)
        self._provider_call(
            "update role", self._provider.update_membership_role, workos_id, new_role.value
        )
        updated = self._repository.update_member(
            organization_id=principal.organization_id,
            membership_id=membership_id,
            role=new_role,
            workos_membership_id=workos_id,
        )
        self._audit(principal, member, "membership.role_changed", {"from": member.role.value, "to": new_role.value})
        return updated

    def suspend(self, principal: Principal, membership_id: str) -> MemberDetail:
        principal = self._fresh_actor(principal, OrganizationPermission.SUSPEND_MEMBERS)
        member = self._member_or_404(principal, membership_id)
        require_target_modifiable(principal, member.role, target_profile_id=member.profile_id)
        if member.state == "suspended":
            return member
        if member.state != "active":
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Only active memberships can be suspended."
            )
        self._require_not_last_owner(principal, member)
        workos_id = self._workos_membership_id(principal, member)
        principal = self._fresh_actor(principal, OrganizationPermission.SUSPEND_MEMBERS)
        require_target_modifiable(principal, member.role, target_profile_id=member.profile_id)
        self._require_not_last_owner(principal, member)
        self._provider_call("deactivate", self._provider.deactivate_membership, workos_id)
        updated = self._repository.update_member(
            organization_id=principal.organization_id,
            membership_id=membership_id,
            state="suspended",
            workos_membership_id=workos_id,
        )
        self._audit(principal, member, "membership.suspended", {})
        return updated

    def restore(self, principal: Principal, membership_id: str) -> MemberDetail:
        principal = self._fresh_actor(principal, OrganizationPermission.RESTORE_MEMBERS)
        member = self._member_or_404(principal, membership_id)
        require_target_modifiable(principal, member.role, target_profile_id=member.profile_id)
        if member.state == "active":
            return member
        if member.state != "suspended":
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Only suspended memberships can be restored; revoked members must be re-invited.",
            )
        workos_id = self._workos_membership_id(principal, member)
        principal = self._fresh_actor(principal, OrganizationPermission.RESTORE_MEMBERS)
        require_target_modifiable(principal, member.role, target_profile_id=member.profile_id)
        self._provider_call("reactivate", self._provider.reactivate_membership, workos_id)
        updated = self._repository.update_member(
            organization_id=principal.organization_id,
            membership_id=membership_id,
            state="active",
            workos_membership_id=workos_id,
        )
        self._audit(principal, member, "membership.restored", {})
        return updated

    def revoke(self, principal: Principal, membership_id: str) -> MemberDetail:
        principal = self._fresh_actor(principal, OrganizationPermission.REVOKE_MEMBERS)
        member = self._member_or_404(principal, membership_id)
        require_target_modifiable(principal, member.role, target_profile_id=member.profile_id)
        if member.state == "revoked":
            return member
        self._require_not_last_owner(principal, member)
        workos_id = self._workos_membership_id(principal, member)
        principal = self._fresh_actor(principal, OrganizationPermission.REVOKE_MEMBERS)
        require_target_modifiable(principal, member.role, target_profile_id=member.profile_id)
        self._require_not_last_owner(principal, member)
        self._provider_call("delete", self._provider.delete_membership, workos_id)
        updated = self._repository.update_member(
            organization_id=principal.organization_id,
            membership_id=membership_id,
            state="revoked",
            workos_membership_id=workos_id,
        )
        self._audit(principal, member, "membership.revoked", {"previous_state": member.state})
        return updated

    def _audit(
        self,
        principal: Principal,
        member: MemberDetail,
        action: str,
        metadata: dict[str, Any],
    ) -> None:
        self._repository.record_audit(
            organization_id=principal.organization_id,
            actor_profile_id=principal.profile_id,
            action=action,
            resource_id=member.membership_id,
            metadata={"target_profile_id": member.profile_id, **metadata},
        )
