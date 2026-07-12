from __future__ import annotations

import json
from typing import Any, Mapping

from .models import RunEvent, RunSnapshot


def _json(value: Mapping[str, Any]) -> str:
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False, default=str)


def event_frame(event: RunEvent) -> bytes:
    envelope = {
        "event_id": event.event_id,
        "event_type": event.event_type,
        "schema_version": event.schema_version,
        "sequence": event.sequence,
        "occurred_at": event.occurred_at.isoformat(),
        "payload": dict(event.payload),
    }
    return f"id: {event.sequence}\nevent: {event.event_type}\ndata: {_json(envelope)}\n\n".encode()


def snapshot_frame(snapshot: RunSnapshot) -> bytes:
    body = {
        "organization_id": snapshot.scope.organization_id,
        "project_id": snapshot.scope.project_id,
        "run_id": snapshot.scope.run_id,
        "state": snapshot.state,
        "latest_sequence": snapshot.latest_sequence,
        "minimum_available_sequence": snapshot.minimum_available_sequence,
        "projection": dict(snapshot.projection),
    }
    return f"id: {snapshot.latest_sequence}\nevent: snapshot\ndata: {_json(body)}\n\n".encode()


def heartbeat_frame(cursor: int) -> bytes:
    return f": heartbeat cursor={cursor}\n\n".encode()
