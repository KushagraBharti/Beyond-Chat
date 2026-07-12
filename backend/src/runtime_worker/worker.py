from __future__ import annotations

import asyncio
from datetime import timedelta
import re
import time
from typing import Callable

from src.runtime.models import DurableEvent, Lease, RuntimeCheckpoint
from src.runtime.models import utc_now

from .errors import AdapterProtocolError, CommitOutcomeUnknown, StaleLease, WorkerError
from .models import AdapterEvent, EventKind, FailureDecision, SandboxHandle, SandboxSpec, WorkerResult
from .ports import AdapterCommandFactory, CapabilityIssuer, SandboxLifecycle, WorkerPersistence


class PiAdapterCommandFactory:
    """Builds the provider-neutral Pi process contract; tokens are gateway capabilities, not provider keys."""

    def __init__(self, *, argv: tuple[str, ...], image_digest: str) -> None:
        self.argv = argv
        self.image_digest = image_digest

    def build(self, lease, *, broker, checkpoint):
        from .models import AdapterCommand

        return AdapterCommand(
            argv=self.argv,
            environment={
                "BEYOND_RUN_ID": lease.run.run_id,
                "BEYOND_ATTEMPT": str(lease.run.attempt),
                "BEYOND_INVOCATION_BROKER_SESSION": broker.credential,
            },
            resume_state=checkpoint.logical_state if checkpoint else {},
        )


