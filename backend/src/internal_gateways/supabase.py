from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from .models import InvocationClaimStatus

_CLAIM_STATUSES = frozenset(
    {"claimed", "token_replayed", "idempotency_conflict", "binding_stale"}
)


class InvocationClaimStoreError(RuntimeError):
    """The durable claim boundary was unavailable or returned an invalid response."""


class SupabaseInvocationClaimStore:
    """Service-client adapter for the atomic internal gateway claim RPC."""

    RPC_NAME = "claim_internal_gateway_invocation"

    def __init__(self, client: Any) -> None:
        if client is None:
            raise ValueError("Supabase service client is required")
        self._client = client

    def claim_invocation(
        self,
        *,
        organization_id: str,
        project_id: str,
        run_id: str,
        subject: str,
        attempt: int,
        lease_id: str,
        idempotency_key: str,
        request_digest: str,
        jti: str,
        expires_at: datetime,
    ) -> InvocationClaimStatus:
        if expires_at.tzinfo is None or expires_at.utcoffset() is None:
            raise ValueError("expires_at must be timezone-aware")

        try:
            response = self._client.rpc(
                self.RPC_NAME,
                {
                    "p_organization_id": organization_id,
                    "p_project_id": project_id,
                    "p_run_id": run_id,
                    "p_subject": subject,
                    "p_attempt": attempt,
                    "p_lease_id": lease_id,
                    "p_idempotency_key": idempotency_key,
                    "p_request_digest": request_digest,
                    "p_jti": jti,
                    "p_expires_at": expires_at.astimezone(UTC).isoformat().replace("+00:00", "Z"),
                },
            ).execute()
        except Exception as exc:
            raise InvocationClaimStoreError("internal gateway invocation claim RPC failed") from exc

        data = getattr(response, "data", None)
        if (
            not isinstance(data, list)
            or len(data) != 1
            or not isinstance(data[0], dict)
            or set(data[0]) != {"status"}
            or data[0]["status"] not in _CLAIM_STATUSES
        ):
            raise InvocationClaimStoreError(
                "internal gateway invocation claim RPC returned an invalid response"
            )
        return data[0]["status"]
