from __future__ import annotations

import hmac
import logging
import secrets
from typing import Annotated, Any, Literal
from urllib.parse import quote, unquote

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..authorization.policy import (
    OrganizationPermission,
    OrganizationRole,
    Principal,
    organization_permissions,
    require_organization_permission,
    require_role_assignable,
)
from ..config import settings
from .membership_admin import (
    MembershipAdminRepository,
    MembershipAdminService,
    SupabaseMembershipAdminRepository,
)
from .repository import (
    IdentityRepository,
    IdentitySnapshot,
    SupabaseIdentityRepository,
    normalize_email,
    normalize_role,
)
from .workos_service import WorkOSProvider, WorkOSSession, configured_workos_service


router = APIRouter(prefix="/api", tags=["identity"])
LOGGER = logging.getLogger("beyond_chat.identity")

# Exactly the lifecycle event names the installed WorkOS SDK emits for the
# resources Phase 2 reconciles (workos.types.events literals). WorkOS does not
# emit "invitation.expired" — expiry is derived locally from expires_at. The
# ``invitation.resent`` is normalized to pending without regressing terminal
# invitation states.
_WORKOS_EVENT_TYPES = frozenset(
    f"{resource}.{action}"
    for resource, actions in {
        "organization": ("created", "updated", "deleted"),
        "organization_membership": ("created", "updated", "deleted"),
        "user": ("created", "updated", "deleted"),
        "invitation": ("created", "accepted", "revoked", "resent"),
    }.items()
    for action in actions
)


class OrganizationSwitchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    organization_id: str = Field(min_length=3, max_length=255, alias="organizationId")


class InvitationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    role: OrganizationRole = OrganizationRole.MEMBER

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        try:
            return normalize_email(value)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc


class BulkInvitationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    invitations: list[InvitationRequest] = Field(min_length=1, max_length=50)


class MemberRoleChangeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: OrganizationRole


def get_workos_provider() -> WorkOSProvider:
    try:
        return configured_workos_service()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WorkOS authentication is not configured.",
        ) from exc


def get_identity_repository() -> IdentityRepository:
    return SupabaseIdentityRepository()


def get_membership_admin_repository() -> MembershipAdminRepository:
    return SupabaseMembershipAdminRepository()


def _is_secure_cookie(request: Request) -> bool:
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip()
    return forwarded_proto == "https" or request.url.scheme == "https"


def _set_session_cookie(response: Response, request: Request, value: str) -> None:
    response.set_cookie(
        settings.workos_session_cookie_name,
        value,
        httponly=True,
        secure=_is_secure_cookie(request),
        samesite="lax",
        max_age=604_800,
        path="/",
    )
    response.set_cookie(
        settings.workos_csrf_cookie_name,
        secrets.token_urlsafe(32),
        httponly=False,
        secure=_is_secure_cookie(request),
        samesite="lax",
        max_age=604_800,
        path="/",
    )


def _set_csrf_cookie(response: Response, request: Request) -> None:
    response.set_cookie(
        settings.workos_csrf_cookie_name,
        secrets.token_urlsafe(32),
        httponly=False,
        secure=_is_secure_cookie(request),
        samesite="lax",
        max_age=604_800,
        path="/",
    )


def _delete_session_cookie(response: Response, request: Request) -> None:
    response.delete_cookie(
        settings.workos_session_cookie_name,
        httponly=True,
        secure=_is_secure_cookie(request),
        samesite="lax",
        path="/",
    )
    response.delete_cookie(
        settings.workos_csrf_cookie_name,
        secure=_is_secure_cookie(request),
        samesite="strict",
        path="/",
    )


def _safe_return_to(value: str | None) -> str:
    if not value or not value.startswith("/") or value.startswith("//") or "\\" in value:
        return "/"
    return value


def _pack_state(state: str, return_to: str) -> str:
    return f"{state}.{quote(return_to, safe='/')}"


def _unpack_state(cookie_value: str | None) -> tuple[str, str] | None:
    if not cookie_value or "." not in cookie_value:
        return None
    state, encoded_return_to = cookie_value.split(".", 1)
    if not state:
        return None
    return state, _safe_return_to(unquote(encoded_return_to))


def _user_fields(session: WorkOSSession) -> dict[str, Any]:
    user = session.user
    first_name = user.get("first_name")
    last_name = user.get("last_name")
    display_name = user.get("name") or " ".join(
        str(value) for value in (first_name, last_name) if value
    )
    return {
        "email": user.get("email") if isinstance(user.get("email"), str) else None,
        "email_verified": bool(user.get("email_verified", False)),
        "display_name": display_name or None,
        "avatar_url": user.get("profile_picture_url"),
        "locale": user.get("locale"),
    }


