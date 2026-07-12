from __future__ import annotations

import logging
import re
from base64 import urlsafe_b64decode, urlsafe_b64encode
from copy import deepcopy
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol
from uuid import UUID, uuid4

from ..authorization.policy import OrganizationRole, ProjectRole, ResourcePermission
from ..supabase_service import supabase_service

LOGGER = logging.getLogger("beyond_chat.identity.repository")

_ALLOWED_ORGANIZATION_ROLES = {role.value for role in OrganizationRole}
_ALLOWED_PROJECT_ROLES = {role.value for role in ProjectRole}
_ALLOWED_PERMISSIONS = {permission.value for permission in ResourcePermission}
_ALLOWED_MEMBERSHIP_STATES = frozenset({"invited", "active", "suspended", "revoked"})
_ALLOWED_INVITATION_STATES = frozenset({"pending", "accepted", "revoked", "expired"})


def _now() -> datetime:
    return datetime.now(UTC)


def _iso(value: datetime | None = None) -> str:
    return (value or _now()).isoformat().replace("+00:00", "Z")


def _parse_timestamp(value: object) -> datetime:
    if not isinstance(value, str) or not value:
        return datetime.min.replace(tzinfo=UTC)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.min.replace(tzinfo=UTC)


def normalize_email(value: str) -> str:
    normalized = value.strip().lower()
    if not (3 <= len(normalized) <= 320) or "@" not in normalized:
        raise ValueError("A valid email address is required.")
    return normalized


def normalize_role(value: object, *, default: str = "viewer") -> OrganizationRole:
    """Map provider role data to the least-privileged canonical role.

    Provider/webhook payloads are an authentication input, not an
    authorization policy.  A new or malformed custom-role slug must therefore
    never widen into ``member`` merely because the SDK changed shape.
    Administrative request models use the stricter enum validator instead.
    """

    candidate = str(value or default).strip().lower()
    if candidate not in _ALLOWED_ORGANIZATION_ROLES:
        LOGGER.warning("Unknown provider organization role mapped to viewer.")
        return OrganizationRole.VIEWER
    return OrganizationRole(candidate)


def _membership_state_from_event(
    *, event_type: str, provider_status: object, current_state: object
) -> str:
    """Return the fail-closed canonical membership state for a WorkOS event."""

    current = str(current_state or "")
    if event_type == "organization_membership.deleted":
        return "revoked"
    if provider_status == "inactive":
        return "revoked" if current == "revoked" else "suspended"
    if provider_status == "active":
        # Reactivation is an explicit, authorized application operation.  A
        # generic provider update (often only a role edit) cannot resurrect a
        # locally suspended or revoked membership.
        return current if current in {"suspended", "revoked"} else "active"
    # Unknown provider statuses cannot grant access.
    return current if current in {"suspended", "revoked"} else "suspended"


def _invitation_state_from_event(event_type: str, data_state: object, current_state: object) -> str:
    current = str(current_state or "")
    action = event_type.rsplit(".", 1)[-1]
    if action == "resent":
        return current if current in {"accepted", "revoked", "expired"} else "pending"
    candidate = str(data_state or action)
    if candidate not in _ALLOWED_INVITATION_STATES:
        raise ValueError("Invitation webhook state is invalid.")
    if current in {"accepted", "revoked"} and candidate == "pending":
        return current
    return candidate


def slugify(value: str, *, fallback: str) -> str:
    candidate = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    if len(candidate) < 3:
        candidate = re.sub(r"[^a-z0-9]+", "-", fallback.lower()).strip("-")
    candidate = candidate[:63].strip("-")
    if len(candidate) < 3:
        candidate = f"org-{uuid4().hex[:12]}"
    return candidate


def _encode_cursor(kind: str, row_id: str) -> str:
    payload = f"v1:{kind}:{row_id}".encode("ascii")
    return urlsafe_b64encode(payload).decode("ascii").rstrip("=")


def _decode_cursor(cursor: str | None, kind: str) -> str | None:
    if cursor is None:
        return None
    try:
        payload = urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4)).decode("ascii")
        version, cursor_kind, row_id = payload.split(":", 2)
        UUID(row_id)
    except (UnicodeError, ValueError) as exc:
        raise ValueError("The pagination cursor is invalid.") from exc
    if version != "v1" or cursor_kind != kind:
        raise ValueError("The pagination cursor is invalid.")
    return row_id


@dataclass(frozen=True)
class IdentitySnapshot:
    profile_id: str
    issuer: str
    subject: str
    email: str | None
    organization_id: str
    workos_organization_id: str
    organization_name: str
    role: OrganizationRole
    membership_state: str


@dataclass(frozen=True)
class ProjectAccessSnapshot:
    project_id: str
    organization_id: str
    visibility: str
    direct_role: ProjectRole | None
    grants: frozenset[ResourcePermission]


@dataclass(frozen=True)
class WebhookReceipt:
    event_id: str
    inserted: bool
    state: str


@dataclass(frozen=True)
class PageResult:
    items: list[dict[str, Any]]
    next_cursor: str | None


@dataclass(frozen=True)
class BulkInvitationOperationClaim:
    """Future durable claim; unavailable until its canonical migration/RPC lands."""

    operation_id: str
    organization_id: str
    actor_profile_id: str
    idempotency_key: str
    request_digest: str
    state: str
    lease_expires_at: str


class AtomicBulkInvitationOperations(Protocol):
    def claim_bulk_invitation_operation(
        self,
        *,
        organization_id: str,
        actor_profile_id: str,
        idempotency_key: str,
        request_digest: str,
        normalized_entries: list[dict[str, str]],
        lease_seconds: int,
    ) -> BulkInvitationOperationClaim: ...

    def claim_next_bulk_invitation_entry(
        self, *, operation_id: str, lease_owner: str, lease_seconds: int
    ) -> dict[str, Any] | None: ...

    def record_bulk_invitation_entry_outcome(
        self,
        *,
        operation_id: str,
        entry_id: str,
        provider_invitation_id: str | None,
        error_code: str | None,
    ) -> None: ...

    def finalize_bulk_invitation_operation(
        self, *, operation_id: str
    ) -> dict[str, Any]: ...


