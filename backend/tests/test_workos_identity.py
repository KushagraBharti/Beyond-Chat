from __future__ import annotations

import hashlib
import hmac
import json
import time
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from src import main
from src.authorization.policy import OrganizationRole, Principal
from src.config import Settings
from src.identity.authkit import (
    BulkInvitationRequest,
    InvitationRequest,
    bulk_invite,
    get_identity_repository,
    get_membership_admin_repository,
    get_workos_provider,
)
from src.identity.membership_admin import InMemoryMembershipAdminRepository
from src.identity.repository import InMemoryIdentityRepository
from src.identity.workos_service import WorkOSService, WorkOSSession


class FakeWorkOSProvider:
    def __init__(self) -> None:
        self.sessions: dict[tuple[str, str | None], WorkOSSession | None] = {}
        self.provisioned: list[WorkOSSession] = []
        self.provisioned_session: WorkOSSession | None = None
        self.provision_error: Exception | None = None
        self.sent: list[dict[str, str]] = []
        self.revoked: list[str] = []
        self.webhook_event: dict[str, Any] | None = None
        self.membership_actions: list[tuple[str, str]] = []
        self.membership_error: Exception | None = None
        self.findable_memberships: dict[tuple[str, str], dict[str, Any]] = {}

    def authorization_url(self, **kwargs: Any) -> str:
        return f"https://auth.example.test/authorize?state={kwargs['state']}"

    def exchange_code(self, code: str, invitation_token: str | None = None) -> WorkOSSession:
        del code, invitation_token
        session = self.sessions.get(("callback", None))
        assert session is not None
        return session

    def authenticate_session(
        self, sealed_session: str, *, organization_id: str | None = None
    ) -> WorkOSSession | None:
        return self.sessions.get((sealed_session, organization_id))

    def provision_starter_organization(self, session: WorkOSSession) -> WorkOSSession:
        self.provisioned.append(session)
        if self.provision_error is not None:
            raise self.provision_error
        assert self.provisioned_session is not None
        return self.provisioned_session

    def logout_url(self, sealed_session: str) -> str:
        return f"https://auth.example.test/logout?session={sealed_session}"

    def organization(self, organization_id: str) -> dict[str, Any]:
        return {"id": organization_id, "name": f"Organization {organization_id[-1]}", "slug": organization_id}

    def send_invitation(
        self, *, email: str, organization_id: str, role: str, inviter_user_id: str
    ) -> dict[str, Any]:
        self.sent.append(
            {
                "email": email,
                "organization_id": organization_id,
                "role": role,
                "inviter_user_id": inviter_user_id,
            }
        )
        return {"id": f"invite_{len(self.sent)}", "state": "pending"}

    def revoke_invitation(self, invitation_id: str) -> dict[str, Any]:
        self.revoked.append(invitation_id)
        return {"id": invitation_id, "state": "revoked"}

    def _membership_action(self, action: str, membership_id: str) -> dict[str, Any]:
        if self.membership_error is not None:
            raise self.membership_error
        self.membership_actions.append((action, membership_id))
        return {"id": membership_id}

    def find_membership(self, *, user_id: str, organization_id: str) -> dict[str, Any] | None:
        return self.findable_memberships.get((user_id, organization_id))

    def update_membership_role(self, membership_id: str, role: str) -> dict[str, Any]:
        return self._membership_action(f"update_role:{role}", membership_id)

    def deactivate_membership(self, membership_id: str) -> dict[str, Any]:
        return self._membership_action("deactivate", membership_id)

    def reactivate_membership(self, membership_id: str) -> dict[str, Any]:
        return self._membership_action("reactivate", membership_id)

    def delete_membership(self, membership_id: str) -> None:
        self._membership_action("delete", membership_id)

    def verify_webhook(self, payload: bytes, signature: str) -> dict[str, Any]:
        if signature != "valid":
            raise ValueError("invalid signature")
        return self.webhook_event or json.loads(payload)


def make_session(
    organization_id: str | None, *, sealed: str = "sealed-a", role: str | None = "owner"
) -> WorkOSSession:
    return WorkOSSession(
        sealed_session=sealed,
        issuer="https://api.workos.com",
        subject="user_1",
        session_id="session_1",
        organization_id=organization_id,
        role=role,
        permissions=frozenset({"untrusted:provider-claim"}),
        user={"id": "user_1", "email": "member@example.com", "email_verified": True},
    )


def test_workos_sdk_adapter_uses_verified_session_result() -> None:
    service = WorkOSService(
        Settings(
            workos_api_key="sk_test",
            workos_client_id="client_test",
            workos_cookie_password="x" * 32,
            workos_issuer="https://api.workos.com/user_management/client_test",
        )
    )
    session = service._claims_from_sealed(  # noqa: SLF001 - narrow SDK contract test
        "sealed",
        SimpleNamespace(
            user={"id": "user_test", "email": "test@example.com"},
            session_id="session_test",
            organization_id="org_test",
            role="member",
            permissions=["project:view"],
        ),
    )

    assert session.issuer == "https://api.workos.com/user_management/client_test"
    assert session.subject == "user_test"
    assert session.organization_id == "org_test"
    assert session.permissions == {"project:view"}


