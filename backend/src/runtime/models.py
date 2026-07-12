from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any, Literal


def utc_now() -> datetime:
    return datetime.now(UTC)


@dataclass(frozen=True)
class RunIdentity:
    run_id: str
    organization_id: str
    project_id: str
    actor_id: str
    agent_version_id: str
    audience: str
    nonce: str
    expires_at: datetime


@dataclass(frozen=True)
class RuntimeRun:
    run_id: str
    organization_id: str
    project_id: str
    actor_id: str
    agent_version_id: str
    state: str = "queued"
    attempt: int = 0
    version: int = 1


@dataclass(frozen=True)
class Lease:
    run: RuntimeRun
    lease_id: str
    worker_id: str
    expires_at: datetime


@dataclass(frozen=True)
class DurableEvent:
    run_id: str
    sequence: int
    event_type: str
    payload: dict[str, Any]
    occurred_at: datetime = field(default_factory=utc_now)


@dataclass(frozen=True)
class StoredOutput:
    output_id: str
    run_id: str
    uri: str
    digest: str
    media_type: str
    byte_size: int


@dataclass(frozen=True)
class ActualCost:
    run_id: str
    attempt: int
    provider: str
    category: Literal["model", "tool", "sandbox", "storage", "render", "realtime"]
    amount_usd: Decimal
    provider_usage_id: str
    rate_version: str
    outcome: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class GatewayRequest:
    identity: RunIdentity
    operation: str
    connection_id: str | None = None
    approval_id: str | None = None
    idempotency_key: str | None = None


@dataclass(frozen=True)
class GatewayDecision:
    allowed: bool
    policy_version: str
    reason: str

