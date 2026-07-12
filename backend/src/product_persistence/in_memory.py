from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from threading import RLock
from uuid import uuid4

from .contracts import CapabilityRun, ConflictError, ProductRecord, Scope


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class InMemoryProductRepository:
    """Deterministic adapter used by contract tests; mirrors database invariants."""

    def __init__(self) -> None:
        self._records: dict[tuple[str, str], ProductRecord] = {}
        self._idempotency: dict[tuple[str, str, str], tuple[str, str, str]] = {}
        self._lock = RLock()
        self._capability_runs: dict[str, CapabilityRun] = {}
        self.capability_resolution_audit: list[dict] = []

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

    def add_capability_run(self, run: CapabilityRun) -> None:
        with self._lock:
            self._capability_runs[run.run_id] = run

    def get_capability_run(self, *, run_id: str) -> CapabilityRun | None:
        with self._lock:
            return self._capability_runs.get(run_id)

    def record_capability_resolution(self, *, run: CapabilityRun, actor_id: str,
                                     projection_digest: str, metadata,
                                     approval_claims=()) -> None:
        with self._lock:
            now = datetime.now(timezone.utc)
            approvals: list[ProductRecord] = []
            scope = Scope(run.organization_id, run.project_id)
            for claim in approval_claims:
                current = self._records.get(("capability_approval", str(claim["approval_id"])))
                if current is None or current.scope != scope or current.state != "approved":
                    raise ConflictError("approval_not_consumable")
                binding = current.payload.get("configuration", current.payload)
                expires_at = binding.get("expires_at")
                try:
                    active = isinstance(expires_at, str) and datetime.fromisoformat(
                        expires_at.replace("Z", "+00:00")) > now
                except ValueError:
                    active = False
                if not active:
                    raise ConflictError("approval_expired")
                expected = {
                    "run_id": run.run_id,
                    "tool_id": claim.get("tool_id"),
                    "argument_digest": claim.get("argument_digest"),
                    "idempotency_key": claim.get("idempotency_key"),
                }
                if any(binding.get(key) != value for key, value in expected.items()):
                    raise ConflictError("approval_binding_mismatch")
                approvals.append(current)
            for current in approvals:
                self._records[(current.kind, current.id)] = ProductRecord(
                    current.id, current.kind, current.scope, "consumed", current.version + 1,
                    current.payload, current.created_by, current.created_at, _now())
            self.capability_resolution_audit.append({
                "run_id": run.run_id, "actor_id": actor_id,
                "projection_digest": projection_digest, "metadata": deepcopy(dict(metadata)),
                "approval_ids": [claim["approval_id"] for claim in approval_claims],
            })
