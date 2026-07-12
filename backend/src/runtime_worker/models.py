from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any, AsyncIterator, Mapping

from src.runtime.models import ActualCost, Lease, RuntimeCheckpoint, StoredOutput


class EventKind(StrEnum):
    EVENT = "event"
    HEARTBEAT = "heartbeat"
    CHECKPOINT = "checkpoint"
    APPROVAL = "approval"
    OUTPUT = "output"
    COST = "cost"
    SUCCESS = "success"


@dataclass(frozen=True)
class InvocationBrokerSession:
    """Lease-bound credential used to mint one exact, single-use token per gateway call."""

    credential: str
    run_id: str
    attempt: int
    lease_id: str
    expires_at: datetime
    allowed_invocations: Mapping[str, tuple[str, ...]]


@dataclass(frozen=True)
class InvocationRequest:
    audience: str
    operation: str
    argument_digest: str
    idempotency_key: str
    approval_id: str | None = None


@dataclass(frozen=True)
class SingleUseInvocationToken:
    token: str
    audience: str
    operation: str
    argument_digest: str
    idempotency_key: str
    expires_at: datetime


@dataclass(frozen=True)
class SandboxSpec:
    run_id: str
    attempt: int
    image_digest: str
    checkpoint: RuntimeCheckpoint | None


@dataclass(frozen=True)
class SandboxHandle:
    sandbox_id: str
    provider: str


@dataclass(frozen=True)
class AdapterCommand:
    argv: tuple[str, ...]
    environment: Mapping[str, str]
    resume_state: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AdapterEvent:
    kind: EventKind
    idempotency_key: str
    event_type: str | None = None
    payload: Mapping[str, Any] = field(default_factory=dict)
    checkpoint: RuntimeCheckpoint | None = None
    approval_id: str | None = None
    operation: str | None = None
    argument_summary: Mapping[str, Any] = field(default_factory=dict)
    approval_expires_at: datetime | None = None
    output: StoredOutput | None = None
    cost: ActualCost | None = None


@dataclass(frozen=True)
class RunControl:
    state: str
    cancel_requested: bool = False
    checkpoint: RuntimeCheckpoint | None = None


@dataclass(frozen=True)
class FailureDecision:
    failure_class: str
    retryable: bool
    detail: Mapping[str, Any]


@dataclass(frozen=True)
class WorkerResult:
    run_id: str | None
    outcome: str


EventStream = AsyncIterator[AdapterEvent]


def sandbox_cost(
    *, lease: Lease, provider: str, usage_id: str, amount: Decimal, outcome: str
) -> ActualCost:
    return ActualCost(
        run_id=lease.run.run_id,
        attempt=lease.run.attempt,
        provider=provider,
        category="sandbox",
        amount_usd=amount,
        provider_usage_id=usage_id,
        rate_version="provider-reported",
        outcome=outcome,
    )
