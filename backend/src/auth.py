from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import Header, HTTPException, Request, status

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


def _load_supabase_user(token: str) -> dict[str, Any]:
    client = supabase_service.client(token)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication is not configured on the backend.",
        )

    try:
        response = client.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase JWT could not be verified.",
        ) from exc

    user = getattr(response, "user", None)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase JWT could not be verified.",
        )

    if hasattr(user, "model_dump"):
        payload = user.model_dump()
    elif hasattr(user, "dict"):
        payload = user.dict()
    elif isinstance(user, dict):
        payload = user
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase JWT could not be verified.",
        )

    return payload


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
) -> RequestContext:
    cached_context = getattr(request.state, "request_context", None)
    if isinstance(cached_context, RequestContext):
        return cached_context

    cached_error = getattr(request.state, "request_context_error", None)
    if isinstance(cached_error, HTTPException):
        raise cached_error

    return resolve_request_context(authorization, x_workspace_id)


def resolve_request_context(
    authorization: str | None,
    x_workspace_id: str | None,
) -> RequestContext:
    token = _extract_token(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required for this endpoint.",
        )

    claims = _load_supabase_user(token)
    user_id = claims.get("id") or claims.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase user data is missing the user identifier.",
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
