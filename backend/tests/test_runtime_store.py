from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from src.runtime_store import SupabaseDataStore
from src.runtime.supabase_adapter import SupabasePostgresRuntimeRepository


class FakeResponse:
    def __init__(self, data: Any) -> None:
        self.data = data


class FakeQuery:
    def __init__(self, client: "FakeSupabaseClient", table_name: str) -> None:
        self.client = client
        self.table_name = table_name
        self.filters: list[tuple[str, Any]] = []
        self.or_filters: list[str] = []
        self.single = False
        self.client.queries.append(self)

    def select(self, _columns: str) -> "FakeQuery":
        return self

    def eq(self, column: str, value: Any) -> "FakeQuery":
        self.filters.append((column, value))
        return self

    def or_(self, expression: str) -> "FakeQuery":
        self.or_filters.append(expression)
        return self

    def maybe_single(self) -> "FakeQuery":
        self.single = True
        return self

    def order(self, _column: str, desc: bool = False) -> "FakeQuery":
        return self

    def execute(self) -> FakeResponse:
        rows = self.client.rows.get(self.table_name, [])
        for column, value in self.filters:
            rows = [row for row in rows if row.get(column) == value]
        if self.single:
            return FakeResponse(rows[0] if rows else None)
        return FakeResponse(rows)


class FakeSupabaseClient:
    def __init__(self, rows: dict[str, list[dict[str, Any]]]) -> None:
        self.rows = rows
        self.queries: list[FakeQuery] = []

    def table(self, table_name: str) -> FakeQuery:
        return FakeQuery(self, table_name)


class FakeRpcQuery:
    def __init__(self, data: Any) -> None:
        self.data = data

    def execute(self) -> FakeResponse:
        return FakeResponse(self.data)


class FakeRuntimeClient:
    def __init__(self, responses: dict[str, Any]) -> None:
        self.responses = responses
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def rpc(self, name: str, params: dict[str, Any]) -> FakeRpcQuery:
        self.calls.append((name, params))
        return FakeRpcQuery(self.responses[name])


class StubSupabaseDataStore(SupabaseDataStore):
    def __init__(self, client: FakeSupabaseClient, user_id: str) -> None:
        super().__init__(access_token="test-token", user_id=user_id)
        self._client = client

    @property
    def client(self) -> FakeSupabaseClient:
        return self._client


def test_supabase_get_artifact_applies_profile_scope_filter():
    client = FakeSupabaseClient(
        {
            "artifacts": [
                {
                    "id": "artifact-1",
                    "workspace_id": "workspace-1",
                    "created_by": "user-1",
                    "owner_profile_id": "user-1",
                    "type": "report",
                    "title": "Profile scoped report",
                    "content": "Report body",
                    "content_json": None,
                    "content_format": "markdown",
                    "summary": "Summary",
                    "preview_image": None,
                    "tags": ["research"],
                    "studio": "research",
                    "metadata": {},
                    "created_at": "2026-05-04T00:00:00Z",
                    "updated_at": "2026-05-04T00:00:00Z",
                    "storage_path": None,
                    "source_run_id": None,
                }
            ]
        }
    )
    store = StubSupabaseDataStore(client, user_id="user-1")

    artifact = store.get_artifact("workspace-1", "artifact-1")

    assert artifact is not None
    assert artifact["id"] == "artifact-1"
    assert artifact["ownerProfileId"] == "user-1"
    artifact_query = client.queries[0]
    assert artifact_query.filters == [("workspace_id", "workspace-1"), ("id", "artifact-1")]
    assert artifact_query.or_filters == ["owner_profile_id.eq.user-1,created_by.eq.user-1"]
    assert artifact_query.single is True


def test_supabase_get_run_applies_profile_scope_filter_and_loads_steps():
    client = FakeSupabaseClient(
        {
            "runs": [
                {
                    "id": "run-1",
                    "workspace_id": "workspace-1",
                    "created_by": "user-1",
                    "owner_profile_id": "user-1",
                    "studio": "data",
                    "title": "Data run",
                    "prompt": "Analyze this",
                    "status": "completed",
                    "model": "openai/test",
                    "options": {},
                    "output": {"content": "Done"},
                    "error_message": None,
                    "created_at": "2026-05-04T00:00:00Z",
                    "completed_at": "2026-05-04T00:01:00Z",
                    "metadata": {},
                }
            ],
            "run_steps": [
                {
                    "id": "step-1",
                    "run_id": "run-1",
                    "workspace_id": "workspace-1",
                    "step_name": "analyze",
                    "tool_used": "openrouter",
                    "status": "completed",
                    "input": {"prompt": "Analyze this"},
                    "output": {"content": "Done"},
                    "created_at": "2026-05-04T00:00:30Z",
                }
            ],
        }
    )
    store = StubSupabaseDataStore(client, user_id="user-1")

    run = store.get_run("workspace-1", "run-1")

    assert run is not None
    assert run["id"] == "run-1"
    assert run["ownerProfileId"] == "user-1"
    assert [step["id"] for step in run["steps"]] == ["step-1"]
    run_query = client.queries[0]
    assert run_query.filters == [("workspace_id", "workspace-1"), ("id", "run-1")]
    assert run_query.or_filters == ["owner_profile_id.eq.user-1,created_by.eq.user-1"]
    assert run_query.single is True