def test_workos_sdk_adapter_verifies_real_signed_webhook_and_rejects_invalid_signature() -> None:
    secret = "whsec_contract_test"
    service = WorkOSService(
        Settings(
            workos_api_key="sk_test",
            workos_client_id="client_test",
            workos_cookie_password="x" * 32,
            workos_webhook_secret=secret,
            workos_issuer="https://api.workos.com/user_management/client_test",
        )
    )
    payload = json.dumps(
        {
            "id": "event_sdk_contract",
            "event": "user.updated",
            "created_at": "2026-07-12T00:00:00Z",
            "data": {
                "id": "user_sdk_contract",
                "first_name": "SDK",
                "last_name": "Contract",
                "profile_picture_url": None,
                "email": "sdk@example.com",
                "email_verified": True,
                "external_id": None,
                "last_sign_in_at": None,
                "created_at": "2026-07-12T00:00:00Z",
                "updated_at": "2026-07-12T00:00:00Z",
            },
        },
        separators=(",", ":"),
    ).encode()
    timestamp = str(int(time.time() * 1000))
    digest = hmac.new(secret.encode(), f"{timestamp}.".encode() + payload, hashlib.sha256).hexdigest()
    event = service.verify_webhook(payload, f"t={timestamp}, v1={digest}")
    assert event["id"] == "event_sdk_contract"
    assert event["event"] == "user.updated"

    with pytest.raises(ValueError, match="signature"):
        service.verify_webhook(payload, f"t={timestamp}, v1={'0' * 64}")
    with pytest.raises(ValueError, match="extract timestamp"):
        service.verify_webhook(payload, "malformed")


@pytest.mark.parametrize("restricted_state", ["suspended", "revoked"])
def test_login_sync_cannot_resurrect_restricted_canonical_membership(
    restricted_state: str,
) -> None:
    repository = InMemoryIdentityRepository()
    snapshot = repository.sync_authenticated_identity(
        issuer="https://api.workos.com/",
        subject="user_restricted",
        email="restricted@example.com",
        email_verified=True,
        display_name="Restricted User",
        avatar_url=None,
        locale=None,
        workos_organization_id="org_restricted",
        organization_name="Restricted Org",
        organization_slug="restricted-org",
        workos_membership_id="membership_restricted",
        role=OrganizationRole.MEMBER,
    )
    key = (snapshot.organization_id, snapshot.profile_id)
    repository.memberships[key]["state"] = restricted_state
    with pytest.raises(PermissionError, match="inactive"):
        repository.sync_authenticated_identity(
            issuer=snapshot.issuer,
            subject=snapshot.subject,
            email="restricted@example.com",
            email_verified=True,
            display_name="Restricted User Updated",
            avatar_url=None,
            locale=None,
            workos_organization_id=snapshot.workos_organization_id,
            organization_name="Restricted Org",
            organization_slug="restricted-org",
            workos_membership_id="membership_restricted",
            role=OrganizationRole.ADMIN,
        )
    assert repository.memberships[key]["state"] == restricted_state


@pytest.fixture
def identity_stack(monkeypatch: pytest.MonkeyPatch):
    repository = InMemoryIdentityRepository()
    org_a = repository.sync_authenticated_identity(
        issuer="https://api.workos.com/",
        subject="user_1",
        email="member@example.com",
        email_verified=True,
        display_name="Member One",
        avatar_url=None,
        locale=None,
        workos_organization_id="org_a",
        organization_name="Organization A",
        organization_slug="organization-a",
        workos_membership_id="membership_a",
        role=OrganizationRole.OWNER,
    )
    org_b = repository.sync_authenticated_identity(
        issuer="https://api.workos.com/",
        subject="user_1",
        email="member@example.com",
        email_verified=True,
        display_name="Member One",
        avatar_url=None,
        locale=None,
        workos_organization_id="org_b",
        organization_name="Organization B",
        organization_slug="organization-b",
        workos_membership_id="membership_b",
        role=OrganizationRole.MEMBER,
    )
    provider = FakeWorkOSProvider()
    provider.sessions[("sealed-a", None)] = make_session("org_a", role="viewer")
    provider.sessions[("sealed-a", "org_b")] = make_session("org_b", sealed="sealed-b", role="owner")
    provider.sessions[("sealed-b", None)] = make_session("org_b", sealed="sealed-b", role="owner")

    membership_admin = InMemoryMembershipAdminRepository(repository)
    main.app.dependency_overrides[get_identity_repository] = lambda: repository
    main.app.dependency_overrides[get_workos_provider] = lambda: provider
    main.app.dependency_overrides[get_membership_admin_repository] = lambda: membership_admin
    monkeypatch.setattr(
        main,
        "resolve_request_context",
        lambda *_args, **_kwargs: pytest.fail("legacy Supabase auth ran for a WorkOS identity route"),
    )
    with TestClient(main.app, base_url="https://app.example.test") as client:
        client.cookies.set("beyond_session", "sealed-a")
        client.cookies.set("beyond_csrf", "csrf-test-token")
        client.headers["X-CSRF-Token"] = "csrf-test-token"
        yield client, repository, provider, org_a, org_b
    main.app.dependency_overrides.clear()


def test_workos_router_is_mounted_and_uses_canonical_role(identity_stack: tuple[Any, ...]) -> None:
    client, _repository, _provider, org_a, _org_b = identity_stack

    response = client.get("/api/auth/session")

    assert response.status_code == 200
    payload = response.json()
    permissions = payload.pop("permissions")
    assert payload == {
        "profileId": org_a.profile_id,
        "email": "member@example.com",
        "organizationId": org_a.organization_id,
        "workosOrganizationId": "org_a",
        "role": "owner",
    }
    assert "manage_owner_lifecycle" in permissions
    assert permissions == sorted(permissions)