class IdentityRepository(Protocol):
    def sync_authenticated_identity(
        self,
        *,
        issuer: str,
        subject: str,
        email: str | None,
        email_verified: bool,
        display_name: str | None,
        avatar_url: str | None,
        locale: str | None,
        workos_organization_id: str,
        organization_name: str | None,
        organization_slug: str | None,
        workos_membership_id: str | None,
        role: OrganizationRole,
    ) -> IdentitySnapshot: ...

    def resolve_active_identity(
        self, *, issuer: str, subject: str, workos_organization_id: str
    ) -> IdentitySnapshot | None: ...

    def list_organizations(self, profile_id: str) -> list[dict[str, Any]]: ...

    def list_members(
        self,
        *,
        principal: IdentitySnapshot,
        states: frozenset[str],
        cursor: str | None,
        limit: int,
    ) -> PageResult: ...

    def list_invitations(
        self,
        *,
        principal: IdentitySnapshot,
        states: frozenset[str],
        cursor: str | None,
        limit: int,
    ) -> PageResult: ...

    def create_project(
        self,
        *,
        principal: IdentitySnapshot,
        name: str,
        slug: str,
        description: str | None,
        visibility: str,
    ) -> dict[str, Any]: ...

    def get_project_access(
        self, *, principal: IdentitySnapshot, project_id: str
    ) -> ProjectAccessSnapshot | None: ...

    def save_invitation(
        self,
        *,
        principal: IdentitySnapshot,
        invitation: dict[str, Any],
        email: str,
        role: OrganizationRole,
    ) -> dict[str, Any]: ...

    def save_bulk_invite(
        self,
        *,
        principal: IdentitySnapshot,
        idempotency_key: str,
        entries: list[dict[str, Any]],
    ) -> dict[str, Any]: ...

    def get_bulk_invite(
        self, *, principal: IdentitySnapshot, idempotency_key: str
    ) -> dict[str, Any] | None: ...

    def get_invitation(
        self, *, principal: IdentitySnapshot, invitation_id: str
    ) -> dict[str, Any] | None: ...

    def receive_webhook(self, event: dict[str, Any]) -> WebhookReceipt: ...

    def process_webhook(self, event_id: str) -> None: ...


