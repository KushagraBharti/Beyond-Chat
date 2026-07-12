from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal, Mapping, Protocol

GatewayKind = Literal["model", "tool"]


@dataclass(frozen=True)
class CapabilityGrant:
    issuer: str
    audience: str
    subject: str
    run_id: str
    organization_id: str
    project_id: str
    attempt: int
    lease_id: str
    jti: str
    issued_at: datetime
    not_before: datetime
    expires_at: datetime
    capability_digest: str
    argument_digest: str
    idempotency_key: str
    max_calls: int
    max_cost_microusd: int


@dataclass(frozen=True)
class GatewayInvocation:
    token: str
    audience: str
    kind: GatewayKind
    name: str
    version: str
    arguments: Mapping[str, Any]
    idempotency_key: str
    projected_fields: tuple[str, ...] = ()
    estimated_cost_microusd: int = 0


@dataclass(frozen=True)
class AuthoritativeRunState:
    run_id: str
    organization_id: str
    project_id: str
    subject: str
    attempt: int
    lease_id: str
    state: str
    lease_expires_at: datetime
    revoked: bool
    capabilities: tuple[Mapping[str, Any], ...]
    calls_used: int = 0
    cost_used_microusd: int = 0


@dataclass(frozen=True)
class AuditOutcome:
    allowed: bool
    code: str
    run_id: str | None
    organization_id: str | None
    jti: str | None
    audience: str
    kind: GatewayKind
    operation: str
    idempotency_key: str
    capability_digest: str | None = None
    argument_digest: str | None = None
    details: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class GatewayResult:
    projection: Mapping[str, Any]
    audit: AuditOutcome


class AuthoritativeRunResolver(Protocol):
    def resolve(self, run_id: str) -> AuthoritativeRunState | None: ...


InvocationClaimStatus = Literal[
    "claimed", "token_replayed", "idempotency_conflict", "binding_stale"
]


class InvocationClaimStore(Protocol):
    """Atomically claim both token JTI and scoped idempotency binding."""

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
    ) -> InvocationClaimStatus: ...


class AuditSink(Protocol):
    def record(self, outcome: AuditOutcome) -> None: ...
