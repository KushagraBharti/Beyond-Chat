from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from src import main
from src.authorization.policy import OrganizationRole
from src.config import Settings
from src.identity.authkit import get_identity_repository, get_workos_provider
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

    main.app.dependency_overrides[get_identity_repository] = lambda: repository
    main.app.dependency_overrides[get_workos_provider] = lambda: provider
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
    assert response.json() == {
        "profileId": org_a.profile_id,
        "email": "member@example.com",
        "organizationId": org_a.organization_id,
        "workosOrganizationId": "org_a",
        "role": "owner",
    }


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
    denied = client.get(f"/api/organizations/{org_a.organization_id}/members")
    assert denied.status_code == 403


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


def test_admin_cannot_assign_owner_role(identity_stack: tuple[Any, ...]) -> None:
    client, repository, provider, org_a, _org_b = identity_stack
    repository.memberships[(org_a.organization_id, org_a.profile_id)]["role"] = "admin"

    response = client.post(
        "/api/invitations",
        json={"email": "future-owner@example.com", "role": "owner"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Only an organization owner can assign the owner role."
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