class InMemoryIdentityRepository:
    """Deterministic repository used by security and route contract tests."""

    def __init__(self) -> None:
        self.profiles: dict[str, dict[str, Any]] = {}
        self.identities: dict[tuple[str, str], dict[str, Any]] = {}
        self.organizations: dict[str, dict[str, Any]] = {}
        self.memberships: dict[tuple[str, str], dict[str, Any]] = {}
        self.projects: dict[str, dict[str, Any]] = {}
        self.project_memberships: dict[tuple[str, str], dict[str, Any]] = {}
        self.grants: list[dict[str, Any]] = []
        self.invitations: dict[str, dict[str, Any]] = {}
        self.bulk_invites: dict[tuple[str, str], dict[str, Any]] = {}
        self.webhooks: dict[str, dict[str, Any]] = {}
        self.object_versions: dict[tuple[str, str], datetime] = {}

    def sync_authenticated_identity(
        self,
        *,
        issuer: str,
        subject: str,
        email: str | None,
        email_verified: bool,
        display_name: str | None,
        avatar_url: str | None,
        locale: str | None,
        workos_organization_id: str,
        organization_name: str | None,
        organization_slug: str | None,
        workos_membership_id: str | None,
        role: OrganizationRole,
    ) -> IdentitySnapshot:
        identity_key = (issuer.rstrip("/"), subject)
        identity = self.identities.get(identity_key)
        normalized_email = normalize_email(email) if email else None
        if identity is None:
            profile_id = str(uuid4())
            self.profiles[profile_id] = {
                "id": profile_id,
                "display_name": display_name,
                "primary_email": normalized_email if email_verified else None,
                "avatar_url": avatar_url,
                "locale": locale,
                "state": "active",
                "updated_at": _iso(),
            }
            identity = {
                "profile_id": profile_id,
                "issuer": identity_key[0],
                "subject": subject,
                "email": normalized_email,
                "email_verified": bool(email_verified),
            }
            self.identities[identity_key] = identity
        else:
            profile_id = identity["profile_id"]
            profile = self.profiles[profile_id]
            profile.update(
                {
                    "display_name": display_name or profile.get("display_name"),
                    "primary_email": normalized_email if email_verified else profile.get("primary_email"),
                    "avatar_url": avatar_url or profile.get("avatar_url"),
                    "locale": locale or profile.get("locale"),
                    "updated_at": _iso(),
                }
            )
            identity.update({"email": normalized_email, "email_verified": bool(email_verified)})

        organization = self.organizations.get(workos_organization_id)
        if organization is None:
            organization_id = str(uuid4())
            organization = {
                "id": organization_id,
                "workos_organization_id": workos_organization_id,
                "name": organization_name or "Beyond Organization",
                "slug": slugify(
                    organization_slug or organization_name or workos_organization_id,
                    fallback=workos_organization_id,
                ),
                "state": "active",
                "updated_at": _iso(),
            }
            self.organizations[workos_organization_id] = organization
        elif organization_name:
            organization.update(
                {
                    "name": organization_name,
                    "slug": slugify(
                        organization_slug or organization_name,
                        fallback=workos_organization_id,
                    ),
                    "state": "active",
                    "updated_at": _iso(),
                }
            )

        existing_membership = self.memberships.get((organization["id"], profile_id))
        existing_state = str((existing_membership or {}).get("state") or "")
        membership_state = (
            existing_state if existing_state in {"suspended", "revoked"} else "active"
        )
        membership = {
            "id": existing_membership["id"] if existing_membership else str(uuid4()),
            "organization_id": organization["id"],
            "profile_id": profile_id,
            "workos_membership_id": workos_membership_id,
            "role": role.value,
            "state": membership_state,
            "joined_at": existing_membership.get("joined_at") if existing_membership else _iso(),
            "created_at": existing_membership.get("created_at") if existing_membership else _iso(),
            "revoked_at": (existing_membership or {}).get("revoked_at")
            if membership_state == "revoked"
            else None,
            "updated_at": _iso(),
        }
        self.memberships[(organization["id"], profile_id)] = membership
        resolved = self.resolve_active_identity(
            issuer=issuer,
            subject=subject,
            workos_organization_id=workos_organization_id,
        )
        if resolved is None:
            raise PermissionError("Canonical organization membership is inactive.")
        return resolved

    def resolve_active_identity(
        self, *, issuer: str, subject: str, workos_organization_id: str
    ) -> IdentitySnapshot | None:
        identity = self.identities.get((issuer.rstrip("/"), subject))
        organization = self.organizations.get(workos_organization_id)
        if not identity or not organization:
            return None
        profile = self.profiles.get(identity["profile_id"])
        membership = self.memberships.get((organization["id"], identity["profile_id"]))
        if (
            not profile
            or not membership
            or profile.get("state") != "active"
            or organization.get("state") != "active"
            or membership.get("state") != "active"
        ):
            return None
        return IdentitySnapshot(
            profile_id=profile["id"],
            issuer=identity["issuer"],
            subject=identity["subject"],
            email=identity.get("email") or profile.get("primary_email"),
            organization_id=organization["id"],
            workos_organization_id=workos_organization_id,
            organization_name=organization["name"],
            role=normalize_role(membership.get("role")),
            membership_state=membership["state"],
        )

    def list_organizations(self, profile_id: str) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for organization in self.organizations.values():
            membership = self.memberships.get((organization["id"], profile_id))
            if membership and membership["state"] == "active" and organization["state"] == "active":
                result.append(
                    {
                        "id": organization["id"],
                        "workosOrganizationId": organization["workos_organization_id"],
                        "name": organization["name"],
                        "slug": organization["slug"],
                        "role": membership["role"],
                    }
                )
        return sorted(result, key=lambda item: (item["name"].lower(), item["id"]))

    def list_members(
        self,
        *,
        principal: IdentitySnapshot,
        states: frozenset[str],
        cursor: str | None,
        limit: int,
    ) -> PageResult:
        if not states or not states <= _ALLOWED_MEMBERSHIP_STATES:
            raise ValueError("The membership status filter is invalid.")
        after_id = _decode_cursor(cursor, "members")
        rows = sorted(
            (
                row
                for row in self.memberships.values()
                if row["organization_id"] == principal.organization_id
                and row["state"] in states
                and (after_id is None or row["id"] > after_id)
            ),
            key=lambda row: row["id"],
        )[: limit + 1]
        items = []
        for row in rows[:limit]:
            profile = self.profiles.get(row["profile_id"])
            if not profile:
                continue
            items.append(
                {
                    "id": row["id"],
                    "displayName": profile.get("display_name"),
                    "email": profile.get("primary_email"),
                    "avatarUrl": profile.get("avatar_url"),
                    "role": row["role"],
                    "state": row["state"],
                    "joinedAt": row.get("joined_at"),
                    "revokedAt": row.get("revoked_at"),
                }
            )
        next_cursor = _encode_cursor("members", rows[limit - 1]["id"]) if len(rows) > limit else None
        return PageResult(items, next_cursor)

    def list_invitations(
        self,
        *,
        principal: IdentitySnapshot,
        states: frozenset[str],
        cursor: str | None,
        limit: int,
    ) -> PageResult:
        if not states or not states <= _ALLOWED_INVITATION_STATES:
            raise ValueError("The invitation status filter is invalid.")
        after_id = _decode_cursor(cursor, "invitations")
        rows = sorted(
            (
                row
                for row in self.invitations.values()
                if row["organization_id"] == principal.organization_id
                and row["state"] in states
                and (after_id is None or row["id"] > after_id)
            ),
            key=lambda row: row["id"],
        )[: limit + 1]
        items = [self._safe_invitation(row) for row in rows[:limit]]
        next_cursor = (
            _encode_cursor("invitations", rows[limit - 1]["id"]) if len(rows) > limit else None
        )
        return PageResult(items, next_cursor)

    @staticmethod
    def _safe_invitation(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "email": row["email"],
            "role": row["role"],
            "state": row["state"],
            "expiresAt": row.get("expires_at"),
            "acceptedAt": row.get("accepted_at"),
            "revokedAt": row.get("revoked_at"),
            "createdAt": row.get("created_at"),
        }

    def create_project(
        self,
        *,
        principal: IdentitySnapshot,
        name: str,
        slug: str,
        description: str | None,
        visibility: str,
    ) -> dict[str, Any]:
        if any(
            project["organization_id"] == principal.organization_id and project["slug"] == slug
            for project in self.projects.values()
        ):
            raise ValueError("A project with this slug already exists.")
        project_id = str(uuid4())
        project = {
            "id": project_id,
            "organization_id": principal.organization_id,
            "name": name,
            "slug": slug,
            "description": description,
            "visibility": visibility,
            "state": "active",
            "created_by": principal.profile_id,
            "created_at": _iso(),
        }
        self.projects[project_id] = project
        self.project_memberships[(project_id, principal.profile_id)] = {
            "role": ProjectRole.OWNER.value
        }
        return deepcopy(project)

    def get_project_access(
        self, *, principal: IdentitySnapshot, project_id: str
    ) -> ProjectAccessSnapshot | None:
        project = self.projects.get(project_id)
        if not project or project.get("state") != "active":
            return None
        direct = self.project_memberships.get((project_id, principal.profile_id))
        direct_role = ProjectRole(direct["role"]) if direct else None
        now = _now()
        grants = frozenset(
            ResourcePermission(grant["permission"])
            for grant in self.grants
            if grant["organization_id"] == project["organization_id"]
            and grant["resource_type"] == "project"
            and grant["resource_id"] == project_id
            and grant["principal_type"] == "profile"
            and grant["principal_id"] == principal.profile_id
            and (grant.get("expires_at") is None or _parse_timestamp(grant["expires_at"]) > now)
        )
        return ProjectAccessSnapshot(
            project_id=project_id,
            organization_id=project["organization_id"],
            visibility=project["visibility"],
            direct_role=direct_role,
            grants=grants,
        )

    def save_invitation(
        self,
        *,
        principal: IdentitySnapshot,
        invitation: dict[str, Any],
        email: str,
        role: OrganizationRole,
    ) -> dict[str, Any]:
        workos_id = str(invitation.get("id") or "")
        if not workos_id:
            raise ValueError("WorkOS invitation response did not include an ID.")
        existing = next(
            (item for item in self.invitations.values() if item.get("workos_invitation_id") == workos_id),
            None,
        )
        local_id = existing["id"] if existing else str(uuid4())
        row = {
            "id": local_id,
            "organization_id": principal.organization_id,
            "email": normalize_email(email),
            "role": role.value,
            "state": str(invitation.get("state") or "pending"),
            "workos_invitation_id": workos_id,
            "invited_by": principal.profile_id,
            "expires_at": invitation.get("expires_at")
            or (existing or {}).get("expires_at")
            or _iso(_now() + timedelta(days=7)),
            "accepted_at": invitation.get("accepted_at") or (existing or {}).get("accepted_at"),
            "revoked_at": invitation.get("revoked_at")
            or (_iso() if str(invitation.get("state")) == "revoked" else None),
            "created_at": existing.get("created_at") if existing else _iso(),
            "updated_at": invitation.get("updated_at") or _iso(),
        }
        self.invitations[local_id] = row
        return deepcopy(row)

    def save_bulk_invite(
        self,
        *,
        principal: IdentitySnapshot,
        idempotency_key: str,
        entries: list[dict[str, Any]],
    ) -> dict[str, Any]:
        key = (principal.organization_id, idempotency_key)
        existing = self.bulk_invites.get(key)
        if existing:
            return deepcopy(existing)
        successful = sum(1 for entry in entries if entry.get("invitation"))
        row = {
            "id": str(uuid4()),
            "organization_id": principal.organization_id,
            "requested_by": principal.profile_id,
            "idempotency_key": idempotency_key,
            "state": "completed" if successful == len(entries) else "partially_failed",
            "total_count": len(entries),
            "success_count": successful,
            "failure_count": len(entries) - successful,
            "entries": deepcopy(entries),
        }
        self.bulk_invites[key] = row
        return deepcopy(row)

    def get_bulk_invite(
        self, *, principal: IdentitySnapshot, idempotency_key: str
    ) -> dict[str, Any] | None:
        value = self.bulk_invites.get((principal.organization_id, idempotency_key))
        return deepcopy(value) if value else None

    def get_invitation(
        self, *, principal: IdentitySnapshot, invitation_id: str
    ) -> dict[str, Any] | None:
        value = self.invitations.get(invitation_id)
        if not value or value["organization_id"] != principal.organization_id:
            return None
        return deepcopy(value)

    def receive_webhook(self, event: dict[str, Any]) -> WebhookReceipt:
        event_id = str(event.get("id") or "")
        event_type = str(event.get("event") or "")
        if not event_id or not event_type or not isinstance(event.get("data"), dict):
            raise ValueError("Webhook event shape is invalid.")
        if event_id in self.webhooks:
            return WebhookReceipt(event_id, False, self.webhooks[event_id]["state"])
        data = event["data"]
        organization_external_id = data.get("organization_id")
        if not isinstance(organization_external_id, str):
            organization_external_id = None
        self.webhooks[event_id] = {
            "provider": "workos",
            "event_id": event_id,
            "event_type": event_type,
            "organization_external_id": organization_external_id,
            "payload": deepcopy(event),
            "state": "pending",
            "attempt_count": 0,
        }
        return WebhookReceipt(event_id, True, "pending")

    def process_webhook(self, event_id: str) -> None:
        record = self.webhooks.get(event_id)
        if not record or record["state"] == "processed":
            return
        record["state"] = "processing"
        record["attempt_count"] += 1
        event = record["payload"]
        try:
            self._apply_event(event)
        except Exception as exc:
            record.update({"state": "failed", "last_error": type(exc).__name__})
            raise
        record.update({"state": "processed", "processed_at": _iso(), "last_error": None})

    def _apply_event(self, event: dict[str, Any]) -> None:
        event_type = str(event["event"])
        data = event["data"]
        object_id = str(data.get("id") or "")
        updated_at = _parse_timestamp(data.get("updated_at") or event.get("created_at"))
        version_key = (event_type.rsplit(".", 1)[0], object_id)
        previous_version = self.object_versions.get(version_key)
        if object_id and previous_version is not None and previous_version >= updated_at:
            return
        self.object_versions[version_key] = updated_at

        if event_type.startswith("organization."):
            workos_id = object_id
            organization = self.organizations.get(workos_id)
            if event_type == "organization.deleted":
                if organization:
                    organization.update({"state": "archived", "updated_at": data.get("updated_at") or _iso()})
                return
            if organization:
                organization.update(
                    {
                        "name": data.get("name") or organization["name"],
                        "slug": slugify(
                            str(data.get("slug") or data.get("name") or organization["slug"]),
                            fallback=workos_id,
                        ),
                        "state": "active",
                        "updated_at": data.get("updated_at") or _iso(),
                    }
                )
            return

        if event_type.startswith("organization_membership."):
            workos_org_id = str(data.get("organization_id") or "")
            user_id = str(data.get("user_id") or "")
            organization = self.organizations.get(workos_org_id)
            identity = next((value for key, value in self.identities.items() if key[1] == user_id), None)
            if not organization or not identity:
                return
            key = (organization["id"], identity["profile_id"])
            membership = self.memberships.get(key) or {
                "id": str(uuid4()),
                "organization_id": organization["id"],
                "profile_id": identity["profile_id"],
                "created_at": data.get("created_at") or _iso(),
            }
            next_state = _membership_state_from_event(
                event_type=event_type,
                provider_status=data.get("status"),
                current_state=membership.get("state"),
            )
            membership.update(
                {
                    "workos_membership_id": object_id,
                    "role": normalize_role(data.get("role", {}).get("slug") if isinstance(data.get("role"), dict) else data.get("role_slug")).value,
                    "state": next_state,
                    "revoked_at": _iso() if next_state == "revoked" else None,
                    "updated_at": data.get("updated_at") or _iso(),
                }
            )
            self.memberships[key] = membership
            return

        if event_type.startswith("user."):
            identity = next((value for key, value in self.identities.items() if key[1] == object_id), None)
            if identity:
                profile = self.profiles[identity["profile_id"]]
                if event_type == "user.deleted":
                    profile["state"] = "disabled"
                else:
                    email = data.get("email")
                    if isinstance(email, str):
                        identity["email"] = normalize_email(email)
                        identity["email_verified"] = bool(data.get("email_verified"))
                        if identity["email_verified"]:
                            profile["primary_email"] = identity["email"]
                    profile.update(
                        {
                            "display_name": data.get("name") or " ".join(
                                part for part in [data.get("first_name"), data.get("last_name")] if part
                            ) or profile.get("display_name"),
                            "avatar_url": data.get("profile_picture_url") or profile.get("avatar_url"),
                            "locale": data.get("locale") or profile.get("locale"),
                            "updated_at": data.get("updated_at") or _iso(),
                        }
                    )

        if event_type.startswith("invitation."):
            workos_id = object_id
            workos_org_id = str(data.get("organization_id") or "")
            organization = self.organizations.get(workos_org_id)
            if not organization:
                return
            invitation = next(
                (
                    value
                    for value in self.invitations.values()
                    if value.get("workos_invitation_id") == workos_id
                    and value.get("organization_id") == organization["id"]
                ),
                None,
            )
            if invitation:
                state_value = _invitation_state_from_event(
                    event_type, data.get("state"), invitation.get("state")
                )
                invitation.update(
                    {
                        "state": state_value,
                        "expires_at": data.get("expires_at") or invitation.get("expires_at"),
                        "accepted_at": data.get("accepted_at")
                        or (data.get("updated_at") if state_value == "accepted" else invitation.get("accepted_at")),
                        "revoked_at": data.get("revoked_at")
                        or (data.get("updated_at") if state_value == "revoked" else invitation.get("revoked_at")),
                        "updated_at": data.get("updated_at") or event.get("created_at") or _iso(),
                    }
                )


