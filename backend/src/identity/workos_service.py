from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any, Protocol

from ..config import Settings, settings


@dataclass(frozen=True)
class WorkOSSession:
    sealed_session: str
    issuer: str
    subject: str
    session_id: str
    organization_id: str | None
    role: str | None
    permissions: frozenset[str]
    user: dict[str, Any]


class WorkOSProvider(Protocol):
    def authorization_url(
        self,
        *,
        state: str,
        return_to: str,
        invitation_token: str | None = None,
        organization_id: str | None = None,
        screen_hint: str | None = None,
    ) -> str: ...

    def exchange_code(self, code: str, invitation_token: str | None = None) -> WorkOSSession: ...

    def authenticate_session(
        self, sealed_session: str, *, organization_id: str | None = None
    ) -> WorkOSSession | None: ...

    def provision_starter_organization(self, session: WorkOSSession) -> WorkOSSession: ...

    def logout_url(self, sealed_session: str) -> str: ...

    def organization(self, organization_id: str) -> dict[str, Any]: ...

    def send_invitation(
        self, *, email: str, organization_id: str, role: str, inviter_user_id: str
    ) -> dict[str, Any]: ...

    def revoke_invitation(self, invitation_id: str) -> dict[str, Any]: ...

    def find_membership(self, *, user_id: str, organization_id: str) -> dict[str, Any] | None: ...

    def update_membership_role(self, membership_id: str, role: str) -> dict[str, Any]: ...

    def deactivate_membership(self, membership_id: str) -> dict[str, Any]: ...

    def reactivate_membership(self, membership_id: str) -> dict[str, Any]: ...

    def delete_membership(self, membership_id: str) -> None: ...

    def verify_webhook(self, payload: bytes, signature: str) -> dict[str, Any]: ...


def _model_dict(value: object) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    to_dict = getattr(value, "to_dict", None)
    if callable(to_dict):
        data = to_dict()
        if isinstance(data, dict):
            return data
    raise RuntimeError(f"Unexpected WorkOS response type: {type(value).__name__}")


