from __future__ import annotations

import asyncio
from collections.abc import Mapping, Sequence
from datetime import datetime
from typing import Any, Protocol

from .models import RunEvent, RunScope, RunSnapshot


class _Response(Protocol):
    data: Any


class _PostgrestClient(Protocol):
    def rpc(self, name: str, params: Mapping[str, Any]) -> Any: ...


class SupabaseRuntimeEventRepository:
    """PostgREST adapter for the authoritative runtime stream read model."""

    SNAPSHOT_RPC = "runtime_stream_snapshot"
    EVENTS_RPC = "runtime_stream_events_after"

    def __init__(self, client: _PostgrestClient) -> None:
        self._client = client

    async def get_snapshot(self, scope: RunScope) -> RunSnapshot | None:
        response = await asyncio.to_thread(
            lambda: self._client.rpc(
                self.SNAPSHOT_RPC,
                {
                    "p_organization_id": scope.organization_id,
                    "p_project_id": scope.project_id,
                    "p_run_id": scope.run_id,
                },
            ).execute()
        )
        rows = _rows(response)
        if not rows:
            return None
        if len(rows) != 1:
            raise RuntimeError("snapshot RPC returned an invalid row count")
        row = _mapping(rows[0], "snapshot")
        _require_scope(row, scope, "snapshot")
        projection = _mapping(row.get("projection"), "snapshot projection")
        return RunSnapshot(
            scope=scope,
            state=_string(row, "state", "snapshot"),
            latest_sequence=_integer(row, "latest_sequence", "snapshot", minimum=0),
            minimum_available_sequence=_integer(
                row, "minimum_available_sequence", "snapshot", minimum=1
            ),
            projection=dict(projection),
        )

    async def read_events_after(
        self, scope: RunScope, *, after_sequence: int, limit: int
    ) -> Sequence[RunEvent]:
        if (
            isinstance(after_sequence, bool)
            or not isinstance(after_sequence, int)
            or after_sequence < 0
        ):
            raise ValueError("after_sequence must be a non-negative integer")
        if (
            isinstance(limit, bool)
            or not isinstance(limit, int)
            or not 1 <= limit <= 1000
        ):
            raise ValueError("limit must be between 1 and 1000")

        response = await asyncio.to_thread(
            lambda: self._client.rpc(
                self.EVENTS_RPC,
                {
                    "p_organization_id": scope.organization_id,
                    "p_project_id": scope.project_id,
                    "p_run_id": scope.run_id,
                    "p_after_sequence": after_sequence,
                    "p_limit": limit,
                },
            ).execute()
        )
        rows = _rows(response)
        events: list[RunEvent] = []
        for value in rows:
            row = _mapping(value, "event")
            _require_scope(row, scope, "event")
            schema_version = _integer(row, "schema_version", "event", minimum=1)
            events.append(
                RunEvent(
                    event_id=str(_integer(row, "id", "event", minimum=1)),
                    sequence=_integer(row, "sequence", "event", minimum=1),
                    event_type=_string(row, "event_type", "event"),
                    schema_version=f"{schema_version}.0",
                    payload=dict(_mapping(row.get("payload"), "event payload")),
                    occurred_at=_timestamp(row, "occurred_at", "event"),
                )
            )
        return events


def _rows(response: _Response) -> list[Any]:
    data = getattr(response, "data", None)
    if data is None:
        return []
    if not isinstance(data, list):
        raise RuntimeError("PostgREST response data must be a list")
    return data


def _mapping(value: Any, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise RuntimeError(f"{label} must be an object")
    return value


def _string(row: Mapping[str, Any], key: str, label: str) -> str:
    value = row.get(key)
    if not isinstance(value, str) or not value:
        raise RuntimeError(f"{label} {key} must be a non-empty string")
    return value


def _integer(row: Mapping[str, Any], key: str, label: str, *, minimum: int) -> int:
    value = row.get(key)
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise RuntimeError(f"{label} {key} must be an integer >= {minimum}")
    return value


def _timestamp(row: Mapping[str, Any], key: str, label: str) -> datetime:
    value = _string(row, key, label)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise RuntimeError(f"{label} {key} must be an ISO-8601 timestamp") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise RuntimeError(f"{label} {key} must include a timezone")
    return parsed


def _require_scope(row: Mapping[str, Any], scope: RunScope, label: str) -> None:
    actual = (
        _string(row, "organization_id", label),
        _string(row, "project_id", label),
        _string(row, "run_id", label),
    )
    expected = (scope.organization_id, scope.project_id, scope.run_id)
    if actual != expected:
        raise RuntimeError(f"{label} row was outside the requested scope")
