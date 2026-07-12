from __future__ import annotations

import asyncio
import inspect
import re
import time
from collections.abc import AsyncIterator, Awaitable, Callable, Sequence
from typing import Protocol

from .models import (
    CursorAhead,
    CursorInvalid,
    CursorStale,
    RunEvent,
    RunNotFound,
    RunScope,
    RunSnapshot,
    StreamConfig,
)
from .sse import event_frame, heartbeat_frame, snapshot_frame

DisconnectProbe = Callable[[], bool | Awaitable[bool]]
_EVENT_TOKEN = re.compile(r"^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$")
_IDENTIFIER = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$")
_SCHEMA_VERSION = re.compile(r"^[0-9]+\.[0-9]+$")


class RuntimeEventRepository(Protocol):
    """Port whose implementation must enforce all three scope predicates in DB queries."""

    async def get_snapshot(self, scope: RunScope) -> RunSnapshot | None: ...

    async def read_events_after(
        self, scope: RunScope, *, after_sequence: int, limit: int
    ) -> Sequence[RunEvent]: ...


class RuntimeStreamingService:
    def __init__(self, repository: RuntimeEventRepository, config: StreamConfig | None = None) -> None:
        self._repository = repository
        self._config = config or StreamConfig()

    async def snapshot(self, scope: RunScope) -> RunSnapshot:
        snapshot = await self._repository.get_snapshot(scope)
        if snapshot is None:
            # Deliberately identical for absent and inaccessible resources.
            raise RunNotFound("run was not found")
        if snapshot.scope != scope:
            raise RuntimeError("repository returned a snapshot outside the requested scope")
        self._validate_snapshot(snapshot)
        return snapshot

    async def preflight(self, scope: RunScope, *, cursor: int | None) -> RunSnapshot:
        """Validate stream access and cursor bounds before HTTP headers are committed."""

        snapshot = await self.snapshot(scope)
        if cursor is not None:
            self._validate_cursor(cursor, snapshot)
        return snapshot

    @staticmethod
    def parse_cursor(last_event_id: str | None, query_cursor: str | None = None) -> int | None:
        raw = last_event_id if last_event_id not in (None, "") else query_cursor
        if raw in (None, ""):
            return None
        try:
            cursor = int(raw)
        except (TypeError, ValueError) as exc:
            raise CursorInvalid("cursor must be a non-negative integer") from exc
        if cursor < 0 or str(cursor) != raw:
            raise CursorInvalid("cursor must be a canonical non-negative integer")
        return cursor

    async def stream(
        self,
        scope: RunScope,
        *,
        cursor: int | None,
        disconnected: DisconnectProbe | None = None,
        initial_snapshot: RunSnapshot | None = None,
    ) -> AsyncIterator[bytes]:
        snapshot = initial_snapshot or await self.preflight(scope, cursor=cursor)
        if snapshot.scope != scope:
            raise RuntimeError("initial snapshot was outside the requested scope")
        self._validate_snapshot(snapshot)
        if cursor is None:
            cursor = snapshot.latest_sequence
            yield snapshot_frame(snapshot)
        else:
            self._validate_cursor(cursor, snapshot)

        last_emit = time.monotonic()
        last_activity = last_emit
        while True:
            if await self._is_disconnected(disconnected):
                return

            events = await self._repository.read_events_after(
                scope, after_sequence=cursor, limit=self._config.batch_size
            )
            self._validate_batch(events, cursor, self._config.batch_size)
            if events:
                for event in events:
                    if await self._is_disconnected(disconnected):
                        return
                    cursor = event.sequence
                    yield event_frame(event)
                    last_emit = last_activity = time.monotonic()
                # Drain backlog without sleeping, but never request an unbounded batch.
                continue

            current = await self.snapshot(scope)
            self._validate_cursor(cursor, current)
            if current.state in self._config.terminal_states and cursor >= current.latest_sequence:
                return

            now = time.monotonic()
            if now - last_activity >= self._config.max_idle_seconds:
                return
            if now - last_emit >= self._config.heartbeat_interval_seconds:
                yield heartbeat_frame(cursor)
                last_emit = time.monotonic()
            await self._interruptible_pause(disconnected)

    def _validate_cursor(self, cursor: int, snapshot: RunSnapshot) -> None:
        minimum_cursor = max(0, snapshot.minimum_available_sequence - 1)
        if cursor < minimum_cursor:
            raise CursorStale(minimum_cursor)
        if cursor > snapshot.latest_sequence:
            raise CursorAhead(snapshot.latest_sequence)

    @staticmethod
    def _validate_snapshot(snapshot: RunSnapshot) -> None:
        if snapshot.latest_sequence < 0:
            raise RuntimeError("repository returned a negative snapshot sequence")
        if snapshot.minimum_available_sequence < 1:
            raise RuntimeError("repository returned an invalid minimum available sequence")
        if snapshot.minimum_available_sequence > snapshot.latest_sequence + 1:
            raise RuntimeError("repository returned inconsistent snapshot sequence bounds")
        if not _EVENT_TOKEN.fullmatch(snapshot.state):
            raise RuntimeError("repository returned an invalid run state")

    @staticmethod
    def _validate_batch(events: Sequence[RunEvent], cursor: int, requested_limit: int) -> None:
        if len(events) > requested_limit:
            raise RuntimeError("repository returned more events than the requested limit")
        previous = cursor
        for event in events:
            if event.sequence < 0:
                raise RuntimeError("repository returned a negative event sequence")
            if event.sequence <= previous:
                raise RuntimeError("repository returned duplicate or unordered durable events")
            if not _EVENT_TOKEN.fullmatch(event.event_type):
                raise RuntimeError("repository returned an invalid SSE event type")
            if not _IDENTIFIER.fullmatch(event.event_id):
                raise RuntimeError("repository returned an invalid event identifier")
            if not _SCHEMA_VERSION.fullmatch(event.schema_version):
                raise RuntimeError("repository returned an invalid event schema version")
            if event.occurred_at.tzinfo is None or event.occurred_at.utcoffset() is None:
                raise RuntimeError("repository returned a timezone-naive event timestamp")
            previous = event.sequence

    async def _interruptible_pause(self, disconnected: DisconnectProbe | None) -> None:
        deadline = time.monotonic() + self._config.poll_interval_seconds
        while True:
            if await self._is_disconnected(disconnected):
                return
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return
            await asyncio.sleep(min(remaining, 0.1))

    @staticmethod
    async def _is_disconnected(probe: DisconnectProbe | None) -> bool:
        if probe is None:
            return False
        result = probe()
        return bool(await result) if inspect.isawaitable(result) else bool(result)
