from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from hashlib import sha256
from uuid import uuid4

from .models import (
    ActualCost,
    DurableEvent,
    GatewayRequest,
    Lease,
    RunIdentity,
    RuntimeCheckpoint,
    RuntimeRun,
    StoredOutput,
    utc_now,
)
from .ports import (
    ConnectionOwnershipResolver,
    CurrentPolicyResolver,
    OutputStore,
    RuntimeQueue,
    RuntimeRepository,
)


class RuntimeConflict(RuntimeError):
    pass


class RuntimeAuthorizationDenied(PermissionError):
    pass


class RuntimeCoordinator:
    """Provider-neutral durable coordinator; Modal is a leased execution effect, never the source of truth."""

    def __init__(
        self,
        *,
        repository: RuntimeRepository,
        queue: RuntimeQueue,
        policy: CurrentPolicyResolver,
        connections: ConnectionOwnershipResolver,
        outputs: OutputStore,
        organization_concurrency: int = 4,
        lease_seconds: int = 30,
    ) -> None:
        self.repository = repository
        self.queue = queue
        self.policy = policy
        self.connections = connections
        self.outputs = outputs
        self.organization_concurrency = organization_concurrency
        self.lease_seconds = lease_seconds

    def accept(self, run: RuntimeRun, *, idempotency_key: str) -> RuntimeRun:
        if not idempotency_key.strip():
            raise ValueError("idempotency key is required")
        accepted = self.repository.create_run(run, idempotency_key)
        # Admission inserts the dispatch signal in the same transaction. Retrying a
        # command must not produce a second caller-owned notification.
        return accepted

    def claim(self, worker_id: str) -> Lease | None:
        if not worker_id.strip():
            raise ValueError("worker_id is required")
        return self.repository.claim_next(
            worker_id=worker_id,
            lease_expires_at=utc_now() + timedelta(seconds=self.lease_seconds),
            organization_limit=self.organization_concurrency,
        )

    def authorize_gateway(self, request: GatewayRequest) -> str:
        run = self.repository.get_run(request.identity.run_id)
        now = utc_now()
        if run is None or request.identity.expires_at <= now:
            raise RuntimeAuthorizationDenied("run identity is expired or unknown")
        bound = (
            run.organization_id,
            run.project_id,
            run.actor_id,
            run.agent_version_id,
        )
        presented = (
            request.identity.organization_id,
            request.identity.project_id,
            request.identity.actor_id,
            request.identity.agent_version_id,
        )
        if bound != presented or request.identity.audience not in {
            "tool-gateway",
            "model-gateway",
        }:
            raise RuntimeAuthorizationDenied("run identity binding mismatch")
        expected_audience = (
            "model-gateway" if request.operation == "model.invoke" else "tool-gateway"
        )
        if request.identity.audience != expected_audience:
            raise RuntimeAuthorizationDenied(
                "run identity audience does not authorize this operation"
            )
        if request.operation not in request.identity.capabilities:
            raise RuntimeAuthorizationDenied(
                "run identity capability does not authorize this operation"
            )
        if request.connection_id and not self.connections.is_owned(
            connection_id=request.connection_id,
            organization_id=run.organization_id,
            actor_id=run.actor_id,
        ):
            raise RuntimeAuthorizationDenied("connection ownership was revoked")
        decision = self.policy.authorize(request)
        if not decision.allowed:
            raise RuntimeAuthorizationDenied(decision.reason)
        return decision.policy_version

    def append_event(self, event: DurableEvent) -> DurableEvent:
        return self.repository.append_event(event)

    def heartbeat(self, lease: Lease) -> bool:
        return self.repository.heartbeat(
            run_id=lease.run.run_id,
            attempt=lease.run.attempt,
            lease_id=lease.lease_id,
            worker_id=lease.worker_id,
            lease_expires_at=utc_now() + timedelta(seconds=self.lease_seconds),
        )

    def release(self, lease: Lease, *, reason: str) -> None:
        self.repository.release_lease(
            run_id=lease.run.run_id,
            attempt=lease.run.attempt,
            lease_id=lease.lease_id,
            worker_id=lease.worker_id,
            reason=reason,
        )

    def checkpoint(
        self, checkpoint: RuntimeCheckpoint, *, worker_id: str
    ) -> RuntimeCheckpoint:
        return self.repository.write_checkpoint(checkpoint, worker_id=worker_id)

    def append_worker_event(self, event: DurableEvent, *, lease: Lease) -> DurableEvent:
        return self.repository.append_worker_event(
            event,
            attempt=lease.run.attempt,
            lease_id=lease.lease_id,
            worker_id=lease.worker_id,
        )

    def suspend_for_approval(
        self,
        checkpoint: RuntimeCheckpoint,
        *,
        worker_id: str,
        approval_id: str,
        operation: str,
        argument_summary: dict,
        expires_at=None,
    ) -> RuntimeRun:
        return self.repository.suspend_for_approval(
            checkpoint,
            worker_id=worker_id,
            approval_id=approval_id,
            operation=operation,
            argument_summary=argument_summary,
            expires_at=expires_at,
        )

    def complete_success(
        self,
        *,
        lease: Lease,
        output: StoredOutput,
        costs: list[ActualCost],
        reservation_id: str | None,
    ) -> RuntimeRun:
        return self.repository.complete_success(
            run_id=lease.run.run_id,
            attempt=lease.run.attempt,
            lease_id=lease.lease_id,
            worker_id=lease.worker_id,
            output=output,
            costs=costs,
            reservation_id=reservation_id,
        )

    def commit_output(
        self, *, run_id: str, sequence: int, name: str, media_type: str, content: bytes
    ) -> StoredOutput:
        run = self.repository.get_run(run_id)
        if run is None:
            raise RuntimeConflict("run does not exist")
        output = self.outputs.put(
            run=run, name=name, media_type=media_type, content=content
        )
        event = DurableEvent(
            run_id=run_id,
            sequence=sequence,
            event_type="output.created",
            payload={
                "output_id": output.output_id,
                "uri": output.uri,
                "digest": output.digest,
                "media_type": output.media_type,
                "byte_size": output.byte_size,
            },
        )
        self.repository.record_output(output, event)
        return output

    def cancel(self, *, run_id: str, actor_id: str) -> RuntimeRun:
        return self.repository.request_cancel(run_id, actor_id)

    def request_approval(
        self,
        *,
        approval_id: str,
        run_id: str,
        sequence: int,
        operation: str,
        argument_summary: dict,
        expires_at=None,
    ) -> RuntimeRun:
        return self.repository.request_approval(
            approval_id, run_id, sequence, operation, argument_summary, expires_at
        )

    def resolve_approval(
        self,
        *,
        approval_id: str,
        organization_id: str,
        actor_id: str,
        decision: str,
        reason: str | None = None,
    ) -> RuntimeRun:
        if decision not in {"approved", "denied"}:
            raise ValueError("approval decision must be approved or denied")
        return self.repository.resolve_approval(
            approval_id, organization_id, actor_id, decision, reason
        )

    def finalize_cost(
        self,
        *,
        run_id: str,
        attempt: int,
        provider: str,
        category: str,
        amount_usd: Decimal,
        provider_usage_id: str,
        rate_version: str,
        outcome: str,
        metadata: dict | None = None,
    ) -> None:
        if amount_usd < Decimal("0"):
            raise ValueError("actual cost cannot be negative")
        self.repository.record_actual_cost(
            ActualCost(
                run_id=run_id,
                attempt=attempt,
                provider=provider,
                category=category,  # type: ignore[arg-type]
                amount_usd=amount_usd,
                provider_usage_id=provider_usage_id,
                rate_version=rate_version,
                outcome=outcome,
                metadata=metadata or {},
            )
        )


class MemoryOutputStore:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}

    def put(
        self, *, run: RuntimeRun, name: str, media_type: str, content: bytes
    ) -> StoredOutput:
        digest = f"sha256:{sha256(content).hexdigest()}"
        output_id = f"out_{uuid4().hex}"
        uri = f"memory://outputs/{run.run_id}/{digest.removeprefix('sha256:')}"
        self.objects[uri] = bytes(content)
        return StoredOutput(
            output_id, run.run_id, uri, digest, media_type, len(content)
        )
