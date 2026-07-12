from __future__ import annotations

import asyncio
from dataclasses import replace
from datetime import UTC, datetime

import pytest

from src.runtime_streaming import (
    CursorAhead,
    CursorInvalid,
    CursorStale,
    RunEvent,
    RunNotFound,
    RunScope,
    RunSnapshot,
    RuntimeStreamingService,
    StreamConfig,
)

NOW = datetime(2026, 7, 12, tzinfo=UTC)
SCOPE = RunScope("org_1", "project_1", "run_1")


class Repository:
    def __init__(self, snapshot: RunSnapshot | None, events: list[RunEvent] | None = None) -> None:
        self.current = snapshot
        self.events = events or []
        self.reads: list[tuple[RunScope, int, int]] = []

    async def get_snapshot(self, scope: RunScope) -> RunSnapshot | None:
        return self.current if self.current and scope == self.current.scope else None

    async def read_events_after(self, scope: RunScope, *, after_sequence: int, limit: int):
        self.reads.append((scope, after_sequence, limit))
        return [event for event in self.events if event.sequence > after_sequence][:limit]


def snapshot(state: str = "running", latest: int = 0, minimum: int = 1) -> RunSnapshot:
    return RunSnapshot(SCOPE, state, latest, minimum, {"message": "current"})


def event(sequence: int, event_type: str = "message.delta") -> RunEvent:
    return RunEvent(f"evt_{sequence}", sequence, event_type, NOW, {"text": str(sequence)})


async def collect(service: RuntimeStreamingService, cursor: int | None = None) -> list[bytes]:
    return [frame async for frame in service.stream(SCOPE, cursor=cursor)]


def test_cursor_header_precedence_and_validation() -> None:
    assert RuntimeStreamingService.parse_cursor("7", "3") == 7
    assert RuntimeStreamingService.parse_cursor(None, "0") == 0
    assert RuntimeStreamingService.parse_cursor(None, None) is None
    for value in ("-1", "01", "1.0", "abc", " 1 "):
        with pytest.raises(CursorInvalid):
            RuntimeStreamingService.parse_cursor(value)


@pytest.mark.asyncio
async def test_fresh_stream_starts_with_snapshot_and_closes_when_terminal() -> None:
    repository = Repository(snapshot("completed", latest=2), [event(1), event(2, "run.completed")])
    frames = await collect(RuntimeStreamingService(repository), None)
    assert len(frames) == 1
    assert frames[0].startswith(b"id: 2\nevent: snapshot\n")
    assert repository.reads == [(SCOPE, 2, 100)]


@pytest.mark.asyncio
async def test_reconnect_replays_ordered_bounded_batches_then_terminal_close() -> None:
    repository = Repository(snapshot("completed", latest=5), [event(i) for i in range(1, 6)])
    service = RuntimeStreamingService(repository, StreamConfig(batch_size=2))
    frames = await collect(service, 1)
    assert [frame.split(b"\n", 1)[0] for frame in frames] == [b"id: 2", b"id: 3", b"id: 4", b"id: 5"]
    assert [read[1:] for read in repository.reads] == [(1, 2), (3, 2), (5, 2)]


@pytest.mark.asyncio
async def test_stale_ahead_and_cross_scope_are_non_streaming_failures() -> None:
    service = RuntimeStreamingService(Repository(snapshot(latest=10, minimum=5)))
    with pytest.raises(CursorStale) as stale:
        await anext(service.stream(SCOPE, cursor=3))
    assert stale.value.minimum_cursor == 4
    with pytest.raises(CursorAhead):
        await anext(service.stream(SCOPE, cursor=11))
    with pytest.raises(RunNotFound):
        await service.snapshot(RunScope("other_org", "project_1", "run_1"))


@pytest.mark.asyncio
async def test_disconnect_stops_polling_and_generator_cancellation_is_safe() -> None:
    repository = Repository(snapshot())
    disconnected = False

    async def probe() -> bool:
        return disconnected

    service = RuntimeStreamingService(repository, StreamConfig(poll_interval_seconds=0.01, heartbeat_interval_seconds=60))
    stream = service.stream(SCOPE, cursor=0, disconnected=probe)
    task = asyncio.create_task(anext(stream))
    await asyncio.sleep(0.02)
    disconnected = True
    with pytest.raises(StopAsyncIteration):
        await task
    reads_after_disconnect = len(repository.reads)
    await asyncio.sleep(0.02)
    assert len(repository.reads) == reads_after_disconnect
    await stream.aclose()


@pytest.mark.asyncio
async def test_repository_order_violation_fails_closed() -> None:
    repository = Repository(snapshot("completed", latest=2), [event(2), event(1)])
    with pytest.raises(RuntimeError, match="unordered"):
        await collect(RuntimeStreamingService(repository), 0)


@pytest.mark.asyncio
async def test_scope_mismatch_from_repository_fails_closed() -> None:
    repository = Repository(replace(snapshot(), scope=RunScope("org_2", "project_1", "run_1")))
    repository.get_snapshot = lambda _scope: asyncio.sleep(0, result=repository.current)  # type: ignore[method-assign]
    with pytest.raises(RuntimeError, match="outside"):
        await RuntimeStreamingService(repository).snapshot(SCOPE)


@pytest.mark.asyncio
async def test_newline_event_type_injection_fails_before_framing() -> None:
    repository = Repository(snapshot("completed", latest=1), [event(1, "run.completed\ndata: injected")])
    with pytest.raises(RuntimeError, match="event type"):
        await collect(RuntimeStreamingService(repository), 0)


@pytest.mark.asyncio
async def test_oversized_repository_batch_fails_closed() -> None:
    class OversizedRepository(Repository):
        async def read_events_after(self, scope: RunScope, *, after_sequence: int, limit: int):
            return [event(1), event(2)]

    repository = OversizedRepository(snapshot("completed", latest=2))
    service = RuntimeStreamingService(repository, StreamConfig(batch_size=1))
    with pytest.raises(RuntimeError, match="requested limit"):
        await collect(service, 0)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "invalid_snapshot",
    [
        snapshot(latest=-1),
        snapshot(latest=2, minimum=0),
        snapshot(latest=2, minimum=4),
        snapshot(state="running\nevent: forged"),
    ],
)
async def test_invalid_snapshot_invariants_fail_closed(invalid_snapshot: RunSnapshot) -> None:
    with pytest.raises(RuntimeError):
        await RuntimeStreamingService(Repository(invalid_snapshot)).snapshot(SCOPE)


@pytest.mark.asyncio
async def test_invalid_event_sequence_and_timestamp_fail_closed() -> None:
    class NegativeSequenceRepository(Repository):
        async def read_events_after(self, scope: RunScope, *, after_sequence: int, limit: int):
            return [event(-1)]

    repository = NegativeSequenceRepository(snapshot("completed", latest=1))
    with pytest.raises(RuntimeError, match="negative event sequence"):
        await collect(RuntimeStreamingService(repository), 0)

    naive = replace(event(1), occurred_at=datetime(2026, 7, 12))
    repository = Repository(snapshot("completed", latest=1), [naive])
    with pytest.raises(RuntimeError, match="timezone-naive"):
        await collect(RuntimeStreamingService(repository), 0)