class SupabaseIdentityRepository:
    """Service-role-only adapter for the canonical Phase 2 Supabase schema."""

    def _client(self):
        client = supabase_service.client()
        if client is None:
            raise RuntimeError(
                "Canonical identity persistence requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
            )
        return client

    @staticmethod
    def _one(data: object) -> dict[str, Any] | None:
        data = getattr(data, "data", data)
        if data is None or data == []:
            return None
        if isinstance(data, dict):
            return data
        if isinstance(data, list) and len(data) == 1 and isinstance(data[0], dict):
            return data[0]
        raise RuntimeError(
            f"Supabase returned an unexpected single-row response shape: {type(data).__name__}."
        )

    def sync_authenticated_identity(
        self,
        *,
        issuer: str,
        subject: str,
        email: str | None,
        email_verified: bool,
        display_name: str | None,
        avatar_url: str | None,
        locale: str | None,
        workos_organization_id: str,
        organization_name: str | None,
        organization_slug: str | None,
        workos_membership_id: str | None,
        role: OrganizationRole,
    ) -> IdentitySnapshot:
        client = self._client()
        normalized_issuer = issuer.rstrip("/")
        normalized_email = normalize_email(email) if email else None
        identity = self._one(
            client.table("external_identities")
            .select("id,profile_id")
            .eq("provider", "workos")
            .eq("issuer", normalized_issuer)
            .eq("subject", subject)
            .maybe_single()
            .execute()
        )
        if identity:
            profile_id = str(identity["profile_id"])
            client.table("profiles").update(
                {
                    "display_name": display_name,
                    "primary_email": normalized_email if email_verified else None,
                    "avatar_url": avatar_url,
                    "locale": locale,
                    "state": "active",
                    "updated_at": _iso(),
                }
            ).eq("id", profile_id).execute()
            client.table("external_identities").update(
                {
                    "email": normalized_email,
                    "email_verified": email_verified,
                    "last_seen_at": _iso(),
                    "updated_at": _iso(),
                }
            ).eq("id", identity["id"]).execute()
        else:
            profile = self._one(
                client.table("profiles")
                .insert(
                    {
                        "display_name": display_name,
                        "primary_email": normalized_email if email_verified else None,
                        "avatar_url": avatar_url,
                        "locale": locale,
                        "state": "active",
                    }
                )
                .execute()
                .data
            )
            if not profile:
                raise RuntimeError("Profile creation did not return a row.")
            profile_id = str(profile["id"])
            client.table("external_identities").insert(
                {
                    "profile_id": profile_id,
                    "provider": "workos",
                    "issuer": normalized_issuer,
                    "subject": subject,
                    "email": normalized_email,
                    "email_verified": email_verified,
                    "last_seen_at": _iso(),
                }
            ).execute()

        organization = self._one(
            client.table("organizations")
            .select("id,workos_organization_id,name,slug,state")
            .eq("workos_organization_id", workos_organization_id)
            .maybe_single()
            .execute()
        )
        if organization:
            organization_id = str(organization["id"])
            if organization_name:
                client.table("organizations").update(
                    {
                        "name": organization_name,
                        "slug": slugify(
                            organization_slug or organization_name,
                            fallback=workos_organization_id,
                        ),
                        "state": "active",
                        "updated_at": _iso(),
                    }
                ).eq("id", organization_id).execute()
        else:
            created = self._one(
                client.table("organizations")
                .insert(
                    {
                        "workos_organization_id": workos_organization_id,
                        "name": organization_name or "Beyond Organization",
                        "slug": slugify(
                            organization_slug or organization_name or workos_organization_id,
                            fallback=workos_organization_id,
                        ),
                        "state": "active",
                    }
                )
                .execute()
                .data
            )
            if not created:
                raise RuntimeError("Organization creation did not return a row.")
            organization_id = str(created["id"])

        existing_membership = self._one(
            client.table("organization_memberships")
            .select("id,state,role,joined_at,revoked_at")
            .eq("organization_id", organization_id)
            .eq("profile_id", profile_id)
            .maybe_single()
            .execute()
        )
        existing_state = str((existing_membership or {}).get("state") or "")
        membership_state = (
            existing_state if existing_state in {"suspended", "revoked"} else "active"
        )
        membership_payload = {
            "organization_id": organization_id,
            "profile_id": profile_id,
            "workos_membership_id": workos_membership_id,
            "role": role.value,
            "state": membership_state,
            "joined_at": (existing_membership or {}).get("joined_at") or _iso(),
            "revoked_at": (existing_membership or {}).get("revoked_at")
            if membership_state == "revoked"
            else None,
            "updated_at": _iso(),
        }
        client.table("organization_memberships").upsert(
            membership_payload,
            on_conflict="organization_id,profile_id",
        ).execute()
        resolved = self.resolve_active_identity(
            issuer=normalized_issuer,
            subject=subject,
            workos_organization_id=workos_organization_id,
        )
        if not resolved:
            if membership_state in {"suspended", "revoked"}:
                raise PermissionError("Canonical organization membership is inactive.")
            raise RuntimeError("Canonical identity sync completed but could not be re-read.")
        return resolved

    def resolve_active_identity(
        self, *, issuer: str, subject: str, workos_organization_id: str
    ) -> IdentitySnapshot | None:
        client = self._client()
        identity = self._one(
            client.table("external_identities")
            .select("profile_id,issuer,subject,email,profiles!inner(id,primary_email,state)")
            .eq("provider", "workos")
            .eq("issuer", issuer.rstrip("/"))
            .eq("subject", subject)
            .maybe_single()
            .execute()
        )
        if not identity:
            return None
        profile = identity.get("profiles")
        if not isinstance(profile, dict) or profile.get("state") != "active":
            return None
        organization = self._one(
            client.table("organizations")
            .select("id,workos_organization_id,name,state")
            .eq("workos_organization_id", workos_organization_id)
            .eq("state", "active")
            .maybe_single()
            .execute()
        )
        if not organization:
            return None
        membership = self._one(
            client.table("organization_memberships")
            .select("role,state")
            .eq("organization_id", organization["id"])
            .eq("profile_id", identity["profile_id"])
            .eq("state", "active")
            .maybe_single()
            .execute()
        )
        if not membership:
            return None
        return IdentitySnapshot(
            profile_id=str(identity["profile_id"]),
            issuer=str(identity["issuer"]),
            subject=str(identity["subject"]),
            email=identity.get("email") or profile.get("primary_email"),
            organization_id=str(organization["id"]),
            workos_organization_id=str(organization["workos_organization_id"]),
            organization_name=str(organization["name"]),
            role=normalize_role(membership.get("role")),
            membership_state=str(membership["state"]),
        )

    def list_organizations(self, profile_id: str) -> list[dict[str, Any]]:
        rows = (
            self._client()
            .table("organization_memberships")
            .select("role,organizations!inner(id,workos_organization_id,name,slug,state)")
            .eq("profile_id", profile_id)
            .eq("state", "active")
            .eq("organizations.state", "active")
            .execute()
            .data
            or []
        )
        result = []
        for row in rows:
            organization = row.get("organizations")
            if isinstance(organization, dict):
                result.append(
                    {
                        "id": organization["id"],
                        "workosOrganizationId": organization["workos_organization_id"],
                        "name": organization["name"],
                        "slug": organization["slug"],
                        "role": row["role"],
                    }
                )
        return result

    def list_members(
        self,
        *,
        principal: IdentitySnapshot,
        states: frozenset[str],
        cursor: str | None,
        limit: int,
    ) -> PageResult:
        if not states or not states <= _ALLOWED_MEMBERSHIP_STATES:
            raise ValueError("The membership status filter is invalid.")
        after_id = _decode_cursor(cursor, "members")
        query = (
            self._client()
            .table("organization_memberships")
            .select(
                "id,role,state,joined_at,revoked_at,"
                "profiles!inner(display_name,primary_email,avatar_url)"
            )
            .eq("organization_id", principal.organization_id)
            .in_("state", sorted(states))
            .order("id")
            .limit(limit + 1)
        )
        if after_id is not None:
            query = query.gt("id", after_id)
        rows = query.execute().data or []
        items: list[dict[str, Any]] = []
        for row in rows[:limit]:
            profile = row.get("profiles")
            if not isinstance(profile, dict):
                continue
            items.append(
                {
                    "id": row["id"],
                    "displayName": profile.get("display_name"),
                    "email": profile.get("primary_email"),
                    "avatarUrl": profile.get("avatar_url"),
                    "role": row["role"],
                    "state": row["state"],
                    "joinedAt": row.get("joined_at"),
                    "revokedAt": row.get("revoked_at"),
                }
            )
        next_cursor = _encode_cursor("members", str(rows[limit - 1]["id"])) if len(rows) > limit else None
        return PageResult(items, next_cursor)

    def list_invitations(
        self,
        *,
        principal: IdentitySnapshot,
        states: frozenset[str],
        cursor: str | None,
        limit: int,
    ) -> PageResult:
        if not states or not states <= _ALLOWED_INVITATION_STATES:
            raise ValueError("The invitation status filter is invalid.")
        after_id = _decode_cursor(cursor, "invitations")
        query = (
            self._client()
            .table("invitations")
            .select("id,email,role,state,expires_at,accepted_at,revoked_at,created_at")
            .eq("organization_id", principal.organization_id)
            .in_("state", sorted(states))
            .order("id")
            .limit(limit + 1)
        )
        if after_id is not None:
            query = query.gt("id", after_id)
        rows = query.execute().data or []
        items = [
            {
                "id": row["id"],
                "email": row["email"],
                "role": row["role"],
                "state": row["state"],
                "expiresAt": row.get("expires_at"),
                "acceptedAt": row.get("accepted_at"),
                "revokedAt": row.get("revoked_at"),
                "createdAt": row.get("created_at"),
            }
            for row in rows[:limit]
        ]
        next_cursor = (
            _encode_cursor("invitations", str(rows[limit - 1]["id"]))
            if len(rows) > limit
            else None
        )
        return PageResult(items, next_cursor)

    def create_project(
        self,
        *,
        principal: IdentitySnapshot,
        name: str,
        slug: str,
        description: str | None,
        visibility: str,
    ) -> dict[str, Any]:
        client = self._client()
        project = self._one(
            client.table("projects")
            .insert(
                {
                    "organization_id": principal.organization_id,
                    "name": name,
                    "slug": slug,
                    "description": description,
                    "visibility": visibility,
                    "created_by": principal.profile_id,
                }
            )
            .execute()
            .data
        )
        if not project:
            raise RuntimeError("Project creation did not return a row.")
        client.table("project_memberships").insert(
            {
                "project_id": project["id"],
                "profile_id": principal.profile_id,
                "role": "owner",
                "created_by": principal.profile_id,
            }
        ).execute()
        return project

    def get_project_access(
        self, *, principal: IdentitySnapshot, project_id: str
    ) -> ProjectAccessSnapshot | None:
        client = self._client()
        project = self._one(
            client.table("projects")
            .select("id,organization_id,visibility,state")
            .eq("id", project_id)
            .maybe_single()
            .execute()
            .data
        )
        if not project or project.get("state") != "active":
            return None
        direct = self._one(
            client.table("project_memberships")
            .select("role")
            .eq("project_id", project_id)
            .eq("profile_id", principal.profile_id)
            .maybe_single()
            .execute()
            .data
        )
        rows = (
            client.table("resource_grants")
            .select("permission,expires_at")
            .eq("organization_id", project["organization_id"])
            .eq("resource_type", "project")
            .eq("resource_id", project_id)
            .eq("principal_type", "profile")
            .eq("principal_id", principal.profile_id)
            .execute()
            .data
            or []
        )
        now = _now()
        grants = frozenset(
            ResourcePermission(row["permission"])
            for row in rows
            if row.get("permission") in _ALLOWED_PERMISSIONS
            and (row.get("expires_at") is None or _parse_timestamp(row["expires_at"]) > now)
        )
        direct_role = None
        if direct and direct.get("role") in _ALLOWED_PROJECT_ROLES:
            direct_role = ProjectRole(direct["role"])
        return ProjectAccessSnapshot(
            project_id=str(project["id"]),
            organization_id=str(project["organization_id"]),
            visibility=str(project["visibility"]),
            direct_role=direct_role,
            grants=grants,
        )

    def save_invitation(
        self,
        *,
        principal: IdentitySnapshot,
        invitation: dict[str, Any],
        email: str,
        role: OrganizationRole,
    ) -> dict[str, Any]:
        client = self._client()
        workos_invitation_id = invitation.get("id")
        existing = None
        if workos_invitation_id:
            existing = self._one(
                client.table("invitations")
                .select("id,expires_at,accepted_at,revoked_at")
                .eq("workos_invitation_id", workos_invitation_id)
                .maybe_single()
                .execute()
                .data
            )
        invitation_state = str(invitation.get("state") or "pending")
        payload = {
            "organization_id": principal.organization_id,
            "email": normalize_email(email),
            "role": role.value,
            "state": invitation_state,
            "workos_invitation_id": workos_invitation_id,
            "invited_by": principal.profile_id,
            "expires_at": invitation.get("expires_at")
            or (existing or {}).get("expires_at")
            or _iso(_now() + timedelta(days=7)),
            "accepted_at": invitation.get("accepted_at")
            or (_iso() if invitation_state == "accepted" else (existing or {}).get("accepted_at")),
            "revoked_at": invitation.get("revoked_at")
            or (_iso() if invitation_state == "revoked" else (existing or {}).get("revoked_at")),
            "updated_at": invitation.get("updated_at") or _iso(),
        }
        query = (
            client.table("invitations")
            .update(payload)
            .eq("id", existing["id"])
            if existing
            else client.table("invitations").insert(payload)
        )
        response = query.execute()
        row = self._one(response.data if response is not None else None)
        if not row:
            raise RuntimeError("Invitation persistence did not return a row.")
        return row

    def save_bulk_invite(
        self,
        *,
        principal: IdentitySnapshot,
        idempotency_key: str,
        entries: list[dict[str, Any]],
    ) -> dict[str, Any]:
        client = self._client()
        existing = self._one(
            client.table("bulk_invite_batches")
            .select("*")
            .eq("organization_id", principal.organization_id)
            .eq("idempotency_key", idempotency_key)
            .maybe_single()
            .execute()
            .data
        )
        if existing:
            return existing
        success_count = sum(1 for entry in entries if entry.get("invitation"))
        batch = self._one(
            client.table("bulk_invite_batches")
            .insert(
                {
                    "organization_id": principal.organization_id,
                    "requested_by": principal.profile_id,
                    "idempotency_key": idempotency_key,
                    "state": "completed" if success_count == len(entries) else "partially_failed",
                    "total_count": len(entries),
                    "success_count": success_count,
                    "failure_count": len(entries) - success_count,
                    "started_at": _iso(),
                    "completed_at": _iso(),
                }
            )
            .execute()
            .data
        )
        if not batch:
            raise RuntimeError("Bulk invitation batch creation did not return a row.")
        entry_rows = []
        for entry in entries:
            invitation = entry.get("invitation")
            entry_rows.append(
                {
                    "batch_id": batch["id"],
                    "invitation_id": invitation.get("id") if isinstance(invitation, dict) else None,
                    "email": entry["email"],
                    "role": entry["role"],
                    "state": "pending" if invitation else "expired",
                    "error_code": entry.get("error_code"),
                    "error_message": entry.get("error_message"),
                }
            )
        if entry_rows:
            client.table("bulk_invite_entries").insert(entry_rows).execute()
        return batch

    def get_bulk_invite(
        self, *, principal: IdentitySnapshot, idempotency_key: str
    ) -> dict[str, Any] | None:
        return self._one(
            self._client()
            .table("bulk_invite_batches")
            .select("*")
            .eq("organization_id", principal.organization_id)
            .eq("idempotency_key", idempotency_key)
            .maybe_single()
            .execute()
            .data
        )

    def get_invitation(
        self, *, principal: IdentitySnapshot, invitation_id: str
    ) -> dict[str, Any] | None:
        return self._one(
            self._client()
            .table("invitations")
            .select("*")
            .eq("id", invitation_id)
            .eq("organization_id", principal.organization_id)
            .maybe_single()
            .execute()
            .data
        )

    def receive_webhook(self, event: dict[str, Any]) -> WebhookReceipt:
        event_id = str(event.get("id") or "")
        event_type = str(event.get("event") or "")
        data = event.get("data")
        if not event_id or not event_type or not isinstance(data, dict):
            raise ValueError("Webhook event shape is invalid.")
        existing = self._one(
            self._client()
            .table("webhook_inbox")
            .select("event_id,state")
            .eq("provider", "workos")
            .eq("event_id", event_id)
            .limit(1)
            .execute()
            .data
        )
        if existing:
            return WebhookReceipt(event_id, False, str(existing["state"]))
        organization_external_id = data.get("organization_id")
        if not isinstance(organization_external_id, str):
            organization_external_id = None
        self._client().table("webhook_inbox").insert(
            {
                "provider": "workos",
                "event_id": event_id,
                "event_type": event_type,
                "organization_external_id": organization_external_id,
                "payload": event,
                "state": "pending",
            }
        ).execute()
        return WebhookReceipt(event_id, True, "pending")

    def process_webhook(self, event_id: str) -> None:
        client = self._client()
        row = self._one(
            client.table("webhook_inbox")
            .select("*")
            .eq("provider", "workos")
            .eq("event_id", event_id)
            .limit(1)
            .execute()
            .data
        )
        if not row or row.get("state") == "processed":
            return
        client.table("webhook_inbox").update(
            {"state": "processing", "attempt_count": int(row.get("attempt_count") or 0) + 1}
        ).eq("id", row["id"]).execute()
        try:
            self._apply_event(client, row["payload"], row)
        except Exception as exc:
            client.table("webhook_inbox").update(
                {
                    "state": "failed",
                    "last_error": type(exc).__name__,
                    "next_attempt_at": _iso(_now() + timedelta(minutes=5)),
                }
            ).eq("id", row["id"]).execute()
            raise
        client.table("webhook_inbox").update(
            {"state": "processed", "processed_at": _iso(), "last_error": None}
        ).eq("id", row["id"]).execute()

    def _apply_event(self, client: Any, event: dict[str, Any], inbox_row: dict[str, Any]) -> None:
        event_type = str(event["event"])
        data = event["data"]
        incoming_updated_at = str(data.get("updated_at") or event.get("created_at") or _iso())

        if event_type.startswith("organization."):
            workos_id = str(data.get("id") or "")
            current = self._one(
                client.table("organizations")
                .select("id,updated_at")
                .eq("workos_organization_id", workos_id)
                .maybe_single()
                .execute()
                .data
            )
            if current and _parse_timestamp(current.get("updated_at")) > _parse_timestamp(incoming_updated_at):
                return
            if event_type == "organization.deleted":
                if current:
                    client.table("organizations").update(
                        {"state": "archived", "updated_at": incoming_updated_at}
                    ).eq("id", current["id"]).execute()
                return
            payload = {
                "workos_organization_id": workos_id,
                "name": data.get("name") or "Beyond Organization",
                "slug": slugify(
                    str(data.get("slug") or data.get("name") or workos_id), fallback=workos_id
                ),
                "state": "active",
                "updated_at": incoming_updated_at,
            }
            client.table("organizations").upsert(
                payload, on_conflict="workos_organization_id"
            ).execute()
            return

        if event_type.startswith("user."):
            subject = str(data.get("id") or "")
            identity = self._one(
                client.table("external_identities")
                .select("id,profile_id,updated_at")
                .eq("provider", "workos")
                .eq("subject", subject)
                .maybe_single()
                .execute()
                .data
            )
            if not identity or _parse_timestamp(identity.get("updated_at")) > _parse_timestamp(incoming_updated_at):
                return
            if event_type == "user.deleted":
                client.table("profiles").update(
                    {"state": "disabled", "updated_at": incoming_updated_at}
                ).eq("id", identity["profile_id"]).execute()
                return
            email = normalize_email(str(data["email"])) if data.get("email") else None
            client.table("external_identities").update(
                {
                    "email": email,
                    "email_verified": bool(data.get("email_verified")),
                    "updated_at": incoming_updated_at,
                }
            ).eq("id", identity["id"]).execute()
            client.table("profiles").update(
                {
                    "display_name": data.get("name")
                    or " ".join(
                        str(part)
                        for part in [data.get("first_name"), data.get("last_name")]
                        if part
                    )
                    or None,
                    "primary_email": email if data.get("email_verified") else None,
                    "avatar_url": data.get("profile_picture_url"),
                    "locale": data.get("locale"),
                    "state": "active",
                    "updated_at": incoming_updated_at,
                }
            ).eq("id", identity["profile_id"]).execute()
            return

        if event_type.startswith("organization_membership."):
            workos_membership_id = str(data.get("id") or "")
            workos_org_id = str(data.get("organization_id") or "")
            subject = str(data.get("user_id") or "")
            organization = self._one(
                client.table("organizations")
                .select("id")
                .eq("workos_organization_id", workos_org_id)
                .limit(1)
                .execute()
                .data
            )
            identity = self._one(
                client.table("external_identities")
                .select("profile_id")
                .eq("provider", "workos")
                .eq("subject", subject)
                .maybe_single()
                .execute()
                .data
            )
            if not organization or not identity:
                return
            current = self._one(
                client.table("organization_memberships")
                .select("id,state,role,updated_at")
                .eq("organization_id", organization["id"])
                .eq("profile_id", identity["profile_id"])
                .maybe_single()
                .execute()
                .data
            )
            if current and _parse_timestamp(current.get("updated_at")) > _parse_timestamp(incoming_updated_at):
                return
            role_value = data.get("role_slug")
            if isinstance(data.get("role"), dict):
                role_value = data["role"].get("slug")
            next_state = _membership_state_from_event(
                event_type=event_type,
                provider_status=data.get("status"),
                current_state=(current or {}).get("state"),
            )
            client.table("organization_memberships").upsert(
                {
                    "organization_id": organization["id"],
                    "profile_id": identity["profile_id"],
                    "workos_membership_id": workos_membership_id,
                    "role": normalize_role(role_value).value,
                    "state": next_state,
                    "joined_at": data.get("created_at") or incoming_updated_at,
                    "revoked_at": incoming_updated_at if next_state == "revoked" else None,
                    "updated_at": incoming_updated_at,
                },
                on_conflict="organization_id,profile_id",
            ).execute()
            return

        if event_type.startswith("invitation."):
            workos_org_id = str(data.get("organization_id") or "")
            organization = self._one(
                client.table("organizations")
                .select("id")
                .eq("workos_organization_id", workos_org_id)
                .maybe_single()
                .execute()
                .data
            )
            if not organization:
                return
            workos_invitation_id = str(data.get("id") or "")
            current = self._one(
                client.table("invitations")
                .select(
                    "id,organization_id,email,role,state,expires_at,accepted_at,revoked_at,updated_at"
                )
                .eq("workos_invitation_id", workos_invitation_id)
                .limit(1)
                .execute()
                .data
            )
            if current and str(current.get("organization_id")) != str(organization["id"]):
                raise ValueError("Invitation webhook organization does not match canonical state.")
            if current and _parse_timestamp(current.get("updated_at")) >= _parse_timestamp(
                incoming_updated_at
            ):
                return
            state_value = _invitation_state_from_event(
                event_type, data.get("state"), (current or {}).get("state")
            )
            email_value = data.get("email") or (current or {}).get("email")
            expires_at = data.get("expires_at") or (current or {}).get("expires_at")
            if not email_value or not expires_at:
                raise ValueError("Invitation webhook is missing canonical fields.")
            role_value = data.get("role_slug")
            if isinstance(data.get("role"), dict):
                role_value = data["role"].get("slug")
            invitation_payload = {
                    "organization_id": organization["id"],
                    "email": normalize_email(str(email_value)),
                    "role": normalize_role(role_value or (current or {}).get("role")).value,
                    "state": state_value,
                    "workos_invitation_id": workos_invitation_id,
                    "expires_at": expires_at,
                    "accepted_at": data.get("accepted_at")
                    or (incoming_updated_at if state_value == "accepted" else (current or {}).get("accepted_at")),
                    "revoked_at": data.get("revoked_at")
                    or (incoming_updated_at if state_value == "revoked" else (current or {}).get("revoked_at")),
                    "updated_at": incoming_updated_at,
                }
            if current:
                client.table("invitations").update(invitation_payload).eq("id", current["id"]).execute()
            else:
                client.table("invitations").insert(invitation_payload).execute()