def test_revoked_membership_denies_same_still_valid_session(identity_stack: tuple[Any, ...]) -> None:
    client, repository, _provider, _org_a, _org_b = identity_stack
    receipt = repository.receive_webhook(
        {
            "id": "event_revoke_membership",
            "event": "organization_membership.deleted",
            "created_at": "2026-07-11T15:00:00Z",
            "data": {
                "id": "membership_a",
                "organization_id": "org_a",
                "user_id": "user_1",
                "updated_at": "2026-07-11T15:00:00Z",
            },
        }
    )
    repository.process_webhook(receipt.event_id)

    response = client.get("/api/auth/session")

    assert response.status_code == 403
    assert response.json()["detail"] == "The organization membership is inactive or revoked."


def test_organization_switch_requires_current_internal_membership(identity_stack: tuple[Any, ...]) -> None:
    client, repository, provider, org_a, org_b = identity_stack

    response = client.post("/api/organizations/switch", json={"organizationId": "org_b"})

    assert response.status_code == 200
    assert response.json()["workosOrganizationId"] == "org_b"
    assert "beyond_session=sealed-b" in response.headers["set-cookie"]

    repository.memberships[(next(org["id"] for org in repository.organizations.values() if org["workos_organization_id"] == "org_b"), org_a.profile_id)]["state"] = "revoked"
    client.cookies.clear()
    client.cookies.set("beyond_session", "sealed-a")
    client.cookies.set("beyond_csrf", "csrf-test-token")
    denied = client.post("/api/organizations/switch", json={"organizationId": "org_b"})

    assert denied.status_code == 403
    assert denied.json()["detail"] == "Organization access denied."
    assert provider.authenticate_session("sealed-a", organization_id="org_b") is not None


