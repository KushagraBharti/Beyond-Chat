from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from threading import RLock
from uuid import uuid4

from .contracts import ConflictError, ProductRecord, Scope


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class InMemoryProductRepository:
    """Deterministic adapter used by contract tests; mirrors database invariants."""

    def __init__(self) -> None:
        self._records: dict[tuple[str, str], ProductRecord] = {}
        self._idempotency: dict[tuple[str, str, str], tuple[str, str, str]] = {}
        self._lock = RLock()

    @staticmethod
    def _in_scope(record: ProductRecord, scope: Scope) -> bool:
        return record.scope == scope

    @staticmethod
    def _copy(record: ProductRecord) -> ProductRecord:
        return ProductRecord(**{**record.__dict__, "payload": deepcopy(record.payload)})

    def list(self, *, kind: str, scope: Scope, states: tuple[str, ...] = ()) -> list[ProductRecord]:
        with self._lock:
            rows = [r for (k, _), r in self._records.items() if k == kind and self._in_scope(r, scope)]
            if states:
                rows = [r for r in rows if r.state in states]
            return [self._copy(r) for r in sorted(rows, key=lambda row: (row.updated_at, row.id), reverse=True)]

    def get(self, *, kind: str, record_id: str, scope: Scope) -> ProductRecord | None:
        with self._lock:
            value = self._records.get((kind, record_id))
            return self._copy(value) if value and self._in_scope(value, scope) else None

    def create_once(self, *, kind: str, scope: Scope, actor_id: str, idempotency_key: str,
                    request_digest: str, state: str, payload) -> ProductRecord:
        with self._lock:
            key = (scope.organization_id, kind, idempotency_key)
            existing = self._idempotency.get(key)
            if existing:
                digest, existing_kind, record_id = existing
                if digest != request_digest or existing_kind != kind:
                    raise ConflictError("idempotency_key_reused")
                return self._copy(self._records[(kind, record_id)])
            now = _now()
            record = ProductRecord(str(uuid4()), kind, scope, state, 1, deepcopy(dict(payload)), actor_id, now, now)
            self._records[(kind, record.id)] = record
            self._idempotency[key] = (request_digest, kind, record.id)
            return self._copy(record)

    def update(self, *, kind: str, record_id: str, scope: Scope, actor_id: str,
               expected_version: int, state: str | None = None, payload=None) -> ProductRecord:
        del actor_id
        with self._lock:
            current = self._records.get((kind, record_id))
            if current is None or not self._in_scope(current, scope):
                raise KeyError("not_found")
            if current.version != expected_version:
                raise ConflictError("stale_version")
            merged = deepcopy(current.payload)
            if payload is not None:
                merged.update(deepcopy(dict(payload)))
            updated = ProductRecord(current.id, kind, scope, state or current.state,
                                    current.version + 1, merged, current.created_by,
                                    current.created_at, _now())
            self._records[(kind, record_id)] = updated
            return self._copy(updated)

    def append_once(self, *, kind: str, parent_kind: str, parent_id: str, scope: Scope,
                    actor_id: str, idempotency_key: str, request_digest: str, state: str, payload) -> ProductRecord:
        if self.get(kind=parent_kind, record_id=parent_id, scope=scope) is None:
            raise KeyError("parent_not_found")
        value = {**dict(payload), "parent_kind": parent_kind, "parent_id": parent_id}
        return self.create_once(kind=kind, scope=scope, actor_id=actor_id,
                                idempotency_key=idempotency_key, request_digest=request_digest,
                                state=state, payload=value)
