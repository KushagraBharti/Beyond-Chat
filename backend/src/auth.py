from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import Header, HTTPException, Request, status
from jwt import InvalidTokenError, PyJWKClient
from jwt.exceptions import PyJWKClientError

from .config import settings
from .supabase_service import supabase_service


@dataclass(frozen=True)
class RequestContext:
    user_id: str
    workspace_id: str
    email: str | None
    source: str
    access_token: str | None = None


def _extract_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must be a Bearer token.",
        )
    return token


def _decode_supabase_claims(token: str) -> dict[str, Any]:
    try:
        header = jwt.get_unverified_header(token)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase JWT header could not be parsed.",
        ) from exc

    algorithm = header.get("alg")

    if settings.supabase_jwt_secret and algorithm == "HS256":
        try:
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        except InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Supabase JWT could not be verified.",
            ) from exc

    if not settings.supabase_jwks_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase JWT verification is not configured on the backend.",
        )

    try:
        signing_key = PyJWKClient(settings.supabase_jwks_url).get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[algorithm] if isinstance(algorithm, str) else None,
            options={"verify_aud": False},
        )
    except (InvalidTokenError, PyJWKClientError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase JWT could not be verified.",
        ) from exc


def _workspace_from_claims(claims: dict[str, Any], requested_workspace_id: str | None) -> str | None:
    app_metadata = claims.get("app_metadata")
    if isinstance(app_metadata, dict):
        workspace_id = app_metadata.get("workspace_id")
        if isinstance(workspace_id, str) and workspace_id:
            return workspace_id

    user_metadata = claims.get("user_metadata")
    if isinstance(user_metadata, dict):
        workspace_id = user_metadata.get("workspace_id")
        if isinstance(workspace_id, str) and workspace_id:
            return workspace_id

    if requested_workspace_id:
        return requested_workspace_id

    return None


async def require_request_context(
    request: Request,
    authorization: str | None = Header(default=None),
    x_workspace_id: str | None = Header(default=None),
    x_mvp_bypass: str | None = Header(default=None),
) -> RequestContext:
    cached_context = getattr(request.state, "request_context", None)
    if isinstance(cached_context, RequestContext):
        return cached_context

    cached_error = getattr(request.state, "request_context_error", None)
    if isinstance(cached_error, HTTPException):
        raise cached_error

    return resolve_request_context(authorization, x_workspace_id, x_mvp_bypass)


def resolve_request_context(
    authorization: str | None,
    x_workspace_id: str | None,
    x_mvp_bypass: str | None = None,
) -> RequestContext:
    if settings.allow_local_auth_bypass and (x_mvp_bypass or "").lower() == "true":
        return RequestContext(
            user_id="local-dev-user",
            workspace_id=x_workspace_id or settings.local_workspace_id,
            email="local@beyond-chat.dev",
            source="local_bypass",
            access_token=None,
        )

    token = _extract_token(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required for this endpoint.",
        )

    claims = _decode_supabase_claims(token)
    user_id = claims.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase JWT is missing the user identifier.",
        )
    email = claims.get("email")
    workspace_id = _workspace_from_claims(claims, x_workspace_id)
    if workspace_id is None:
        resolved = supabase_service.resolve_workspace_for_user(
            user_id,
            requested_workspace_id=x_workspace_id,
            access_token=token,
        )
        if resolved and isinstance(resolved.get("workspace"), dict):
            candidate = resolved["workspace"].get("id")
            if isinstance(candidate, str) and candidate:
                workspace_id = candidate
    if workspace_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A workspace could not be resolved for the authenticated user.",
        )
    return RequestContext(
        user_id=user_id,
        workspace_id=workspace_id,
        email=email if isinstance(email, str) else None,
        source="supabase_jwt",
        access_token=token,
    )
