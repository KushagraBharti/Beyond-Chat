from __future__ import annotations

from typing import Any

from src.runtime_store import SupabaseDataStore


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