def _principal(snapshot: IdentitySnapshot, session: WorkOSSession) -> Principal:
    return Principal(
        profile_id=snapshot.profile_id,
        subject=snapshot.subject,
        issuer=snapshot.issuer,
        organization_id=snapshot.organization_id,
        workos_organization_id=snapshot.workos_organization_id,
        role=snapshot.role,
        email=snapshot.email,
        session_id=session.session_id,
        token_permissions=session.permissions,
    )


def get_membership_admin_service(
    provider: WorkOSProvider = Depends(get_workos_provider),
    repository: MembershipAdminRepository = Depends(get_membership_admin_repository),
) -> MembershipAdminService:
    return MembershipAdminService(repository, provider)


def require_csrf(
    csrf_cookie: Annotated[str | None, Cookie(alias=settings.workos_csrf_cookie_name)] = None,
    csrf_header: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
) -> None:
    cookie_match = bool(
        csrf_cookie and csrf_header and hmac.compare_digest(csrf_cookie, csrf_header)
    )
    bootstrap_match = _valid_bootstrap_csrf(csrf_header)
    if not cookie_match and not bootstrap_match:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed.")


def _signed_csrf() -> str:
    nonce = secrets.token_urlsafe(32)
    secret = (settings.workos_cookie_password or "").encode()
    signature = hmac.new(secret, nonce.encode(), "sha256").hexdigest()
    return f"{nonce}.{signature}"


def _valid_bootstrap_csrf(value: str | None) -> bool:
    if not value or value.count(".") != 1:
        return False
    nonce, signature = value.rsplit(".", 1)
    return len(nonce) >= 32 and len(signature) == 64


async def require_principal(
    request: Request,
    response: Response,
    sealed_session: Annotated[str | None, Cookie(alias=settings.workos_session_cookie_name)] = None,
    csrf_cookie: Annotated[str | None, Cookie(alias=settings.workos_csrf_cookie_name)] = None,
    provider: WorkOSProvider = Depends(get_workos_provider),
    repository: IdentityRepository = Depends(get_identity_repository),
) -> Principal:
    """Resolve a WorkOS session against current canonical membership state.

    A token role is never authorization state: the internal active membership is
    re-read on every request, making membership webhook revocation immediate.
    """

    if not sealed_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    try:
        session = provider.authenticate_session(sealed_session)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is invalid.") from exc
    if session is None or not session.organization_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is invalid.")
    snapshot = repository.resolve_active_identity(
        issuer=session.issuer,
        subject=session.subject,
        workos_organization_id=session.organization_id,
    )
    if snapshot is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The organization membership is inactive or revoked.",
        )
    if session.sealed_session != sealed_session:
        _set_session_cookie(response, request, session.sealed_session)
    elif not csrf_cookie:
        _set_csrf_cookie(response, request)
    return _principal(snapshot, session)


@router.get("/auth/login")
def login(
    request: Request,
    return_to: str | None = Query(default=None, alias="returnTo", max_length=2048),
    invitation_token: str | None = Query(default=None, alias="invitationToken", max_length=2048),
    organization_id: str | None = Query(default=None, alias="organizationId", max_length=255),
    screen_hint: Literal["sign-up", "sign-in"] | None = Query(default=None, alias="screenHint"),
    provider: WorkOSProvider = Depends(get_workos_provider),
) -> RedirectResponse:
    state = secrets.token_urlsafe(32)
    target = provider.authorization_url(
        state=state,
        return_to=_safe_return_to(return_to),
        invitation_token=invitation_token,
        organization_id=organization_id,
        screen_hint=screen_hint,
    )
    response = RedirectResponse(target, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        settings.workos_state_cookie_name,
        _pack_state(state, _safe_return_to(return_to)),
        httponly=True,
        secure=_is_secure_cookie(request),
        samesite="lax",
        max_age=600,
        path="/api/auth/callback",
    )
    return response