class DurableWorker:
    def __init__(
        self, *, worker_id: str, persistence: WorkerPersistence,
        issuer: CapabilityIssuer, sandboxes: SandboxLifecycle,
        commands: AdapterCommandFactory, image_digest: str,
        lease_seconds: int = 30, supervision_seconds: float = 5,
        heartbeat_seconds: float | None = None, clock: Callable = utc_now,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        self.worker_id = worker_id
        self.persistence = persistence
        self.issuer = issuer
        self.sandboxes = sandboxes
        self.commands = commands
        if not _SHA256.fullmatch(image_digest):
            raise ValueError("runtime image digest must be canonical sha256")
        self.image_digest = image_digest
        self.lease_seconds = lease_seconds
        self.supervision_seconds = supervision_seconds
        self.heartbeat_seconds = heartbeat_seconds or max(1.0, lease_seconds / 3)
        self.clock = clock
        self.monotonic = monotonic
        self._last_heartbeat_at = 0.0

    async def run_once(self) -> WorkerResult:
        lease = await self.persistence.claim_one(
            worker_id=self.worker_id,
            lease_expires_at=self.clock() + timedelta(seconds=self.lease_seconds),
        )
        if lease is None:
            return WorkerResult(None, "idle")
        self._last_heartbeat_at = self.monotonic()
        return await self._execute(lease)

    async def _execute(self, lease: Lease) -> WorkerResult:
        handle: SandboxHandle | None = None
        reason = "worker_exit"
        lease_consumed = False
        try:
            control = await self.persistence.control(lease)
            if control.cancel_requested:
                await self.persistence.complete_cancellation(lease, propagation={"sandbox": "not_started"})
                lease_consumed = True
                return WorkerResult(lease.run.run_id, "canceled")
            broker = await self.issuer.open_session(
                lease.run, lease_id=lease.lease_id,
                allowed_invocations={
                    "model-gateway": ("model.invoke",),
                    "tool-gateway": ("tool.execute",),
                },
            )
            self._validate_broker(broker, lease)
            handle = await self.sandboxes.create_or_restore(SandboxSpec(
                lease.run.run_id, lease.run.attempt, self.image_digest, control.checkpoint
            ))
            stream = await self.sandboxes.launch(
                handle, self.commands.build(lease, broker=broker, checkpoint=control.checkpoint)
            )
            output = None
            costs = []
            checkpoint = control.checkpoint
            saw_success = False
            iterator = stream.__aiter__()
            while True:
                item = await self._next_supervised(iterator, lease, handle)
                if item is None:
                    break
                if lease_consumed:
                    raise AdapterProtocolError("adapter emitted after lease consumption")
                self._validate_idempotency_key(item.idempotency_key)
                if saw_success:
                    raise AdapterProtocolError("adapter emitted after success")
                current = await self._supervise_lease(lease, handle)
                if current.cancel_requested:
                    await self.sandboxes.cancel(handle)
                    await self.persistence.complete_cancellation(
                        lease, propagation={"sandbox": "cancel_requested", "sandbox_id": handle.sandbox_id}
                    )
                    lease_consumed = True
                    reason = "canceled"
                    return WorkerResult(lease.run.run_id, "canceled")
                if item.kind is EventKind.HEARTBEAT:
                    alive = await self.persistence.heartbeat(
                        lease, lease_expires_at=self.clock() + timedelta(seconds=self.lease_seconds)
                    )
                    if not alive:
                        raise StaleLease("heartbeat rejected")
                    self._last_heartbeat_at = self.monotonic()
                elif item.kind is EventKind.EVENT:
                    if not item.event_type:
                        raise AdapterProtocolError("normalized event has no type")
                    await self.persistence.append_event(lease, DurableEvent(
                        lease.run.run_id, None, item.event_type, dict(item.payload),
                        idempotency_key=item.idempotency_key,
                    ))
                elif item.kind is EventKind.CHECKPOINT:
                    checkpoint = self._checkpoint(item)
                    self._validate_checkpoint(checkpoint, lease)
                    await self.persistence.write_checkpoint(lease, checkpoint)
                elif item.kind is EventKind.APPROVAL:
                    checkpoint = self._checkpoint(item)
                    self._validate_checkpoint(checkpoint, lease)
                    if not item.approval_id or not item.operation:
                        raise AdapterProtocolError("approval is missing binding")
                    await self.persistence.suspend_for_approval(
                        lease, checkpoint, approval_id=item.approval_id,
                        operation=item.operation, argument_summary=dict(item.argument_summary),
                        expires_at=item.approval_expires_at,
                    )
                    lease_consumed = True
                    reason = "approval_suspended"
                    return WorkerResult(lease.run.run_id, "awaiting_approval")
                elif item.kind is EventKind.OUTPUT:
                    if item.output is None:
                        raise AdapterProtocolError("output event has no durable output")
                    if output is not None:
                        raise AdapterProtocolError("adapter emitted multiple outputs")
                    if item.output.run_id != lease.run.run_id:
                        raise AdapterProtocolError("output run binding mismatch")
                    output = item.output
                elif item.kind is EventKind.COST:
                    if item.cost is None:
                        raise AdapterProtocolError("cost event has no cost")
                    if item.cost.run_id != lease.run.run_id or item.cost.attempt != lease.run.attempt:
                        raise AdapterProtocolError("cost run or attempt binding mismatch")
                    identity = (item.cost.provider, item.cost.provider_usage_id)
                    if any((cost.provider, cost.provider_usage_id) == identity for cost in costs):
                        raise AdapterProtocolError("duplicate provider usage identity")
                    costs.append(item.cost)
                elif item.kind is EventKind.SUCCESS:
                    if output is None:
                        raise AdapterProtocolError("success preceded durable output")
                    saw_success = True
                else:
                    raise AdapterProtocolError(f"unsupported adapter event: {item.kind}")
            if not saw_success or output is None:
                raise AdapterProtocolError("adapter ended without success and durable output")
            try:
                await self.persistence.complete_success(lease, output=output, costs=tuple(costs))
                lease_consumed = True
            except CommitOutcomeUnknown:
                if await self.persistence.terminal_state(lease.run.run_id) != "completed":
                    raise
                lease_consumed = True
            reason = "completed"
            return WorkerResult(lease.run.run_id, "completed")
        except _CancellationConsumed:
            lease_consumed = True
            reason = "canceled"
            return WorkerResult(lease.run.run_id, "canceled")
        except StaleLease:
            reason = "stale_lease"
            return WorkerResult(lease.run.run_id, "stale")
        except Exception as exc:
            decision = classify_failure(exc)
            try:
                await self.persistence.record_failure(
                    lease, failure_class=decision.failure_class,
                    detail=dict(decision.detail), retryable=decision.retryable,
                )
            except StaleLease:
                reason = "stale_lease"
                return WorkerResult(lease.run.run_id, "stale")
            reason = "retrying" if decision.retryable else "failed"
            return WorkerResult(lease.run.run_id, reason)
        finally:
            if handle is not None:
                try:
                    await self.sandboxes.terminate(handle)
                except Exception:
                    pass
            if not lease_consumed:
                try:
                    await self.persistence.release(lease, reason=reason)
                except Exception:
                    pass

    async def _next_supervised(self, iterator, lease: Lease, handle: SandboxHandle):
        next_item = asyncio.create_task(iterator.__anext__())
        try:
            while True:
                done, _ = await asyncio.wait({next_item}, timeout=self.supervision_seconds)
                if done:
                    try:
                        return next_item.result()
                    except StopAsyncIteration:
                        return None
                await self._supervise_lease(lease, handle)
        finally:
            if not next_item.done():
                next_item.cancel()
            await asyncio.gather(next_item, return_exceptions=True)

    @staticmethod
    def _checkpoint(item: AdapterEvent) -> RuntimeCheckpoint:
        if item.checkpoint is None:
            raise AdapterProtocolError("checkpoint boundary has no checkpoint")
        return item.checkpoint

    def _validate_checkpoint(self, checkpoint: RuntimeCheckpoint, lease: Lease) -> None:
        if (
            checkpoint.run_id != lease.run.run_id
            or checkpoint.attempt != lease.run.attempt
            or checkpoint.lease_id != lease.lease_id
            or checkpoint.runtime_image_digest != self.image_digest
        ):
            raise AdapterProtocolError("checkpoint lease or image binding mismatch")
        if not _SHA256.fullmatch(checkpoint.state_digest):
            raise AdapterProtocolError("checkpoint state digest is invalid")
        if not _SHA256.fullmatch(checkpoint.runtime_image_digest):
            raise AdapterProtocolError("checkpoint image digest is invalid")

    @staticmethod
    def _validate_idempotency_key(value: str) -> None:
        if not value or not value.strip() or not 8 <= len(value) <= 255:
            raise AdapterProtocolError("adapter idempotency key is invalid")

    def _validate_broker(self, broker, lease: Lease) -> None:
        expected = {
            "model-gateway": ("model.invoke",),
            "tool-gateway": ("tool.execute",),
        }
        if (
            not broker.credential.strip()
            or broker.run_id != lease.run.run_id
            or broker.attempt != lease.run.attempt
            or broker.lease_id != lease.lease_id
            or broker.expires_at <= self.clock()
            or dict(broker.allowed_invocations) != expected
        ):
            raise AdapterProtocolError("invocation broker session binding mismatch")

    async def _supervise_lease(self, lease: Lease, handle: SandboxHandle):
        control = await self.persistence.control(lease)
        if control.cancel_requested:
            await self.sandboxes.cancel(handle)
            await self.persistence.complete_cancellation(
                lease, propagation={"sandbox": "cancel_requested", "sandbox_id": handle.sandbox_id}
            )
            raise _CancellationConsumed
        now = self.monotonic()
        if now - self._last_heartbeat_at >= self.heartbeat_seconds:
            alive = await self.persistence.heartbeat(
                lease, lease_expires_at=self.clock() + timedelta(seconds=self.lease_seconds)
            )
            if not alive:
                raise StaleLease("periodic heartbeat rejected")
            self._last_heartbeat_at = now
        return control


class _CancellationConsumed(Exception):
    pass


_SHA256 = re.compile(r"sha256:[0-9a-f]{64}")


def classify_failure(exc: Exception) -> FailureDecision:
    if isinstance(exc, WorkerError):
        return FailureDecision(exc.failure_class, exc.retryable, {"message": str(exc)})
    if isinstance(exc, TimeoutError):
        return FailureDecision("provider_timeout", True, {"message": str(exc)})
    return FailureDecision("unexpected_worker_failure", False, {"type": type(exc).__name__, "message": str(exc)})
