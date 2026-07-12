from __future__ import annotations

from datetime import datetime
from typing import Any, Mapping, Protocol, TypedDict


class PinnedRef(TypedDict):
    id: str
    version: str
    digest: str


class AutomationDispatch(TypedDict):
    execution_id: str
    organization_id: str
    project_id: str
    actor_id: str
    instructions: str
    input: Mapping[str, Any]
    agent: PinnedRef
    tools: tuple[PinnedRef, ...]
    knowledge: tuple[PinnedRef, ...]
    approval_policy_id: str
    max_cost_cents: int
    max_actions: int
    idempotency_key: str
    correlation_id: str
    test: bool


class NormalizedTrigger(TypedDict):
    source: str
    source_event_id: str
    occurred_at: str
    received_at: str
    payload: Mapping[str, Any]
    correlation_id: str


class ClaimedExecution(TypedDict):
    execution_id: str
    lease_id: str
    lease_expires_at: str


class AutomationPersistencePort(Protocol):
    """Atomic storage contract; implementations must tenant-scope every call."""

    def insert_trigger_once(
        self,
        *,
        organization_id: str,
        automation_id: str,
        trigger_key: str,
        payload: Mapping[str, Any],
    ) -> tuple[str, bool]: ...

    def claim_execution(
        self, *, worker_id: str, now: datetime, lease_expires_at: datetime
    ) -> ClaimedExecution | None: ...

    def recover_expired_leases(self, *, now: datetime) -> tuple[str, ...]: ...

    def heartbeat(
        self, *, execution_id: str, lease_id: str, lease_expires_at: datetime
    ) -> bool: ...

    def record_destination_once(
        self, *, execution_id: str, destination_id: str
    ) -> bool: ...


class AutomationRuntimePort(Protocol):
    """Dispatches into the ordinary durable runtime, never a special executor."""

    def start(self, dispatch: AutomationDispatch) -> str: ...

    def cancel(self, *, run_id: str, reason: str) -> None: ...


class SchedulerPort(Protocol):
    def schedule(self, *, automation_id: str, run_at: datetime) -> None: ...

    def unschedule(self, *, automation_id: str) -> None: ...


class ComposioTriggerPort(Protocol):
    """Normalizes a verified provider event; it never starts a runtime run."""

    def normalize(
        self, *, payload: Mapping[str, Any], received_at: datetime
    ) -> NormalizedTrigger: ...


class NotificationPort(Protocol):
    def deliver(
        self,
        *,
        organization_id: str,
        recipient_id: str,
        kind: str,
        subject_id: str,
        idempotency_key: str,
    ) -> None: ...