@router.get("/auth/callback")
def callback(
    request: Request,
    code: str = Query(min_length=1, max_length=2048),
    state_value: str = Query(alias="state", min_length=1, max_length=512),
    invitation_token: str | None = Query(default=None, alias="invitation_token"),
    state_cookie: Annotated[str | None, Cookie(alias=settings.workos_state_cookie_name)] = None,
    provider: WorkOSProvider = Depends(get_workos_provider),
    repository: IdentityRepository = Depends(get_identity_repository),
) -> RedirectResponse:
    packed = _unpack_state(state_cookie)
    if packed is None or not hmac.compare_digest(packed[0], state_value):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Authentication state is invalid.")
    try:
        session = provider.exchange_code(code, invitation_token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed.") from exc
    if not session.organization_id:
        try:
            session = provider.provision_starter_organization(session)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Account setup failed.",
            ) from exc
    if not session.organization_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Account setup failed.",
        )
    workos_organization_id = session.organization_id
    try:
        organization = provider.organization(workos_organization_id)
    except Exception:
        LOGGER.exception("Auth callback failed during WorkOS organization lookup.")
        raise
    user_fields = _user_fields(session)
    try:
        repository.sync_authenticated_identity(
            issuer=session.issuer,
            subject=session.subject,
            workos_organization_id=workos_organization_id,
            workos_membership_id=None,
            role=normalize_role(session.role),
            organization_name=organization.get("name"),
            organization_slug=organization.get("slug"),
            **user_fields,
        )
    except Exception:
        LOGGER.exception("Auth callback failed during canonical identity sync.")
        raise
    response = RedirectResponse(packed[1], status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie(settings.workos_state_cookie_name, path="/api/auth/callback")
    _set_session_cookie(response, request, session.sealed_session)
    return response


@router.post("/auth/logout")
def logout(
    request: Request,
    sealed_session: Annotated[str | None, Cookie(alias=settings.workos_session_cookie_name)] = None,
    _csrf: None = Depends(require_csrf),
    provider: WorkOSProvider = Depends(get_workos_provider),
) -> RedirectResponse:
    target = settings.workos_logout_uri
    if sealed_session:
        try:
            target = provider.logout_url(sealed_session)
        except Exception:
            target = settings.workos_logout_uri
    response = RedirectResponse(target, status_code=status.HTTP_303_SEE_OTHER)
    _delete_session_cookie(response, request)
    return response


@router.get("/auth/session")
def session_info(principal: Principal = Depends(require_principal)) -> dict[str, Any]:
    return {
        "profileId": principal.profile_id,
        "email": principal.email,
        "organizationId": principal.organization_id,
        "workosOrganizationId": principal.workos_organization_id,
        "role": principal.role.value,
        "permissions": sorted(
            permission.value for permission in organization_permissions(principal.role)
        ),
    }


@router.get("/auth/csrf")
def csrf_token(
    request: Request,
    response: Response,
    _principal: Principal = Depends(require_principal),
) -> dict[str, str]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    token = _signed_csrf()
    response.set_cookie(
        settings.workos_csrf_cookie_name,
        token,
        httponly=False,
        secure=_is_secure_cookie(request),
        samesite="lax",
        max_age=604_800,
        path="/",
    )
    return {"token": token}


@router.get("/organizations")
def organizations(
    principal: Principal = Depends(require_principal),
    repository: IdentityRepository = Depends(get_identity_repository),
) -> dict[str, Any]:
    return {"items": repository.list_organizations(principal.profile_id)}


def _require_selected_organization(principal: Principal, organization_id: str) -> None:
    if organization_id != principal.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")


@router.get("/organizations/{organization_id}/members")
def organization_members(
    organization_id: str,
    status_filter: Annotated[
        list[Literal["invited", "active", "suspended", "revoked"]] | None,
        Query(alias="status"),
    ] = None,
    cursor: Annotated[str | None, Query(max_length=512)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    principal: Principal = Depends(require_principal),
    repository: IdentityRepository = Depends(get_identity_repository),
) -> dict[str, Any]:
    require_organization_permission(principal, OrganizationPermission.VIEW_MEMBER_DIRECTORY)
    _require_selected_organization(principal, organization_id)
    lifecycle_visible = OrganizationPermission.VIEW_MEMBER_LIFECYCLE in organization_permissions(
        principal.role
    )
    if lifecycle_visible:
        states = frozenset(status_filter or ("invited", "active", "suspended", "revoked"))
    else:
        # The plain directory never exposes lifecycle states beyond active
        # membership, so a non-admin cannot enumerate suspended or revoked
        # colleagues or their timestamps.
        if status_filter and set(status_filter) != {"active"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Member lifecycle visibility requires an administrative role.",
            )
        states = frozenset({"active"})
    try:
        page = repository.list_members(
            principal=_snapshot_from_principal(principal),
            states=states,
            cursor=cursor,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    items = page.items
    if not lifecycle_visible:
        items = [
            {
                "id": item.get("id"),
                "displayName": item.get("displayName"),
                "email": item.get("email"),
                "avatarUrl": item.get("avatarUrl"),
                "role": item.get("role"),
            }
            for item in items
        ]
    return {"items": items, "nextCursor": page.next_cursor}


@router.get("/organizations/{organization_id}/invitations")
def organization_invitations(
    organization_id: str,
    status_filter: Annotated[
        list[Literal["pending", "accepted", "revoked", "expired"]] | None,
        Query(alias="status"),
    ] = None,
    cursor: Annotated[str | None, Query(max_length=512)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    principal: Principal = Depends(require_principal),
    repository: IdentityRepository = Depends(get_identity_repository),
) -> dict[str, Any]:
    require_organization_permission(principal, OrganizationPermission.VIEW_MEMBER_LIFECYCLE)
    _require_selected_organization(principal, organization_id)
    try:
        page = repository.list_invitations(
            principal=_snapshot_from_principal(principal),
            states=frozenset(status_filter or ("pending", "accepted", "revoked", "expired")),
            cursor=cursor,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"items": page.items, "nextCursor": page.next_cursor}


@router.post("/organizations/switch")
def switch_organization(
    payload: OrganizationSwitchRequest,
    request: Request,
    response: Response,
    principal: Principal = Depends(require_principal),
    _csrf: None = Depends(require_csrf),
    sealed_session: Annotated[str | None, Cookie(alias=settings.workos_session_cookie_name)] = None,
    provider: WorkOSProvider = Depends(get_workos_provider),
    repository: IdentityRepository = Depends(get_identity_repository),
) -> dict[str, Any]:
    allowed = {
        item["workosOrganizationId"]
        for item in repository.list_organizations(principal.profile_id)
        if item.get("workosOrganizationId")
    }
    if payload.organization_id not in allowed or not sealed_session:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization access denied.")
    session = provider.authenticate_session(sealed_session, organization_id=payload.organization_id)
    if session is None or session.organization_id != payload.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization access denied.")
    snapshot = repository.resolve_active_identity(
        issuer=session.issuer,
        subject=session.subject,
        workos_organization_id=payload.organization_id,
    )
    if snapshot is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization access denied.")
    _set_session_cookie(response, request, session.sealed_session)
    return {
        "organizationId": snapshot.organization_id,
        "workosOrganizationId": snapshot.workos_organization_id,
        "role": snapshot.role.value,
    }


@router.patch("/organizations/{organization_id}/members/{member_id}")
def change_member_role(
    organization_id: str,
    member_id: str,
    payload: MemberRoleChangeRequest,
    principal: Principal = Depends(require_principal),
    _csrf: None = Depends(require_csrf),
    service: MembershipAdminService = Depends(get_membership_admin_service),
) -> dict[str, Any]:
    _require_selected_organization(principal, organization_id)
    return service.change_role(principal, member_id, payload.role).as_response()


@router.post("/organizations/{organization_id}/members/{member_id}/suspend")
def suspend_member(
    organization_id: str,
    member_id: str,
    principal: Principal = Depends(require_principal),
    _csrf: None = Depends(require_csrf),
    service: MembershipAdminService = Depends(get_membership_admin_service),
) -> dict[str, Any]:
    _require_selected_organization(principal, organization_id)
    return service.suspend(principal, member_id).as_response()


@router.post("/organizations/{organization_id}/members/{member_id}/restore")
def restore_member(
    organization_id: str,
    member_id: str,
    principal: Principal = Depends(require_principal),
    _csrf: None = Depends(require_csrf),
    service: MembershipAdminService = Depends(get_membership_admin_service),
) -> dict[str, Any]:
    _require_selected_organization(principal, organization_id)
    return service.restore(principal, member_id).as_response()


@router.delete("/organizations/{organization_id}/members/{member_id}")
def revoke_member(
    organization_id: str,
    member_id: str,
    principal: Principal = Depends(require_principal),
    _csrf: None = Depends(require_csrf),
    service: MembershipAdminService = Depends(get_membership_admin_service),
) -> dict[str, Any]:
    _require_selected_organization(principal, organization_id)
    return service.revoke(principal, member_id).as_response()


@router.post("/invitations", status_code=status.HTTP_201_CREATED)
def invite(
    payload: InvitationRequest,
    principal: Principal = Depends(require_principal),
    _csrf: None = Depends(require_csrf),
    provider: WorkOSProvider = Depends(get_workos_provider),
    repository: IdentityRepository = Depends(get_identity_repository),
) -> dict[str, Any]:
    require_organization_permission(principal, OrganizationPermission.INVITE_MEMBERS)
    require_role_assignable(principal, payload.role)
    result = provider.send_invitation(
        email=payload.email,
        organization_id=principal.workos_organization_id,
        role=payload.role.value,
        inviter_user_id=principal.subject,
    )
    return repository.save_invitation(
        principal=_snapshot_from_principal(principal),
        invitation=result,
        email=payload.email,
        role=payload.role,
    )


@router.post("/invitations/bulk", status_code=status.HTTP_201_CREATED)
def bulk_invite(
    payload: BulkInvitationRequest,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key", min_length=8, max_length=255)],
    principal: Principal = Depends(require_principal),
    _csrf: None = Depends(require_csrf),
    provider: WorkOSProvider = Depends(get_workos_provider),
    repository: IdentityRepository = Depends(get_identity_repository),
) -> dict[str, Any]:
    require_organization_permission(principal, OrganizationPermission.INVITE_MEMBERS)
    for item in payload.invitations:
        require_role_assignable(principal, item.role)
    snapshot = _snapshot_from_principal(principal)
    existing = repository.get_bulk_invite(principal=snapshot, idempotency_key=idempotency_key)
    if existing is not None:
        return existing
    entries: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in payload.invitations:
        if item.email in seen:
            entries.append(
                {
                    "email": item.email,
                    "role": item.role.value,
                    "error_code": "duplicate_email",
                    "error_message": "Email appears more than once in this request.",
                }
            )
            continue
        seen.add(item.email)
        try:
            provider_invitation = provider.send_invitation(
                email=item.email,
                organization_id=principal.workos_organization_id,
                role=item.role.value,
                inviter_user_id=principal.subject,
            )
            local = repository.save_invitation(
                principal=snapshot,
                invitation=provider_invitation,
                email=item.email,
                role=item.role,
            )
            entries.append({"email": item.email, "role": item.role.value, "invitation": local})
        except Exception as exc:
            entries.append(
                {
                    "email": item.email,
                    "role": item.role.value,
                    "error_code": type(exc).__name__,
                    "error_message": "Invitation could not be created.",
                }
            )
    return repository.save_bulk_invite(
        principal=snapshot,
        idempotency_key=idempotency_key,
        entries=entries,
    )


@router.delete("/invitations/{invitation_id}")
def revoke_invitation(
    invitation_id: str,
    principal: Principal = Depends(require_principal),
    _csrf: None = Depends(require_csrf),
    provider: WorkOSProvider = Depends(get_workos_provider),
    repository: IdentityRepository = Depends(get_identity_repository),
) -> Response:
    require_organization_permission(principal, OrganizationPermission.INVITE_MEMBERS)
    snapshot = _snapshot_from_principal(principal)
    invitation = repository.get_invitation(principal=snapshot, invitation_id=invitation_id)
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")
    provider_id = invitation.get("workos_invitation_id")
    if not isinstance(provider_id, str) or not provider_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invitation is not provider-backed.")
    result = provider.revoke_invitation(provider_id)
    repository.save_invitation(
        principal=snapshot,
        invitation={**result, "id": provider_id, "state": "revoked"},
        email=str(invitation["email"]),
        role=normalize_role(invitation.get("role")),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/webhooks/workos")
async def workos_webhook(
    request: Request,
    workos_signature: Annotated[str | None, Header(alias="WorkOS-Signature")] = None,
    provider: WorkOSProvider = Depends(get_workos_provider),
    repository: IdentityRepository = Depends(get_identity_repository),
) -> dict[str, Any]:
    if not workos_signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook signature required.")
    payload = await request.body()
    try:
        event = provider.verify_webhook(payload, workos_signature)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook is invalid.") from exc
    if event.get("event") not in _WORKOS_EVENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook is invalid.")
    try:
        receipt = repository.receive_webhook(event)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook is invalid.") from exc
    if receipt.inserted or receipt.state != "processed":
        repository.process_webhook(receipt.event_id)
    return {"received": True, "duplicate": not receipt.inserted}


def _snapshot_from_principal(principal: Principal) -> IdentitySnapshot:
    return IdentitySnapshot(
        profile_id=principal.profile_id,
        issuer=principal.issuer,
        subject=principal.subject,
        email=principal.email,
        organization_id=principal.organization_id,
        workos_organization_id=principal.workos_organization_id,
        organization_name="",
        role=principal.role,
        membership_state="active",
    )
