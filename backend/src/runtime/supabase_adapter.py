from __future__ import annotations

from datetime import datetime
from hashlib import sha256
from typing import Any
from uuid import uuid4

from .models import ActualCost, DurableEvent, GatewayDecision, GatewayRequest, Lease, RuntimeRun, StoredOutput


def _iso(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


class SupabasePostgresRuntimeRepository:
    """Concrete PostgREST/RPC adapter for the canonical runtime schema.

    Queue claims, output+event commits, and cost finalization are RPCs because each must be
    one short Postgres transaction. `claim_runtime_run` is required to use FOR UPDATE SKIP
    LOCKED and enforce organization concurrency inside the same transaction.
    """

    REQUIRED_RPCS = frozenset({
        "admit_runtime_run",
        "claim_runtime_run",
        "append_runtime_event",
        "commit_runtime_output",
        "finalize_runtime_cost",
        "reconcile_expired_runtime_leases",
        "recheck_runtime_gateway_policy",
        "notify_runtime_run",
        "transition_runtime_run",
        "request_runtime_approval",
    })

    def __init__(self, client: Any) -> None:
        if client is None:
            raise RuntimeError("Supabase service client is required")
        self.client = client

    def create_run(self, run: RuntimeRun, idempotency_key: str) -> RuntimeRun:
        data = self.client.rpc("admit_runtime_run", {
            "p_run_id": run.run_id,
            "p_organization_id": run.organization_id,
            "p_project_id": run.project_id,
            "p_actor_id": run.actor_id,
            "p_agent_version_id": run.agent_version_id,
            "p_idempotency_key": idempotency_key,
            "p_correlation_id": run.run_id,
        }).execute().data
        row = data[0] if isinstance(data, list) and data else data
        if not isinstance(row, dict):
            raise RuntimeError("runtime admission returned no run")
        return self._run(row)

    def get_run(self, run_id: str) -> RuntimeRun | None:
        rows = self.client.table("runtime_runs").select("*").eq("id", run_id).limit(1).execute().data or []
        return self._run(rows[0]) if rows else None

    def claim_next(self, *, worker_id: str, lease_expires_at: datetime, organization_limit: int) -> Lease | None:
        data = self.client.rpc("claim_runtime_run", {
            "p_worker_id": worker_id,
            "p_lease_expires_at": _iso(lease_expires_at),
            "p_organization_limit": organization_limit,
        }).execute().data
        row = data[0] if isinstance(data, list) and data else data
        if not isinstance(row, dict):
            return None
        return Lease(self._run(row), row["lease_id"], worker_id, lease_expires_at)

    def heartbeat(self, lease_id: str, lease_expires_at: datetime) -> bool:
        rows = self.client.table("runtime_leases").update({"expires_at": _iso(lease_expires_at), "heartbeat_at": _iso(datetime.now(lease_expires_at.tzinfo))}).eq("id", lease_id).is_("released_at", "null").execute().data or []
        return bool(rows)

    def transition(self, run_id: str, *, expected_version: int, state: str) -> RuntimeRun:
        data = self.client.rpc("transition_runtime_run", {
            "p_run_id": run_id, "p_expected_version": expected_version, "p_state": state,
        }).execute().data
        row = data[0] if isinstance(data, list) and data else data
        if not isinstance(row, dict):
            raise RuntimeError("runtime run version conflict")
        return self._run(row)

    def append_event(self, event: DurableEvent) -> DurableEvent:
        self.client.rpc("append_runtime_event", {"p_run_id": event.run_id, "p_sequence": event.sequence, "p_event_type": event.event_type, "p_payload": event.payload, "p_occurred_at": _iso(event.occurred_at)}).execute()
        return event

    def events_after(self, run_id: str, sequence: int) -> list[DurableEvent]:
        rows = self.client.table("runtime_events").select("*").eq("run_id", run_id).gt("sequence", sequence).order("sequence").execute().data or []
        return [DurableEvent(row["run_id"], row["sequence"], row["event_type"], row.get("payload") or {}, datetime.fromisoformat(row["occurred_at"].replace("Z", "+00:00"))) for row in rows]

    def record_output(self, output: StoredOutput, event: DurableEvent) -> None:
        self.client.rpc("commit_runtime_output", {"p_output": output.__dict__, "p_event": {**event.__dict__, "occurred_at": _iso(event.occurred_at)}}).execute()

    def record_actual_cost(self, cost: ActualCost) -> None:
        self.client.rpc("finalize_runtime_cost", {"p_cost": {**cost.__dict__, "amount_usd": str(cost.amount_usd)}}).execute()

    def request_cancel(self, run_id: str, actor_id: str) -> RuntimeRun:
        data = self.client.rpc("request_runtime_cancel", {"p_run_id": run_id, "p_actor_id": actor_id}).execute().data
        row = data[0] if isinstance(data, list) and data else data
        if not isinstance(row, dict):
            raise RuntimeError("runtime cancellation returned no run")
        return self._run(row)

    def request_approval(self, approval_id: str, run_id: str, sequence: int, operation: str, argument_summary: dict, expires_at: datetime | None) -> RuntimeRun:
        data = self.client.rpc("request_runtime_approval", {
            "p_approval_id": approval_id, "p_run_id": run_id, "p_sequence": sequence,
            "p_operation": operation, "p_argument_summary": argument_summary,
            "p_expires_at": _iso(expires_at) if expires_at else None,
        }).execute().data
        row = data[0] if isinstance(data, list) and data else data
        if not isinstance(row, dict):
            raise RuntimeError("runtime approval request returned no run")
        return self._run(row)

    def resolve_approval(self, approval_id: str, organization_id: str, actor_id: str, decision: str, reason: str | None) -> RuntimeRun:
        data = self.client.rpc("resolve_runtime_approval", {
            "p_approval_id": approval_id, "p_organization_id": organization_id, "p_actor_id": actor_id,
            "p_decision": decision, "p_reason": reason,
        }).execute().data
        row = data[0] if isinstance(data, list) and data else data
        if not isinstance(row, dict):
            raise RuntimeError("runtime approval resolution returned no run")
        return self._run(row)

    def release_lease(self, lease_id: str) -> None:
        self.client.table("runtime_leases").update({"released_at": _iso(datetime.now().astimezone())}).eq("id", lease_id).execute()

    def reconcile_expired(self, now: datetime) -> list[str]:
        data = self.client.rpc("reconcile_expired_runtime_leases", {"p_now": _iso(now)}).execute().data or []
        return [str(item["run_id"] if isinstance(item, dict) else item) for item in data]

    @staticmethod
    def _run(row: dict[str, Any]) -> RuntimeRun:
        return RuntimeRun(str(row["id"]), str(row["organization_id"]), str(row["project_id"]), str(row["actor_id"]), str(row["agent_version_id"]), str(row["state"]), int(row.get("attempt", 0)), int(row.get("version", 1)))


class SupabaseRuntimeQueue:
    def __init__(self, client: Any) -> None:
        self.client = client

    def notify(self, run_id: str) -> None:
        # The RPC inserts an outbox/queue signal transactionally; workers still claim with SKIP LOCKED.
        self.client.rpc("notify_runtime_run", {"p_run_id": run_id}).execute()


class SupabaseGatewayPolicyResolver:
    def __init__(self, client: Any) -> None:
        self.client = client

    def authorize(self, request: GatewayRequest) -> GatewayDecision:
        data = self.client.rpc("recheck_runtime_gateway_policy", {
            "p_run_id": request.identity.run_id,
            "p_organization_id": request.identity.organization_id,
            "p_project_id": request.identity.project_id,
            "p_actor_id": request.identity.actor_id,
            "p_agent_version_id": request.identity.agent_version_id,
            "p_operation": request.operation,
            "p_connection_id": request.connection_id,
            "p_approval_id": request.approval_id,
            "p_idempotency_key": request.idempotency_key,
        }).execute().data
        row = data[0] if isinstance(data, list) and data else data
        if not isinstance(row, dict):
            return GatewayDecision(False, "unknown", "policy resolver returned no decision")
        return GatewayDecision(bool(row.get("allowed")), str(row.get("policy_version") or "unknown"), str(row.get("reason") or "denied"))


class SupabaseConnectionOwnershipResolver:
    def __init__(self, client: Any) -> None:
        self.client = client

    def is_owned(self, *, connection_id: str, organization_id: str, actor_id: str) -> bool:
        rows = self.client.table("app_connections").select("id").eq("id", connection_id).eq("organization_id", organization_id).eq("owner_profile_id", actor_id).eq("state", "active").limit(1).execute().data or []
        return bool(rows)


class SupabaseOutputStore:
    """Content-addressed immutable output upload; metadata is committed separately with its event."""

    def __init__(self, client: Any, *, bucket: str = "outputs") -> None:
        self.client = client
        self.bucket = bucket

    def put(self, *, run: RuntimeRun, name: str, media_type: str, content: bytes) -> StoredOutput:
        digest = sha256(content).hexdigest()
        safe_name = "".join(character for character in name if character.isalnum() or character in {"-", "_", "."})[:120] or "output.bin"
        path = f"{run.organization_id}/{run.project_id}/runs/{run.run_id}/{digest}/{safe_name}"
        try:
            self.client.storage.from_(self.bucket).upload(path=path, file=content, file_options={"content-type": media_type, "upsert": "false"})
        except Exception as exc:
            # A duplicate content-addressed path is safe only when the stored bytes are identical.
            existing = self.client.storage.from_(self.bucket).download(path)
            if bytes(existing) != content:
                raise RuntimeError("authoritative output upload failed integrity verification") from exc
        return StoredOutput(f"out_{uuid4().hex}", run.run_id, f"supabase://{self.bucket}/{path}", f"sha256:{digest}", media_type, len(content))