def test_member_and_invitation_lists_are_admin_only_tenant_safe_and_paginated(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, _provider, org_a, _org_b = identity_stack
    for index in range(2):
        repository.sync_authenticated_identity(
            issuer="https://api.workos.com/",
            subject=f"user_extra_{index}",
            email=f"extra{index}@example.com",
            email_verified=True,
            display_name=f"Extra {index}",
            avatar_url=None,
            locale=None,
            workos_organization_id="org_a",
            organization_name="Organization A",
            organization_slug="organization-a",
            workos_membership_id=f"membership_extra_{index}",
            role=OrganizationRole.MEMBER,
        )

    first_page = client.get(
        f"/api/organizations/{org_a.organization_id}/members",
        params={"status": "active", "limit": 1},
    )
    assert first_page.status_code == 200
    assert len(first_page.json()["items"]) == 1
    assert first_page.json()["nextCursor"]
    assert set(first_page.json()["items"][0]) == {
        "id",
        "displayName",
        "email",
        "avatarUrl",
        "role",
        "state",
        "joinedAt",
        "revokedAt",
    }
    second_page = client.get(
        f"/api/organizations/{org_a.organization_id}/members",
        params={"status": "active", "limit": 1, "cursor": first_page.json()["nextCursor"]},
    )
    assert second_page.status_code == 200
    assert second_page.json()["items"][0]["id"] != first_page.json()["items"][0]["id"]

    guessed = client.get("/api/organizations/00000000-0000-0000-0000-000000000000/members")
    assert guessed.status_code == 404
    wrong_cursor = client.get(
        f"/api/organizations/{org_a.organization_id}/members", params={"cursor": "not-a-cursor"}
    )
    assert wrong_cursor.status_code == 400

    repository.memberships[(org_a.organization_id, org_a.profile_id)]["role"] = "member"
    directory = client.get(f"/api/organizations/{org_a.organization_id}/members")
    assert directory.status_code == 200
    assert all(
        set(item) == {"id", "displayName", "email", "avatarUrl", "role"}
        for item in directory.json()["items"]
    ), "the plain member directory must not expose lifecycle fields"
    lifecycle_denied = client.get(
        f"/api/organizations/{org_a.organization_id}/members",
        params={"status": "revoked"},
    )
    assert lifecycle_denied.status_code == 403
    invitations_denied = client.get(
        f"/api/organizations/{org_a.organization_id}/invitations"
    )
    assert invitations_denied.status_code == 403


def test_invitation_list_filters_and_revokes_by_canonical_listed_id(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, org_a, org_b = identity_stack
    first = client.post("/api/invitations", json={"email": "first-list@example.com"})
    second = client.post("/api/invitations", json={"email": "second-list@example.com"})
    assert first.status_code == second.status_code == 201

    pending = client.get(
        f"/api/organizations/{org_a.organization_id}/invitations",
        params={"status": "pending", "limit": 100},
    )
    assert pending.status_code == 200
    listed = next(item for item in pending.json()["items"] if item["email"] == "first-list@example.com")
    assert set(listed) == {
        "id",
        "email",
        "role",
        "state",
        "expiresAt",
        "acceptedAt",
        "revokedAt",
        "createdAt",
    }
    assert client.delete(f"/api/invitations/{listed['id']}").status_code == 204
    assert provider.revoked[-1] == first.json()["workos_invitation_id"]

    revoked = client.get(
        f"/api/organizations/{org_a.organization_id}/invitations",
        params={"status": "revoked"},
    )
    assert [item["id"] for item in revoked.json()["items"]] == [listed["id"]]
    assert revoked.json()["items"][0]["revokedAt"] is not None

    foreign = repository.save_invitation(
        principal=org_b,
        invitation={"id": "invite_other_org"},
        email="other-org@example.com",
        role=OrganizationRole.MEMBER,
    )
    assert all(item["id"] != foreign["id"] for item in pending.json()["items"])


def test_invitation_revoke_is_tenant_scoped_and_bulk_is_idempotent(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, _org_a, org_b = identity_stack
    created = client.post("/api/invitations", json={"email": "Invite@Example.com", "role": "member"})
    assert created.status_code == 201
    assert created.json()["email"] == "invite@example.com"

    foreign = repository.save_invitation(
        principal=org_b,
        invitation={"id": "invite_foreign"},
        email="foreign@example.com",
        role=OrganizationRole.MEMBER,
    )
    denied = client.delete(f"/api/invitations/{foreign['id']}")
    assert denied.status_code == 404
    assert "invite_foreign" not in provider.revoked

    body = {
        "invitations": [
            {"email": "first@example.com", "role": "viewer"},
            {"email": "FIRST@example.com", "role": "viewer"},
        ]
    }
    first = client.post("/api/invitations/bulk", headers={"Idempotency-Key": "bulk-key-0001"}, json=body)
    sent_after_first = len(provider.sent)
    replay = client.post("/api/invitations/bulk", headers={"Idempotency-Key": "bulk-key-0001"}, json=body)

    assert first.status_code == 201
    assert first.json()["success_count"] == 1
    assert first.json()["failure_count"] == 1
    assert replay.status_code == 201
    assert replay.json()["id"] == first.json()["id"]
    assert len(provider.sent) == sent_after_first


def test_bulk_invite_check_then_side_effect_contract_exposes_concurrent_duplicate(
    identity_stack: tuple[Any, ...],
) -> None:
    _client, repository, provider, org_a, _org_b = identity_stack
    barrier = Barrier(2)
    original = repository.get_bulk_invite

    def racing_get(*, principal, idempotency_key):  # type: ignore[no-untyped-def]
        result = original(principal=principal, idempotency_key=idempotency_key)
        barrier.wait(timeout=2)
        return result

    repository.get_bulk_invite = racing_get
    principal = Principal(
        profile_id=org_a.profile_id,
        subject=org_a.subject,
        issuer=org_a.issuer,
        organization_id=org_a.organization_id,
        workos_organization_id=org_a.workos_organization_id,
        role=OrganizationRole.OWNER,
    )
    payload = BulkInvitationRequest(
        invitations=[InvitationRequest(email="race@example.com", role=OrganizationRole.MEMBER)]
    )

    def invoke():  # type: ignore[no-untyped-def]
        return bulk_invite(
            payload=payload,
            idempotency_key="bulk-race-key",
            principal=principal,
            _csrf=None,
            provider=provider,
            repository=repository,
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _index: invoke(), range(2)))
    assert results[0]["id"] == results[1]["id"]
    assert [item["email"] for item in provider.sent].count("race@example.com") == 2


def test_admin_cannot_assign_owner_role(identity_stack: tuple[Any, ...]) -> None:
    client, repository, provider, org_a, _org_b = identity_stack
    repository.memberships[(org_a.organization_id, org_a.profile_id)]["role"] = "admin"

    response = client.post(
        "/api/invitations",
        json={"email": "future-owner@example.com", "role": "owner"},
    )

    assert response.status_code == 403
    assert (
        response.json()["detail"]
        == "This action requires the manage_owner_lifecycle permission."
    )
    assert provider.sent == []


def test_workos_webhook_rejects_unknown_events_and_replays_idempotently(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, _org_a, _org_b = identity_stack
    provider.webhook_event = {
        "id": "event_unknown",
        "event": "session.created",
        "data": {"id": "session_1"},
    }
    rejected = client.post("/api/webhooks/workos", headers={"WorkOS-Signature": "valid"}, content=b"{}")
    assert rejected.status_code == 400
    assert repository.webhooks == {}

    provider.webhook_event = {
        "id": "event_user_update",
        "event": "user.updated",
        "created_at": "2026-07-11T16:00:00Z",
        "data": {
            "id": "user_1",
            "email": "new@example.com",
            "email_verified": True,
            "updated_at": "2026-07-11T16:00:00Z",
        },
    }
    first = client.post("/api/webhooks/workos", headers={"WorkOS-Signature": "valid"}, content=b"{}")
    replay = client.post("/api/webhooks/workos", headers={"WorkOS-Signature": "valid"}, content=b"{}")

    assert first.json() == {"received": True, "duplicate": False}
    assert replay.json() == {"received": True, "duplicate": True}
    assert repository.webhooks["event_user_update"]["attempt_count"] == 1


def test_invitation_webhook_stale_event_does_not_regress_list_state(
    identity_stack: tuple[Any, ...],
) -> None:
    client, _repository, provider, org_a, _org_b = identity_stack
    created = client.post("/api/invitations", json={"email": "state@example.com"})
    assert created.status_code == 201
    provider_id = created.json()["workos_invitation_id"]
    base_data = {
        "id": provider_id,
        "organization_id": "org_a",
        "email": "state@example.com",
        "role_slug": "member",
        "expires_at": "2026-07-20T00:00:00Z",
    }
    provider.webhook_event = {
        "id": "event_invitation_accepted",
        "event": "invitation.accepted",
        "created_at": "2026-07-11T18:00:00Z",
        "data": {**base_data, "accepted_at": "2026-07-11T18:00:00Z", "updated_at": "2026-07-11T18:00:00Z"},
    }
    assert client.post(
        "/api/webhooks/workos", headers={"WorkOS-Signature": "valid"}, content=b"{}"
    ).status_code == 200
    provider.webhook_event = {
        "id": "event_invitation_stale_pending",
        "event": "invitation.created",
        "created_at": "2026-07-11T17:00:00Z",
        "data": {**base_data, "state": "pending", "updated_at": "2026-07-11T17:00:00Z"},
    }
    assert client.post(
        "/api/webhooks/workos", headers={"WorkOS-Signature": "valid"}, content=b"{}"
    ).status_code == 200

    accepted = client.get(
        f"/api/organizations/{org_a.organization_id}/invitations",
        params={"status": "accepted"},
    )
    assert accepted.status_code == 200
    assert [(item["id"], item["state"]) for item in accepted.json()["items"]] == [
        (created.json()["id"], "accepted")
    ]


def test_invitation_resent_refreshes_pending_expiry_without_regressing_terminal_state(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, _org_a, _org_b = identity_stack
    created = client.post("/api/invitations", json={"email": "resent@example.com"})
    assert created.status_code == 201
    provider_id = created.json()["workos_invitation_id"]
    local = next(
        row for row in repository.invitations.values() if row["workos_invitation_id"] == provider_id
    )
    original_expiry = local["expires_at"]
    resent = {
        "id": "event_invitation_resent",
        "event": "invitation.resent",
        "created_at": "2026-07-12T18:00:00Z",
        "data": {
            "id": provider_id,
            "organization_id": "org_a",
            "email": "resent@example.com",
            "role_slug": "member",
            "expires_at": "2026-07-19T18:00:00Z",
            "updated_at": "2026-07-12T18:00:00Z",
        },
    }
    assert _post_webhook(client, provider, resent).status_code == 200
    assert local["state"] == "pending"
    assert local["expires_at"] != original_expiry

    local.update({"state": "accepted", "updated_at": "2026-07-12T19:00:00Z"})
    newer_resent = deepcopy(resent)
    newer_resent["id"] = "event_invitation_resent_after_accept"
    newer_resent["created_at"] = "2026-07-12T20:00:00Z"
    newer_resent["data"]["updated_at"] = "2026-07-12T20:00:00Z"
    assert _post_webhook(client, provider, newer_resent).status_code == 200
    assert local["state"] == "accepted"


def test_login_state_blocks_open_redirect_and_callback_rejects_mismatch(
    identity_stack: tuple[Any, ...],
) -> None:
    client, _repository, _provider, _org_a, _org_b = identity_stack
    login = client.get("/api/auth/login?returnTo=https://evil.example", follow_redirects=False)
    assert login.status_code == 302
    assert login.headers["location"].startswith("https://auth.example.test/authorize")

    rejected = client.get(
        "/api/auth/callback?code=code_1&state=attacker-state",
        follow_redirects=False,
    )
    assert rejected.status_code == 400


def _complete_login_callback(client: TestClient) -> Any:
    login = client.get("/api/auth/login?returnTo=/home", follow_redirects=False)
    state = login.headers["location"].partition("state=")[2]
    return client.get(
        "/api/auth/callback",
        params={"code": "code_1", "state": state},
        follow_redirects=False,
    )


def test_first_login_provisions_private_organization_and_scoped_session(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, _org_a, _org_b = identity_stack
    initial = make_session(None, sealed="sealed-unscoped", role=None)
    provisioned = make_session("org_personal", sealed="sealed-personal", role="owner")
    provider.sessions[("callback", None)] = initial
    provider.provisioned_session = provisioned

    response = _complete_login_callback(client)

    assert response.status_code == 303
    assert response.headers["location"] == "/home"
    assert provider.provisioned == [initial]
    assert "beyond_session=sealed-personal" in response.headers["set-cookie"]
    snapshot = repository.resolve_active_identity(
        issuer=provisioned.issuer,
        subject=provisioned.subject,
        workos_organization_id="org_personal",
    )
    assert snapshot is not None
    assert snapshot.role is OrganizationRole.OWNER


def test_first_login_provisioning_failure_fails_closed(identity_stack: tuple[Any, ...]) -> None:
    client, _repository, provider, _org_a, _org_b = identity_stack
    provider.sessions[("callback", None)] = make_session(None, sealed="sealed-unscoped", role=None)
    provider.provision_error = RuntimeError("provider secret detail")

    response = _complete_login_callback(client)

    assert response.status_code == 503
    assert response.json() == {"detail": "Account setup failed."}
    assert "provider secret detail" not in response.text
    assert "beyond_session=" not in response.headers.get("set-cookie", "")


def test_existing_organization_callback_does_not_provision(identity_stack: tuple[Any, ...]) -> None:
    client, _repository, provider, _org_a, _org_b = identity_stack
    provider.sessions[("callback", None)] = make_session("org_a", sealed="sealed-existing")

    response = _complete_login_callback(client)

    assert response.status_code == 303
    assert provider.provisioned == []
    assert "beyond_session=sealed-existing" in response.headers["set-cookie"]


def test_logout_clears_local_session_cookie(identity_stack: tuple[Any, ...]) -> None:
    client, _repository, _provider, _org_a, _org_b = identity_stack
    response = client.post("/api/auth/logout", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"].startswith("https://auth.example.test/logout")
    assert "beyond_session=" in response.headers["set-cookie"]
    assert "Max-Age=0" in response.headers["set-cookie"]


def test_cookie_authenticated_mutation_requires_csrf(identity_stack: tuple[Any, ...]) -> None:
    client, _repository, provider, _org_a, _org_b = identity_stack

    response = client.post(
        "/api/invitations",
        headers={"X-CSRF-Token": "wrong-token"},
        json={"email": "blocked@example.com", "role": "member"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "CSRF validation failed."
    assert provider.sent == []


def _add_member(
    repository: InMemoryIdentityRepository,
    *,
    subject: str,
    workos_org: str = "org_a",
    role: OrganizationRole = OrganizationRole.MEMBER,
    workos_membership_id: str | None = None,
) -> tuple[str, str]:
    """Provision a second member; returns (membership_row_id, profile_id)."""

    snapshot = repository.sync_authenticated_identity(
        issuer="https://api.workos.com/",
        subject=subject,
        email=f"{subject}@example.com",
        email_verified=True,
        display_name=subject,
        avatar_url=None,
        locale=None,
        workos_organization_id=workos_org,
        organization_name=f"Organization {workos_org[-1].upper()}",
        organization_slug=f"organization-{workos_org[-1]}",
        workos_membership_id=workos_membership_id,
        role=role,
    )
    membership = repository.memberships[(snapshot.organization_id, snapshot.profile_id)]
    return str(membership["id"]), snapshot.profile_id


def test_member_role_change_updates_provider_and_is_idempotent(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, org_a, _org_b = identity_stack
    member_id, _profile = _add_member(
        repository, subject="user_role", workos_membership_id="membership_role"
    )

    changed = client.patch(
        f"/api/organizations/{org_a.organization_id}/members/{member_id}",
        json={"role": "builder"},
    )
    assert changed.status_code == 200
    assert changed.json()["role"] == "builder"
    assert provider.membership_actions == [("update_role:builder", "membership_role")]

    repeated = client.patch(
        f"/api/organizations/{org_a.organization_id}/members/{member_id}",
        json={"role": "builder"},
    )
    assert repeated.status_code == 200
    assert provider.membership_actions == [("update_role:builder", "membership_role")]

    unknown_role = client.patch(
        f"/api/organizations/{org_a.organization_id}/members/{member_id}",
        json={"role": "superuser"},
    )
    assert unknown_role.status_code == 422


def test_member_suspend_restore_cycle_is_idempotent_and_state_safe(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, org_a, _org_b = identity_stack
    member_id, profile_id = _add_member(
        repository, subject="user_susp", workos_membership_id="membership_susp"
    )
    base = f"/api/organizations/{org_a.organization_id}/members/{member_id}"

    suspended = client.post(f"{base}/suspend")
    assert suspended.status_code == 200
    assert suspended.json()["state"] == "suspended"
    assert provider.membership_actions == [("deactivate", "membership_susp")]

    again = client.post(f"{base}/suspend")
    assert again.status_code == 200
    assert again.json()["state"] == "suspended"
    assert provider.membership_actions == [("deactivate", "membership_susp")]

    role_change_blocked = client.patch(base, json={"role": "builder"})
    assert role_change_blocked.status_code == 409

    restored = client.post(f"{base}/restore")
    assert restored.status_code == 200
    assert restored.json()["state"] == "active"
    assert provider.membership_actions[-1] == ("reactivate", "membership_susp")

    restore_again = client.post(f"{base}/restore")
    assert restore_again.status_code == 200
    assert len(provider.membership_actions) == 2

    admin_repository = main.app.dependency_overrides[get_membership_admin_repository]()
    actions = [event["action"] for event in admin_repository.audit_events]
    assert actions == ["membership.suspended", "membership.restored"]


def test_member_revoke_is_idempotent_and_revoked_cannot_be_restored(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, org_a, _org_b = identity_stack
    member_id, profile_id = _add_member(
        repository, subject="user_rev", workos_membership_id="membership_rev"
    )
    base = f"/api/organizations/{org_a.organization_id}/members/{member_id}"

    revoked = client.delete(base)
    assert revoked.status_code == 200
    assert revoked.json()["state"] == "revoked"
    assert provider.membership_actions == [("delete", "membership_rev")]
    membership = repository.memberships[(org_a.organization_id, profile_id)]
    assert membership["state"] == "revoked"
    assert membership["revoked_at"] is not None

    repeated = client.delete(base)
    assert repeated.status_code == 200
    assert provider.membership_actions == [("delete", "membership_rev")]

    restore_blocked = client.post(f"{base}/restore")
    assert restore_blocked.status_code == 409


def test_member_lifecycle_authorization_boundaries(identity_stack: tuple[Any, ...]) -> None:
    client, repository, provider, org_a, org_b = identity_stack
    member_id, _profile = _add_member(
        repository, subject="user_target", workos_membership_id="membership_target"
    )
    owner_member_id, _owner_profile = _add_member(
        repository,
        subject="user_second_owner",
        role=OrganizationRole.OWNER,
        workos_membership_id="membership_second_owner",
    )
    base = f"/api/organizations/{org_a.organization_id}/members"

    # An admin may manage ordinary members but never an owner's membership.
    repository.memberships[(org_a.organization_id, org_a.profile_id)]["role"] = "admin"
    assert client.post(f"{base}/{owner_member_id}/suspend").status_code == 403
    assert client.delete(f"{base}/{owner_member_id}").status_code == 403
    assert (
        client.patch(f"{base}/{owner_member_id}", json={"role": "member"}).status_code == 403
    )

    # Builder and below hold no member-administration permissions at all.
    repository.memberships[(org_a.organization_id, org_a.profile_id)]["role"] = "builder"
    assert client.post(f"{base}/{member_id}/suspend").status_code == 403
    repository.memberships[(org_a.organization_id, org_a.profile_id)]["role"] = "owner"

    # Administrative actions can never target the actor's own membership.
    own_membership_id = str(
        repository.memberships[(org_a.organization_id, org_a.profile_id)]["id"]
    )
    assert client.post(f"{base}/{own_membership_id}/suspend").status_code == 409
    assert client.delete(f"{base}/{own_membership_id}").status_code == 409

    # Unknown and cross-organization member identifiers are indistinguishable.
    assert client.delete(f"{base}/does-not-exist").status_code == 404
    org_b_member_id, _ = _add_member(
        repository,
        subject="user_other_org",
        workos_org="org_b",
        workos_membership_id="membership_other_org",
    )
    assert client.delete(f"{base}/{org_b_member_id}").status_code == 404

    # Mutations without CSRF are rejected before any provider call.
    provider.membership_actions.clear()
    del client.headers["X-CSRF-Token"]
    assert client.post(f"{base}/{member_id}/suspend").status_code == 403
    client.headers["X-CSRF-Token"] = "csrf-test-token"
    assert provider.membership_actions == []


def test_member_lifecycle_provider_failure_leaves_canonical_state_unchanged(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, org_a, _org_b = identity_stack
    member_id, profile_id = _add_member(
        repository, subject="user_fail", workos_membership_id="membership_fail"
    )
    provider.membership_error = RuntimeError("provider unavailable")

    response = client.post(
        f"/api/organizations/{org_a.organization_id}/members/{member_id}/suspend"
    )

    assert response.status_code == 502
    assert repository.memberships[(org_a.organization_id, profile_id)]["state"] == "active"


def test_member_without_stored_provider_link_is_resolved_before_mutation(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, org_a, _org_b = identity_stack
    member_id, _profile = _add_member(repository, subject="user_unlinked")
    provider.findable_memberships[("user_unlinked", "org_a")] = {"id": "membership_found"}

    response = client.post(
        f"/api/organizations/{org_a.organization_id}/members/{member_id}/suspend"
    )

    assert response.status_code == 200
    assert provider.membership_actions == [("deactivate", "membership_found")]


def _membership_event(
    event_id: str,
    *,
    action: str = "updated",
    membership_id: str = "membership_hook",
    workos_org: str = "org_a",
    subject: str = "user_hook",
    status_value: str = "active",
    role_slug: str = "member",
    updated_at: str,
) -> dict[str, Any]:
    return {
        "id": event_id,
        "event": f"organization_membership.{action}",
        "created_at": updated_at,
        "data": {
            "id": membership_id,
            "organization_id": workos_org,
            "user_id": subject,
            "status": status_value,
            "role": {"slug": role_slug},
            "updated_at": updated_at,
        },
    }


def _post_webhook(client: Any, provider: FakeWorkOSProvider, event: dict[str, Any]):
    provider.webhook_event = event
    return client.post(
        "/api/webhooks/workos",
        content=json.dumps(event).encode(),
        headers={"WorkOS-Signature": "valid"},
    )


def test_stale_membership_webhook_cannot_resurrect_revoked_access(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, org_a, _org_b = identity_stack
    _member_id, profile_id = _add_member(
        repository, subject="user_hook", workos_membership_id="membership_hook"
    )
    key = (org_a.organization_id, profile_id)

    revoke = _post_webhook(
        client,
        provider,
        _membership_event("evt_revoke", action="deleted", status_value="inactive", updated_at="2026-07-12T10:00:00Z"),
    )
    assert revoke.status_code == 200
    assert repository.memberships[key]["state"] == "revoked"

    stale_activate = _post_webhook(
        client,
        provider,
        _membership_event("evt_stale", status_value="active", updated_at="2026-07-12T09:00:00Z"),
    )
    assert stale_activate.status_code == 200
    assert repository.memberships[key]["state"] == "revoked", (
        "an out-of-order membership event must not resurrect revoked access"
    )

    replay = _post_webhook(
        client,
        provider,
        _membership_event("evt_revoke", action="deleted", status_value="inactive", updated_at="2026-07-12T10:00:00Z"),
    )
    assert replay.status_code == 200
    assert replay.json()["duplicate"] is True
    assert repository.memberships[key]["state"] == "revoked"


def test_membership_webhook_preserves_restricted_state_and_unknown_role_fails_closed(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, org_a, _org_b = identity_stack
    _member_id, profile_id = _add_member(
        repository, subject="user_hook", workos_membership_id="membership_hook"
    )
    key = (org_a.organization_id, profile_id)
    repository.memberships[key]["state"] = "suspended"
    repository.memberships[key]["updated_at"] = "2026-07-12T08:00:00Z"

    active = _post_webhook(
        client,
        provider,
        _membership_event(
            "evt_active_newer",
            status_value="active",
            role_slug="future-super-admin",
            updated_at="2026-07-12T09:00:00Z",
        ),
    )
    assert active.status_code == 200
    assert repository.memberships[key]["state"] == "suspended"
    assert repository.memberships[key]["role"] == "viewer"

    inactive = _post_webhook(
        client,
        provider,
        _membership_event(
            "evt_inactive_newer", status_value="inactive", updated_at="2026-07-12T10:00:00Z"
        ),
    )
    assert inactive.status_code == 200
    assert repository.memberships[key]["state"] == "suspended"

    deleted = _post_webhook(
        client,
        provider,
        _membership_event(
            "evt_deleted_newer",
            action="deleted",
            status_value="inactive",
            updated_at="2026-07-12T11:00:00Z",
        ),
    )
    assert deleted.status_code == 200
    assert repository.memberships[key]["state"] == "revoked"


def test_membership_webhook_for_one_organization_cannot_mutate_another(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, org_a, org_b = identity_stack
    _a_member, profile_id = _add_member(
        repository, subject="user_cross", workos_membership_id="membership_cross_a"
    )
    _b_member, profile_id_b = _add_member(
        repository,
        subject="user_cross",
        workos_org="org_b",
        workos_membership_id="membership_cross_b",
    )
    assert profile_id == profile_id_b

    response = _post_webhook(
        client,
        provider,
        _membership_event(
            "evt_cross",
            membership_id="membership_cross_a",
            subject="user_cross",
            status_value="inactive",
            updated_at="2026-07-12T11:00:00Z",
        ),
    )

    assert response.status_code == 200
    assert repository.memberships[(org_a.organization_id, profile_id)]["state"] == "suspended"
    assert repository.memberships[(org_b.organization_id, profile_id)]["state"] == "active", (
        "a webhook scoped to organization A must never mutate organization B membership"
    )


def test_webhook_with_invalid_signature_or_unknown_type_causes_no_mutation(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, provider, org_a, _org_b = identity_stack
    _member_id, profile_id = _add_member(
        repository, subject="user_hook2", workos_membership_id="membership_hook2"
    )
    key = (org_a.organization_id, profile_id)
    event = _membership_event(
        "evt_bad",
        membership_id="membership_hook2",
        subject="user_hook2",
        status_value="inactive",
        updated_at="2026-07-12T12:00:00Z",
    )

    provider.webhook_event = event
    bad_signature = client.post(
        "/api/webhooks/workos",
        content=json.dumps(event).encode(),
        headers={"WorkOS-Signature": "forged"},
    )
    assert bad_signature.status_code == 400
    assert repository.memberships[key]["state"] == "active"
    assert not repository.webhooks

    unknown = dict(event, event="organization_membership.exploded", id="evt_unknown")
    provider.webhook_event = unknown
    unknown_response = client.post(
        "/api/webhooks/workos",
        content=json.dumps(unknown).encode(),
        headers={"WorkOS-Signature": "valid"},
    )
    assert unknown_response.status_code == 400
    assert repository.memberships[key]["state"] == "active"
    assert not repository.webhooks

    missing_signature = client.post(
        "/api/webhooks/workos", content=json.dumps(event).encode()
    )
    assert missing_signature.status_code == 400
    assert repository.memberships[key]["state"] == "active"


def test_switch_uses_canonical_role_not_provider_claim(identity_stack: tuple[Any, ...]) -> None:
    client, _repository, _provider, _org_a, org_b = identity_stack

    # The provider session for org_b claims the owner role; the canonical
    # membership is member. The canonical database must win.
    response = client.post("/api/organizations/switch", json={"organizationId": "org_b"})

    assert response.status_code == 200
    assert response.json() == {
        "organizationId": org_b.organization_id,
        "workosOrganizationId": "org_b",
        "role": "member",
    }

    session = client.get("/api/auth/session")
    assert session.status_code == 200
    assert session.json()["role"] == "member"
    assert "manage_owner_lifecycle" not in session.json()["permissions"]


def test_suspension_in_one_organization_preserves_the_other(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, _provider, org_a, org_b = identity_stack
    repository.memberships[(org_a.organization_id, org_a.profile_id)]["state"] = "suspended"

    # Every request scoped to the suspended organization fails closed, even
    # though the WorkOS session cookie itself is still valid.
    denied = client.get("/api/auth/session")
    assert denied.status_code == 403

    # The same human's membership in organization B is untouched: a session
    # scoped to B (fresh login or another tab) works and carries B's role.
    client.cookies.set("beyond_session", "sealed-b")
    other_org = client.get("/api/auth/session")
    assert other_org.status_code == 200
    assert other_org.json()["organizationId"] == org_b.organization_id
    assert other_org.json()["role"] == "member"


def test_revocation_in_one_organization_preserves_the_other(
    identity_stack: tuple[Any, ...],
) -> None:
    client, repository, _provider, org_a, org_b = identity_stack
    membership = repository.memberships[(org_a.organization_id, org_a.profile_id)]
    membership["state"] = "revoked"
    membership["revoked_at"] = "2026-07-12T00:00:00+00:00"

    assert client.get("/api/auth/session").status_code == 403
    assert client.get(f"/api/organizations/{org_a.organization_id}/members").status_code == 403

    client.cookies.set("beyond_session", "sealed-b")
    surviving = client.get("/api/auth/session")
    assert surviving.status_code == 200
    assert surviving.json()["organizationId"] == org_b.organization_id


def test_owner_privileges_do_not_cross_organizations(identity_stack: tuple[Any, ...]) -> None:
    client, repository, _provider, org_a, org_b = identity_stack
    org_b_member_id, _profile = _add_member(
        repository,
        subject="user_b_target",
        workos_org="org_b",
        workos_membership_id="membership_b_target",
    )

    # While scoped to organization A (as its owner), organization B resources
    # are indistinguishable from nonexistent ones.
    assert client.get(f"/api/organizations/{org_b.organization_id}/members").status_code == 404
    assert (
        client.delete(
            f"/api/organizations/{org_b.organization_id}/members/{org_b_member_id}"
        ).status_code
        == 404
    )

    # After switching to organization B, the same human is only a member:
    # the directory renders, but member administration is denied there.
    switched = client.post("/api/organizations/switch", json={"organizationId": "org_b"})
    assert switched.status_code == 200
    client.cookies.set("beyond_session", "sealed-b")
    directory = client.get(f"/api/organizations/{org_b.organization_id}/members")
    assert directory.status_code == 200
    lifecycle = client.delete(
        f"/api/organizations/{org_b.organization_id}/members/{org_b_member_id}"
    )
    assert lifecycle.status_code == 403
