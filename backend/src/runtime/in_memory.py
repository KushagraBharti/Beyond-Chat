from __future__ import annotations

from dataclasses import replace
from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from .coordinator import RuntimeConflict
from .models import ActualCost, DurableEvent, Lease, RuntimeRun, StoredOutput


class InMemoryRuntimeRepository:
    def __init__(self) -> None:
        self.runs: dict[str, RuntimeRun] = {}
        self.idempotency: dict[tuple[str, str], str] = {}
        self.events: dict[str, list[DurableEvent]] = {}
        self.leases: dict[str, Lease] = {}
        self.outputs: dict[str, StoredOutput] = {}
        self.costs: dict[tuple[str, int, str, str], ActualCost] = {}
        self.approvals: dict[str, tuple[str, str]] = {}

    def create_run(self, run: RuntimeRun, idempotency_key: str) -> RuntimeRun:
        key = (run.organization_id, idempotency_key)
        prior = self.idempotency.get(key)
        if prior:
            return self.runs[prior]
        if run.run_id in self.runs:
            raise RuntimeConflict("run_id already exists")
        self.runs[run.run_id] = run
        self.idempotency[key] = run.run_id
        self.events[run.run_id] = []
        return run

    def get_run(self, run_id: str) -> RuntimeRun | None:
        return self.runs.get(run_id)

    def claim_next(self, *, worker_id: str, lease_expires_at: datetime, organization_limit: int) -> Lease | None:
        active = {lease.run.run_id: lease for lease in self.leases.values() if lease.expires_at > datetime.now(lease.expires_at.tzinfo)}
        per_org: dict[str, int] = {}
        for lease in active.values():
            per_org[lease.run.organization_id] = per_org.get(lease.run.organization_id, 0) + 1
        for run in sorted(self.runs.values(), key=lambda item: item.run_id):
            if run.state != "queued" or run.run_id in active or per_org.get(run.organization_id, 0) >= organization_limit:
                continue
            leased_run = replace(run, state="leased", attempt=run.attempt + 1, version=run.version + 1)
            self.runs[run.run_id] = leased_run
            lease = Lease(leased_run, f"lease_{uuid4().hex}", worker_id, lease_expires_at)
            self.leases[lease.lease_id] = lease
            return lease
        return None

    def heartbeat(self, lease_id: str, lease_expires_at: datetime) -> bool:
        lease = self.leases.get(lease_id)
        if not lease:
            return False
        self.leases[lease_id] = replace(lease, expires_at=lease_expires_at)
        return True

    def transition(self, run_id: str, *, expected_version: int, state: str) -> RuntimeRun:
        run = self.runs[run_id]
        if run.version != expected_version:
            raise RuntimeConflict("run version conflict")
        updated = replace(run, state=state, version=run.version + 1)
        self.runs[run_id] = updated
        return updated

    def append_event(self, event: DurableEvent) -> DurableEvent:
        events = self.events[event.run_id]
        if event.sequence != len(events) + 1:
            raise RuntimeConflict("event sequence conflict")
        events.append(event)
        return event

    def events_after(self, run_id: str, sequence: int) -> list[DurableEvent]:
        return [event for event in self.events.get(run_id, []) if event.sequence > sequence]

    def record_output(self, output: StoredOutput, event: DurableEvent) -> None:
        if output.output_id in self.outputs:
            return
        self.append_event(event)
        self.outputs[output.output_id] = output

    def record_actual_cost(self, cost: ActualCost) -> None:
        key = (cost.run_id, cost.attempt, cost.provider, cost.provider_usage_id)
        prior = self.costs.get(key)
        if prior and prior != cost:
            raise RuntimeConflict("provider usage was finalized with different cost")
        self.costs[key] = cost

    def request_cancel(self, run_id: str, actor_id: str) -> RuntimeRun:
        run = self.runs[run_id]
        if run.actor_id != actor_id:
            raise RuntimeConflict("run actor mismatch")
        if run.state in {"completed", "failed", "canceled"}:
            return run
        updated = replace(run, state="canceled", version=run.version + 1)
        self.runs[run_id] = updated
        return updated

    def request_approval(self, approval_id: str, run_id: str, sequence: int, operation: str, argument_summary: dict, expires_at: datetime | None) -> RuntimeRun:
        del sequence, operation, argument_summary, expires_at
        run = self.runs[run_id]
        prior = self.approvals.get(approval_id)
        if prior is not None:
            return self.runs[prior[0]]
        self.approvals[approval_id] = (run_id, "pending")
        updated = replace(run, state="awaiting_approval", version=run.version + 1)
        self.runs[run_id] = updated
        return updated

    def resolve_approval(self, approval_id: str, organization_id: str, actor_id: str, decision: str, reason: str | None) -> RuntimeRun:
        del reason
        approval = self.approvals.get(approval_id)
        if approval is None:
            raise RuntimeConflict("approval does not exist")
        run = self.runs[approval[0]]
        if run.organization_id != organization_id or run.actor_id != actor_id:
            raise RuntimeConflict("approval access denied")
        if approval[1] != "pending":
            return run
        self.approvals[approval_id] = (run.run_id, decision)
        updated = replace(run, state="queued" if decision == "approved" else "canceled", version=run.version + 1)
        self.runs[run.run_id] = updated
        return updated

    def release_lease(self, lease_id: str) -> None:
        self.leases.pop(lease_id, None)

    def reconcile_expired(self, now: datetime) -> list[str]:
        expired = [lease for lease in self.leases.values() if lease.expires_at <= now]
        for lease in expired:
            run = self.runs[lease.run.run_id]
            self.runs[run.run_id] = replace(run, state="queued", version=run.version + 1)
            self.leases.pop(lease.lease_id, None)
        return [lease.run.run_id for lease in expired]


class InMemoryRuntimeQueue:
    def __init__(self) -> None:
        self.notifications: list[str] = []

    def notify(self, run_id: str) -> None:
        self.notifications.append(run_id)


class AllowPolicy:
    def __init__(self) -> None:
        self.allowed = True
        self.version = "policy-v1"

    def authorize(self, request):
        from .models import GatewayDecision
        return GatewayDecision(self.allowed, self.version, "allowed" if self.allowed else "revoked")


class OwnedConnections:
    def __init__(self, owned: set[tuple[str, str, str]] | None = None) -> None:
        self.owned = owned or set()

    def is_owned(self, *, connection_id: str, organization_id: str, actor_id: str) -> bool:
        return (connection_id, organization_id, actor_id) in self.owned
