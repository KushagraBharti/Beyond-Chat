from __future__ import annotations

from typing import Any

import pytest

from src.runtime_streaming.models import RunScope
from src.runtime_streaming.postgrest_repository import SupabaseRuntimeEventRepository

SCOPE = RunScope("org-a", "project-a", "run-a")


class Response:
    def __init__(self, data: Any) -> None:
        self.data = data


class Query:
    def __init__(self, data: Any, calls: list[tuple[Any, ...]]) -> None:
        self.data = data
        self.calls = calls

    def execute(self):
        self.calls.append(("execute",))
        return Response(self.data)


class Client:
    def __init__(self, *, snapshot: Any, events: Any = None) -> None:
        self.snapshot = snapshot
        self.events = events or []
        self.calls: list[tuple[Any, ...]] = []

    def rpc(self, name: str, params: dict[str, Any]):
        self.calls.append(("rpc", name, params))
        data = self.snapshot if name == "runtime_stream_snapshot" else self.events
        return Query(data, self.calls)


def snapshot_row(**overrides: Any) -> dict[str, Any]:
    row = {
        "organization_id": "org-a",
        "project_id": "project-a",
        "run_id": "run-a",
        "state": "running",
        "latest_sequence": 2,
        "minimum_available_sequence": 1,
        "projection": {"attempt": 1, "message": "current"},
    }
    row.update(overrides)
    return row


def event_row(sequence: int, **overrides: Any) -> dict[str, Any]:
    row = {
        "id": sequence + 100,
        "organization_id": "org-a",
        "project_id": "project-a",
        "run_id": "run-a",
        "sequence": sequence,
        "event_type": "message.delta",
        "schema_version": 1,
        "payload": {"text": str(sequence)},
        "occurred_at": "2026-07-12T01:00:00Z",
    }
    row.update(overrides)
    return row


@pytest.mark.asyncio
async def test_snapshot_rpc_is_fully_scoped_and_projection_is_exact() -> None:
    client = Client(snapshot=[snapshot_row()])
    result = await SupabaseRuntimeEventRepository(client).get_snapshot(SCOPE)
    assert result is not None
    assert result.projection == {"attempt": 1, "message": "current"}
    assert client.calls[0] == (
        "rpc",
        "runtime_stream_snapshot",
        {
            "p_organization_id": "org-a",
            "p_project_id": "project-a",
            "p_run_id": "run-a",
        },
    )


@pytest.mark.asyncio
async def test_absent_or_inaccessible_snapshot_has_identical_none_shape() -> None:
    assert (
        await SupabaseRuntimeEventRepository(Client(snapshot=[])).get_snapshot(SCOPE)
        is None
    )


@pytest.mark.asyncio
async def test_event_read_has_all_scope_predicates_order_and_bound() -> None:
    client = Client(snapshot=[], events=[event_row(2), event_row(3)])
    events = await SupabaseRuntimeEventRepository(client).read_events_after(
        SCOPE, after_sequence=1, limit=2
    )
    assert [event.sequence for event in events] == [2, 3]
    assert client.calls[0] == (
        "rpc",
        "runtime_stream_events_after",
        {
            "p_organization_id": "org-a",
            "p_project_id": "project-a",
            "p_run_id": "run-a",
            "p_after_sequence": 1,
            "p_limit": 2,
        },
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "after_sequence,limit", [(-1, 1), (0, 0), (0, 1001), (True, 1), (0, True)]
)
async def test_event_read_rejects_invalid_bounds_before_rpc(
    after_sequence: Any, limit: Any
) -> None:
    client = Client(snapshot=[])
    with pytest.raises(ValueError):
        await SupabaseRuntimeEventRepository(client).read_events_after(
            SCOPE, after_sequence=after_sequence, limit=limit
        )
    assert client.calls == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "row,match",
    [
        (snapshot_row(projection=[]), "projection"),
        (snapshot_row(latest_sequence=True), "latest_sequence"),
        (snapshot_row(organization_id="org-b"), "outside"),
    ],
)
async def test_malformed_snapshot_rows_fail_closed(
    row: dict[str, Any], match: str
) -> None:
    with pytest.raises(RuntimeError, match=match):
        await SupabaseRuntimeEventRepository(Client(snapshot=[row])).get_snapshot(SCOPE)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "row,match",
    [
        (event_row(1, payload=[]), "payload"),
        (event_row(1, occurred_at="2026-07-12T01:00:00"), "timezone"),
        (event_row(1, project_id="project-b"), "outside"),
    ],
)
async def test_malformed_event_rows_fail_closed(
    row: dict[str, Any], match: str
) -> None:
    repository = SupabaseRuntimeEventRepository(Client(snapshot=[], events=[row]))
    with pytest.raises(RuntimeError, match=match):
        await repository.read_events_after(SCOPE, after_sequence=0, limit=10)
