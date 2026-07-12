from __future__ import annotations

from datetime import datetime
from typing import Protocol

from .models import (
    ActualCost,
    DurableEvent,
    GatewayDecision,
    GatewayRequest,
    Lease,
    RunIdentity,
    RuntimeCheckpoint,
    RuntimeRun,
    StoredOutput,
)


class RuntimeRepository(Protocol):
    def create_run(self, run: RuntimeRun, idempotency_key: str) -> RuntimeRun: ...
    def get_run(self, run_id: str) -> RuntimeRun | None: ...
    def claim_next(
        self, *, worker_id: str, lease_expires_at: datetime, organization_limit: int
    ) -> Lease | None: ...
    def heartbeat(
        self,
        *,
        run_id: str,
        attempt: int,
        lease_id: str,
        worker_id: str,
        lease_expires_at: datetime,
    ) -> bool: ...
    def transition(
        self, run_id: str, *, expected_version: int, state: str
    ) -> RuntimeRun: ...
    def append_event(self, event: DurableEvent) -> DurableEvent: ...
    def append_worker_event(
        self, event: DurableEvent, *, attempt: int, lease_id: str, worker_id: str
    ) -> DurableEvent: ...
    def events_after(self, run_id: str, sequence: int) -> list[DurableEvent]: ...
    def record_output(self, output: StoredOutput, event: DurableEvent) -> None: ...
    def record_actual_cost(self, cost: ActualCost) -> None: ...
    def request_cancel(self, run_id: str, actor_id: str) -> RuntimeRun: ...
    def request_approval(
        self,
        approval_id: str,
        run_id: str,
        sequence: int,
        operation: str,
        argument_summary: dict,
        expires_at: datetime | None,
    ) -> RuntimeRun: ...
    def resolve_approval(
        self,
        approval_id: str,
        organization_id: str,
        actor_id: str,
        decision: str,
        reason: str | None,
    ) -> RuntimeRun: ...
    def release_lease(
        self, *, run_id: str, attempt: int, lease_id: str, worker_id: str, reason: str
    ) -> None: ...
    def write_checkpoint(
        self, checkpoint: RuntimeCheckpoint, *, worker_id: str
    ) -> RuntimeCheckpoint: ...
    def suspend_for_approval(
        self,
        checkpoint: RuntimeCheckpoint,
        *,
        worker_id: str,
        approval_id: str,
        operation: str,
        argument_summary: dict,
        expires_at: datetime | None,
    ) -> RuntimeRun: ...
    def complete_success(
        self,
        *,
        run_id: str,
        attempt: int,
        lease_id: str,
        worker_id: str,
        output: StoredOutput,
        costs: list[ActualCost],
        reservation_id: str | None,
    ) -> RuntimeRun: ...
    def reconcile_expired(self, now: datetime) -> list[str]: ...


class RuntimeQueue(Protocol):
    def notify(self, run_id: str) -> None: ...


class CurrentPolicyResolver(Protocol):
    def authorize(self, request: GatewayRequest) -> GatewayDecision: ...


class ConnectionOwnershipResolver(Protocol):
    def is_owned(
        self, *, connection_id: str, organization_id: str, actor_id: str
    ) -> bool: ...


class OutputStore(Protocol):
    def put(
        self, *, run: RuntimeRun, name: str, media_type: str, content: bytes
    ) -> StoredOutput: ...


class RunCapabilityIssuer(Protocol):
    def issue(
        self, run: RuntimeRun, *, audience: str, capabilities: tuple[str, ...]
    ) -> tuple[str, RunIdentity]: ...
