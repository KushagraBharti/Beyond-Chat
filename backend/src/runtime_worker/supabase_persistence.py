from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol

from src.runtime.models import ActualCost, DurableEvent, Lease, RuntimeCheckpoint, RuntimeRun, StoredOutput, utc_now

from .errors import CommitOutcomeUnknown, ProviderUnavailable, StaleLease
from .models import RunControl


class AsyncSupabaseClient(Protocol):
    def rpc(self, function: str, params: dict[str, Any]) -> Any: ...
    def table(self, table: str) -> Any: ...


def _iso(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


class SupabaseWorkerPersistence:
    """Async service-role adapter over the committed runtime RPC contract."""

    def __init__(
        self, client: AsyncSupabaseClient, *, organization_limit: int = 8,
        max_attempts: int = 3, retry_delay_seconds: int = 5,
        clock: Any = utc_now,
    ) -> None:
        if client is None or organization_limit < 1 or max_attempts < 1:
            raise ValueError("valid Supabase client and worker limits are required")
        self.client = client
        self.organization_limit = organization_limit
        self.max_attempts = max_attempts
        self.retry_delay_seconds = retry_delay_seconds
        self.clock = clock

    async def _execute(self, builder: Any) -> Any:
        result = builder.execute()
        if hasattr(result, "__await__"):
            result = await result
        return getattr(result, "data", None)

    async def _rpc(self, name: str, params: dict[str, Any], *, ambiguous: bool = False) -> Any:
        try:
            return await self._execute(self.client.rpc(name, params))
        except Exception as exc:
            code = _error_code(exc)
            if code == "40001":
                raise StaleLease("runtime lease is stale") from exc
            if ambiguous and _is_transport_error(exc):
                raise CommitOutcomeUnknown("atomic commit outcome is unknown") from exc
            raise ProviderUnavailable(_redacted_error(exc)) from exc

    async def _completion(self, name: str, params: dict[str, Any], *, run_id: str,
                          expected_states: frozenset[str]) -> Any:
        try:
            return await self._rpc(name, params, ambiguous=True)
        except CommitOutcomeUnknown:
            if await self.terminal_state(run_id) in expected_states:
                return {"id": run_id}
            raise

    async def claim_one(self, *, worker_id: str, lease_expires_at: datetime) -> Lease | None:
        data = await self._rpc("claim_runtime_run", {
            "p_worker_id": worker_id,
            "p_lease_expires_at": _iso(lease_expires_at),
            "p_organization_limit": self.organization_limit,
        })
        row = _one(data)
        if row is None:
            return None
        return Lease(_run(row), str(row["lease_id"]), worker_id, lease_expires_at)

    async def control(self, lease: Lease) -> RunControl:
        rows = await self._execute(
            self.client.table("runtime_runs").select("id,state,attempt,cancel_requested_at")
            .eq("id", lease.run.run_id).limit(1)
        ) or []
        if not rows or int(rows[0]["attempt"]) != lease.run.attempt:
            raise StaleLease("runtime attempt changed")
        lease_rows = await self._execute(
            self.client.table("runtime_leases").select("id,run_id,attempt,worker_id,expires_at,released_at")
            .eq("id", lease.lease_id).eq("run_id", lease.run.run_id)
            .eq("attempt", lease.run.attempt).eq("worker_id", lease.worker_id).limit(2)
        ) or []
        if len(lease_rows) != 1 or lease_rows[0].get("released_at") is not None:
            raise StaleLease("runtime lease is missing, released, or replaced")
        if _aware_time(lease_rows[0].get("expires_at")) <= self.clock():
            raise StaleLease("runtime lease expired")
        checkpoint_rows = await self._execute(
            self.client.table("runtime_checkpoints").select("*")
            .eq("run_id", lease.run.run_id).eq("attempt", lease.run.attempt)
            .eq("lease_id", lease.lease_id)
            .order("created_at", desc=True).limit(1)
        ) or []
        checkpoint = _checkpoint(checkpoint_rows[0]) if checkpoint_rows else None
        return RunControl(str(rows[0]["state"]), rows[0].get("cancel_requested_at") is not None, checkpoint)

    async def append_event(self, lease: Lease, event: DurableEvent) -> DurableEvent:
        data = await self._rpc("append_runtime_event_fenced", {
            "p_run_id": lease.run.run_id, "p_attempt": lease.run.attempt,
            "p_lease_id": lease.lease_id, "p_worker_id": lease.worker_id,
            "p_idempotency_key": event.idempotency_key, "p_event_type": event.event_type,
            "p_payload": event.payload, "p_occurred_at": _iso(event.occurred_at),
        })
        row = _required(data, "event allocation")
        return DurableEvent(event.run_id, int(row["sequence"]), event.event_type, event.payload,
                            event.occurred_at, event.idempotency_key)

    async def heartbeat(self, lease: Lease, *, lease_expires_at: datetime) -> bool:
        data = await self._rpc("heartbeat_runtime_lease", {
            "p_run_id": lease.run.run_id, "p_attempt": lease.run.attempt,
            "p_lease_id": lease.lease_id, "p_worker_id": lease.worker_id,
            "p_lease_expires_at": _iso(lease_expires_at),
        })
        if data is not True:
            raise ProviderUnavailable("heartbeat RPC returned an invalid shape")
        return True

    async def release(self, lease: Lease, *, reason: str) -> None:
        data = await self._rpc("release_runtime_lease", {
            "p_run_id": lease.run.run_id, "p_attempt": lease.run.attempt,
            "p_lease_id": lease.lease_id, "p_worker_id": lease.worker_id, "p_reason": reason,
        })
        if data is not True:
            raise ProviderUnavailable("lease release RPC returned an invalid shape")

    async def write_checkpoint(self, lease: Lease, checkpoint: RuntimeCheckpoint) -> None:
        _required(await self._rpc("write_runtime_checkpoint", _checkpoint_params(lease, checkpoint)),
                  "checkpoint write")

    async def suspend_for_approval(self, lease: Lease, checkpoint: RuntimeCheckpoint, **kwargs: Any) -> None:
        params = {
            "p_approval_id": kwargs["approval_id"], **_checkpoint_params(lease, checkpoint),
            "p_operation": kwargs["operation"], "p_argument_summary": kwargs["argument_summary"],
            "p_expires_at": _iso(kwargs["expires_at"]) if kwargs.get("expires_at") else None,
        }
        _required(await self._completion("suspend_runtime_for_approval", params,
            run_id=lease.run.run_id, expected_states=frozenset({"awaiting_approval"})),
            "approval suspension")

    async def complete_success(self, lease: Lease, *, output: StoredOutput,
                               costs: tuple[ActualCost, ...]) -> None:
        reservation_id = await self._active_reservation_id(lease)
        serialized = [{**cost.__dict__, "amount_usd": str(cost.amount_usd)} for cost in costs]
        _required(await self._completion("complete_runtime_success", {
            "p_run_id": lease.run.run_id, "p_attempt": lease.run.attempt,
            "p_lease_id": lease.lease_id, "p_worker_id": lease.worker_id,
            "p_output": output.__dict__, "p_costs": serialized,
            "p_reservation_id": reservation_id,
        }, run_id=lease.run.run_id, expected_states=frozenset({"completed"})), "success completion")

    async def complete_cancellation(self, lease: Lease, *, propagation: dict) -> None:
        _required(await self._completion("complete_runtime_cancellation", {
            "p_run_id": lease.run.run_id, "p_attempt": lease.run.attempt,
            "p_lease_id": lease.lease_id, "p_propagation": propagation,
        }, run_id=lease.run.run_id, expected_states=frozenset({"canceled"})), "cancellation completion")

    async def record_failure(self, lease: Lease, *, failure_class: str, detail: dict,
                             retryable: bool) -> None:
        _required(await self._completion("record_runtime_attempt_failure", {
            "p_run_id": lease.run.run_id, "p_attempt": lease.run.attempt,
            "p_lease_id": lease.lease_id, "p_failure_class": failure_class,
            "p_failure_detail": detail, "p_retryable": retryable,
            "p_max_attempts": self.max_attempts,
            "p_retry_delay_seconds": self.retry_delay_seconds,
        }, run_id=lease.run.run_id, expected_states=frozenset({"retrying", "failed"})),
            "failure completion")

    async def reconcile_expired(self, *, now: datetime) -> list[str]:
        data = await self._rpc("reconcile_expired_runtime_leases", {"p_now": _iso(now)})
        if not isinstance(data, list):
            raise ProviderUnavailable("lease reconciliation RPC returned an invalid shape")
        return [str(row["run_id"] if isinstance(row, dict) else row) for row in data]

    async def terminal_state(self, run_id: str) -> str | None:
        rows = await self._execute(
            self.client.table("runtime_runs").select("state").eq("id", run_id).limit(1)
        ) or []
        return str(rows[0]["state"]) if rows else None

    async def _active_reservation_id(self, lease: Lease) -> str | None:
        rows = await self._execute(
            self.client.table("runtime_usage_reservations").select("id,run_id,attempt,state,expires_at")
            .eq("run_id", lease.run.run_id).eq("attempt", lease.run.attempt)
            .eq("state", "reserved").limit(2)
        ) or []
        if len(rows) > 1:
            raise ProviderUnavailable("multiple active usage reservations for run attempt")
        if not rows:
            return None
        row = rows[0]
        if str(row.get("run_id")) != lease.run.run_id or int(row.get("attempt", -1)) != lease.run.attempt:
            raise ProviderUnavailable("usage reservation binding is invalid")
        if _aware_time(row.get("expires_at")) <= self.clock():
            raise ProviderUnavailable("usage reservation expired before completion")
        return str(row["id"])


def _checkpoint_params(lease: Lease, value: RuntimeCheckpoint) -> dict[str, Any]:
    return {
        "p_checkpoint_id": value.checkpoint_id, "p_run_id": value.run_id,
        "p_attempt": value.attempt, "p_lease_id": value.lease_id,
        "p_worker_id": lease.worker_id, "p_logical_state": value.logical_state,
        "p_working_set": value.working_set, "p_runtime_image_digest": value.runtime_image_digest,
        "p_state_digest": value.state_digest, "p_byte_size": value.byte_size,
    }


def _one(data: Any) -> dict[str, Any] | None:
    row = data[0] if isinstance(data, list) and data else data
    return row if isinstance(row, dict) else None


def _required(data: Any, boundary: str) -> dict[str, Any]:
    row = _one(data)
    if row is None:
        raise ProviderUnavailable(f"{boundary} RPC returned an invalid shape")
    return row


def _run(row: dict[str, Any]) -> RuntimeRun:
    return RuntimeRun(str(row["id"]), str(row["organization_id"]), str(row["project_id"]),
                      str(row["actor_id"]), str(row["agent_version_id"]), str(row["state"]),
                      int(row["attempt"]), int(row.get("version", 1)))


def _checkpoint(row: dict[str, Any]) -> RuntimeCheckpoint:
    return RuntimeCheckpoint(str(row["id"]), str(row["run_id"]), int(row["attempt"]),
        str(row["lease_id"]), int(row["event_sequence"]), dict(row["logical_state"]),
        dict(row["working_set"]), str(row["runtime_image_digest"]),
        str(row["state_digest"]), int(row["byte_size"]))


def _error_code(exc: Exception) -> str | None:
    code = getattr(exc, "code", None)
    if code is None and exc.args and isinstance(exc.args[0], dict):
        code = exc.args[0].get("code")
    return str(code) if code else None


def _is_transport_error(exc: Exception) -> bool:
    return isinstance(exc, (TimeoutError, ConnectionError, OSError)) or _error_code(exc) is None


def _redacted_error(exc: Exception) -> str:
    code = _error_code(exc)
    return f"Supabase RPC failed ({code})" if code else "Supabase RPC transport failed"


def _aware_time(value: Any) -> datetime:
    parsed = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ProviderUnavailable("database returned a timezone-naive timestamp")
    return parsed