def _runtime_row(state: str = "running") -> dict[str, Any]:
    return {
        "id": "run_1", "organization_id": "org_1", "project_id": "project_1",
        "actor_id": "actor_1", "agent_version_id": "agent_v1", "state": state,
        "attempt": 2, "version": 4,
    }


def test_runtime_repository_exposes_atomic_persistence_rpcs() -> None:
    assert {
        "complete_runtime_cancellation", "reserve_runtime_usage",
        "adjust_runtime_usage_reservation", "release_runtime_usage_reservation",
        "record_runtime_attempt_failure",
    } <= SupabasePostgresRuntimeRepository.REQUIRED_RPCS


def test_runtime_repository_calls_atomic_cancellation_and_failure_rpcs() -> None:
    client = FakeRuntimeClient({
        "complete_runtime_cancellation": _runtime_row("canceled"),
        "record_runtime_attempt_failure": _runtime_row("retrying"),
    })
    repository = SupabasePostgresRuntimeRepository(client)

    canceled = repository.complete_cancellation(
        "run_1", attempt=2, lease_id="lease_1", propagation={"provider": "confirmed"},
    )
    failed = repository.record_attempt_failure(
        "run_1", attempt=2, lease_id="lease_1", failure_class="provider_timeout",
        failure_detail={"status": 504}, retryable=True, max_attempts=3,
        retry_delay_seconds=30,
    )

    assert canceled.state == "canceled"
    assert failed.state == "retrying"
    assert client.calls == [
        ("complete_runtime_cancellation", {
            "p_run_id": "run_1", "p_attempt": 2, "p_lease_id": "lease_1",
            "p_propagation": {"provider": "confirmed"},
        }),
        ("record_runtime_attempt_failure", {
            "p_run_id": "run_1", "p_attempt": 2, "p_lease_id": "lease_1",
            "p_failure_class": "provider_timeout", "p_failure_detail": {"status": 504},
            "p_retryable": True, "p_max_attempts": 3, "p_retry_delay_seconds": 30,
        }),
    ]


def test_runtime_repository_calls_usage_reservation_rpcs() -> None:
    expires_at = datetime.fromisoformat("2026-07-12T02:00:00+00:00")
    reservation = {
        "id": "reservation_1", "run_id": "run_1", "state": "reserved",
        "amount_usd": "1.2500000000",
    }
    released = {**reservation, "state": "released", "release_reason": "completed"}
    client = FakeRuntimeClient({
        "reserve_runtime_usage": reservation,
        "adjust_runtime_usage_reservation": {**reservation, "amount_usd": "2.0000000000"},
        "release_runtime_usage_reservation": released,
    })
    repository = SupabasePostgresRuntimeRepository(client)

    assert repository.reserve_usage(
        reservation_id="reservation_1", run_id="run_1", attempt=2,
        amount_usd="1.25", hard_limit_usd="10.00", expires_at=expires_at,
        idempotency_key="usage-key-1",
    )["state"] == "reserved"
    assert repository.adjust_usage_reservation(
        "reservation_1", amount_usd="2.00", hard_limit_usd="10.00",
    )["amount_usd"] == "2.0000000000"
    assert repository.release_usage_reservation("reservation_1", reason="completed")["state"] == "released"
    assert client.calls == [
        ("reserve_runtime_usage", {
            "p_reservation_id": "reservation_1", "p_run_id": "run_1", "p_attempt": 2,
            "p_amount_usd": "1.25", "p_hard_limit_usd": "10.00",
            "p_expires_at": "2026-07-12T02:00:00Z", "p_idempotency_key": "usage-key-1",
        }),
        ("adjust_runtime_usage_reservation", {
            "p_reservation_id": "reservation_1", "p_amount_usd": "2.00",
            "p_hard_limit_usd": "10.00",
        }),
        ("release_runtime_usage_reservation", {
            "p_reservation_id": "reservation_1", "p_reason": "completed",
        }),
    ]


def test_phase3_atomic_persistence_sql_is_service_only_and_atomic() -> None:
    migration = (
        Path(__file__).resolve().parents[2]
        / "supabase/migrations/20260712013000_phase3_runtime_atomic_persistence.sql"
    ).read_text(encoding="utf-8")

    assert "alter table public.runtime_usage_reservations enable row level security" in migration
    assert "revoke all on public.runtime_usage_reservations from public, anon, authenticated" in migration
    for signature in (
        "public.complete_runtime_cancellation(text, integer, uuid, jsonb)",
        "public.reserve_runtime_usage(text, text, integer, numeric, numeric, timestamptz, text)",
        "public.adjust_runtime_usage_reservation(text, numeric, numeric)",
        "public.release_runtime_usage_reservation(text, text)",
        "public.record_runtime_attempt_failure(text, integer, uuid, text, jsonb, boolean, integer, integer)",
    ):
        assert f"revoke all on function {signature} from public, anon, authenticated" in migration
    assert migration.count("security definer") == 5
    assert migration.count("set search_path = pg_catalog, public") == 5
    assert "pg_advisory_xact_lock" in migration
    assert "actual_total + reserved_total + p_amount_usd > p_hard_limit_usd" in migration
    assert "p_max_attempts not between 1 and 100" in migration
    assert "p_retry_delay_seconds not between 0 and 3600" in migration
    assert "'run.canceled'" in migration
    assert "'usage.reserved'" in migration
    assert "'usage.reservation_adjusted'" in migration
    assert "'usage.reservation_released'" in migration
    assert "'run.retry_scheduled'" in migration
    assert "'run.failed'" in migration