class WorkOSService:
    """Narrow AuthKit adapter; secrets and refresh tokens remain in sealed HTTP-only cookies."""

    def __init__(self, config: Settings = settings) -> None:
        if not config.workos_api_key or not config.workos_client_id or not config.workos_cookie_password:
            raise RuntimeError(
                "WorkOS requires WORKOS_API_KEY, WORKOS_CLIENT_ID, and WORKOS_COOKIE_PASSWORD."
            )
        from workos import WorkOSClient

        self._client = WorkOSClient(
            api_key=config.workos_api_key,
            client_id=config.workos_client_id,
        )
        self._client_id = config.workos_client_id
        self._cookie_password = config.workos_cookie_password
        self._redirect_uri = config.workos_redirect_uri
        self._logout_uri = config.workos_logout_uri
        self._webhook_secret = config.workos_webhook_secret
        self._expected_issuer = config.workos_issuer.rstrip("/")

    def authorization_url(
        self,
        *,
        state: str,
        return_to: str,
        invitation_token: str | None = None,
        organization_id: str | None = None,
        screen_hint: str | None = None,
    ) -> str:
        del return_to  # The validated return path is stored in the state cookie, not provider state.
        return self._client.user_management.get_authorization_url(
            provider="authkit",
            redirect_uri=self._redirect_uri,
            state=state,
            invitation_token=invitation_token,
            organization_id=organization_id,
            screen_hint=screen_hint,
        )

    def _claims_from_sealed(self, sealed_session: str, result: object) -> WorkOSSession:
        # Session.authenticate()/refresh() has already verified the JWT signature
        # and expiry through the WorkOS SDK. Avoid a second unverified JWT decode;
        # the sealed user ID is the canonical WorkOS subject for this client.
        user = getattr(result, "user", None) or {}
        if not isinstance(user, dict):
            user = _model_dict(user)
        subject = str(user.get("id") or "")
        session_id = str(getattr(result, "session_id", None) or "")
        if not subject or not session_id:
            raise RuntimeError("WorkOS session omitted the user or session identifier.")
        return WorkOSSession(
            sealed_session=sealed_session,
            issuer=self._expected_issuer,
            subject=subject,
            session_id=session_id,
            organization_id=getattr(result, "organization_id", None),
            role=getattr(result, "role", None),
            permissions=frozenset(getattr(result, "permissions", None) or ()),
            user=user,
        )

    def exchange_code(self, code: str, invitation_token: str | None = None) -> WorkOSSession:
        from workos.session import seal_session_from_auth_response

        response = self._client.user_management.authenticate_with_code(
            code=code,
            invitation_token=invitation_token,
        )
        user = _model_dict(response.user)
        impersonator = _model_dict(response.impersonator) if response.impersonator else None
        sealed = seal_session_from_auth_response(
            access_token=response.access_token,
            refresh_token=response.refresh_token,
            user=user,
            impersonator=impersonator,
            cookie_password=self._cookie_password,
        )
        session = self._client.user_management.load_sealed_session(
            session_data=sealed,
            cookie_password=self._cookie_password,
        )
        result = session.authenticate()
        if not result.authenticated:
            raise RuntimeError("WorkOS returned a session that failed local verification.")
        return self._claims_from_sealed(sealed, result)

    def authenticate_session(
        self, sealed_session: str, *, organization_id: str | None = None
    ) -> WorkOSSession | None:
        session = self._client.user_management.load_sealed_session(
            session_data=sealed_session,
            cookie_password=self._cookie_password,
        )
        if organization_id is None:
            result = session.authenticate()
            if result.authenticated:
                return self._claims_from_sealed(sealed_session, result)
        refreshed = session.refresh(organization_id=organization_id)
        if not refreshed.authenticated:
            return None
        return self._claims_from_sealed(refreshed.sealed_session, refreshed)

    def provision_starter_organization(self, session: WorkOSSession) -> WorkOSSession:
        """Idempotently provision and select a private organization for a new user."""
        from workos import ConflictError, NotFoundError, UnprocessableEntityError
        from workos.organization_membership import RoleSingle

        external_id = f"beyond-personal-{hashlib.sha256(session.subject.encode()).hexdigest()[:24]}"
        def safe_name(value: object) -> str:
            printable = "".join(character for character in str(value or "") if character.isprintable())
            return " ".join(printable.split())

        user_name = safe_name(session.user.get("name"))
        if not user_name:
            first_name = safe_name(session.user.get("first_name"))
            last_name = safe_name(session.user.get("last_name"))
            user_name = " ".join(part for part in (first_name, last_name) if part)
        if not user_name:
            email = str(session.user.get("email") or "")
            user_name = safe_name(email.partition("@")[0])
        organization_name = f"{user_name[:80] or 'Personal'}'s workspace"

        try:
            organization = self._client.organizations.get_organization_by_external_id(external_id)
        except NotFoundError:
            try:
                organization = self._client.organizations.create_organization(
                    name=organization_name,
                    allow_profiles_outside_organization=False,
                    external_id=external_id,
                    metadata={"beyond_owner_user_id": session.subject, "beyond_kind": "personal"},
                )
            except (ConflictError, UnprocessableEntityError):
                # A retried or concurrent callback may have won creation.
                organization = self._client.organizations.get_organization_by_external_id(external_id)

        organization_data = _model_dict(organization)
        organization_id = str(organization_data.get("id") or "")
        if not organization_id:
            raise RuntimeError("WorkOS organization provisioning returned no identifier.")

        try:
            self._client.organization_membership.create_organization_membership(
                user_id=session.subject,
                organization_id=organization_id,
                role=RoleSingle(role_slug="owner"),
            )
        except (ConflictError, UnprocessableEntityError):
            memberships = self._client.organization_membership.list_organization_memberships(
                organization_id=organization_id,
                user_id=session.subject,
                statuses=["active"],
                limit=10,
            )
            if not getattr(memberships, "data", None):
                raise

        refreshed = self.authenticate_session(
            session.sealed_session,
            organization_id=organization_id,
        )
        if refreshed is None or refreshed.organization_id != organization_id:
            raise RuntimeError("WorkOS session could not select the provisioned organization.")
        return refreshed

    def logout_url(self, sealed_session: str) -> str:
        session = self._client.user_management.load_sealed_session(
            session_data=sealed_session,
            cookie_password=self._cookie_password,
        )
        return session.get_logout_url(return_to=self._logout_uri)

    def organization(self, organization_id: str) -> dict[str, Any]:
        return _model_dict(self._client.organizations.get_organization(organization_id))

    def send_invitation(
        self, *, email: str, organization_id: str, role: str, inviter_user_id: str
    ) -> dict[str, Any]:
        invitation = self._client.user_management.send_invitation(
            email=email,
            organization_id=organization_id,
            role_slug=role,
            inviter_user_id=inviter_user_id,
        )
        return _model_dict(invitation)

    def revoke_invitation(self, invitation_id: str) -> dict[str, Any]:
        return _model_dict(self._client.user_management.revoke_invitation(invitation_id))

    def find_membership(self, *, user_id: str, organization_id: str) -> dict[str, Any] | None:
        memberships = self._client.organization_membership.list_organization_memberships(
            user_id=user_id,
            organization_id=organization_id,
            statuses=["active", "inactive", "pending"],
            limit=1,
        )
        rows = getattr(memberships, "data", None) or []
        return _model_dict(rows[0]) if rows else None

    def update_membership_role(self, membership_id: str, role: str) -> dict[str, Any]:
        from workos.organization_membership import RoleSingle

        return _model_dict(
            self._client.organization_membership.update_organization_membership(
                membership_id,
                role=RoleSingle(role_slug=role),
            )
        )

    def deactivate_membership(self, membership_id: str) -> dict[str, Any]:
        return _model_dict(
            self._client.organization_membership.deactivate_organization_membership(membership_id)
        )

    def reactivate_membership(self, membership_id: str) -> dict[str, Any]:
        return _model_dict(
            self._client.organization_membership.reactivate_organization_membership(membership_id)
        )

    def delete_membership(self, membership_id: str) -> None:
        self._client.organization_membership.delete_organization_membership(membership_id)

    def verify_webhook(self, payload: bytes, signature: str) -> dict[str, Any]:
        if not self._webhook_secret:
            raise RuntimeError("WORKOS_WEBHOOK_SECRET is not configured.")
        return _model_dict(
            self._client.webhooks.verify_event(
                event_body=payload,
                event_signature=signature,
                secret=self._webhook_secret,
            )
        )


def configured_workos_service() -> WorkOSService:
    return WorkOSService(settings)
