from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Mapping


@dataclass(frozen=True)
class RunScope:
    organization_id: str
    project_id: str
    run_id: str


@dataclass(frozen=True)
class RunEvent:
    event_id: str
    sequence: int
    event_type: str
    occurred_at: datetime
    payload: Mapping[str, Any]
    schema_version: str = "1.0"


@dataclass(frozen=True)
class RunSnapshot:
    scope: RunScope
    state: str
    latest_sequence: int
    minimum_available_sequence: int
    projection: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class StreamConfig:
    batch_size: int = 100
    poll_interval_seconds: float = 0.5
    heartbeat_interval_seconds: float = 15.0
    max_idle_seconds: float = 300.0
    terminal_states: frozenset[str] = frozenset({"completed", "failed", "canceled"})

    def __post_init__(self) -> None:
        if not 1 <= self.batch_size <= 1000:
            raise ValueError("batch_size must be between 1 and 1000")
        if self.poll_interval_seconds <= 0:
            raise ValueError("poll_interval_seconds must be positive")
        if self.heartbeat_interval_seconds <= 0:
            raise ValueError("heartbeat_interval_seconds must be positive")
        if self.max_idle_seconds <= 0:
            raise ValueError("max_idle_seconds must be positive")


class RuntimeStreamError(Exception):
    """Stable service error suitable for mapping at an HTTP integration edge."""

    code = "runtime_stream.error"


class RunNotFound(RuntimeStreamError):
    code = "runtime_stream.not_found"


class CursorInvalid(RuntimeStreamError):
    code = "runtime_stream.cursor_invalid"


class CursorStale(RuntimeStreamError):
    code = "runtime_stream.cursor_stale"

    def __init__(self, minimum_cursor: int) -> None:
        self.minimum_cursor = minimum_cursor
        super().__init__(f"cursor is stale; minimum accepted cursor is {minimum_cursor}")


class CursorAhead(RuntimeStreamError):
    code = "runtime_stream.cursor_ahead"

    def __init__(self, latest_cursor: int) -> None:
        self.latest_cursor = latest_cursor
        super().__init__(f"cursor is ahead of the run; latest cursor is {latest_cursor}")
