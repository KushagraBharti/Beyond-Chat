from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol

from src.runtime.models import RuntimeRun
from src.runtime.models import utc_now

from .errors import AdapterProtocolError, ProviderUnavailable
from .models import InvocationBrokerSession, InvocationRequest, SingleUseInvocationToken


class InvocationBrokerClient(Protocol):
    async def open_session(self, payload: dict[str, Any]) -> dict[str, Any]: ...
    async def mint_once(self, credential: str, payload: dict[str, Any]) -> dict[str, Any]: ...


class BrokerCapabilityIssuer:
    """Issuer and minting adapter for an injected control-plane invocation broker."""

    def __init__(self, client: InvocationBrokerClient, *, clock=utc_now) -> None:
        self.client = client
        self.clock = clock

    async def open_session(self, run: RuntimeRun, *, lease_id: str,
                           allowed_invocations: dict[str, tuple[str, ...]]) -> InvocationBrokerSession:
        try:
            row = await self.client.open_session({
                "run_id": run.run_id, "organization_id": run.organization_id,
                "project_id": run.project_id, "actor_id": run.actor_id,
                "agent_version_id": run.agent_version_id, "attempt": run.attempt,
                "lease_id": lease_id,
                "allowed_invocations": {key: list(value) for key, value in allowed_invocations.items()},
            })
            session = InvocationBrokerSession(str(row["credential"]), str(row["run_id"]),
                int(row["attempt"]), str(row["lease_id"]), _time(row["expires_at"]),
                {str(key): tuple(value) for key, value in row["allowed_invocations"].items()})
        except (KeyError, TypeError, ValueError) as exc:
            raise AdapterProtocolError("invocation broker returned an invalid session") from exc
        except Exception as exc:
            raise ProviderUnavailable("invocation broker unavailable") from exc
        if (session.run_id != run.run_id or session.attempt != run.attempt
                or session.lease_id != lease_id
                or dict(session.allowed_invocations) != allowed_invocations
                or session.expires_at <= self.clock() or not session.credential.strip()):
            raise AdapterProtocolError("invocation broker session binding mismatch")
        return session

    async def mint_once(self, session: InvocationBrokerSession,
                        request: InvocationRequest) -> SingleUseInvocationToken:
        try:
            row = await self.client.mint_once(session.credential, {
                "audience": request.audience, "operation": request.operation,
                "argument_digest": request.argument_digest,
                "idempotency_key": request.idempotency_key, "approval_id": request.approval_id,
            })
            token = SingleUseInvocationToken(str(row["token"]), str(row["audience"]),
                str(row["operation"]), str(row["argument_digest"]),
                str(row["idempotency_key"]), _time(row["expires_at"]))
        except (KeyError, TypeError, ValueError) as exc:
            raise AdapterProtocolError("invocation broker returned an invalid token") from exc
        except Exception as exc:
            raise ProviderUnavailable("invocation broker unavailable") from exc
        if (token.audience, token.operation, token.argument_digest, token.idempotency_key) != (
            request.audience, request.operation, request.argument_digest, request.idempotency_key
        ):
            raise AdapterProtocolError("invocation token binding mismatch")
        if token.expires_at <= self.clock() or token.expires_at > session.expires_at:
            raise AdapterProtocolError("invocation token expiry is invalid")
        return token


def _time(value: Any) -> datetime:
    parsed = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("broker timestamps must be timezone-aware")
    return parsed
