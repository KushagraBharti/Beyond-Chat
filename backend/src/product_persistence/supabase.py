from __future__ import annotations

from typing import Any

from .contracts import CapabilityRun, ConflictError, ProductPersistenceUnavailable, ProductRecord, Scope
from .manifest import KIND_TABLES


class SupabaseProductRepository:
    """Supabase/Postgres adapter using migration-owned atomic RPC functions.

    The client is deliberately injected. Credential selection, pooling, and
    service-role policy remain composition-root responsibilities.
    """

    def __init__(self, client: Any) -> None:
        self.client = client

    @staticmethod
    def _table(kind: str) -> str:
        try:
            return KIND_TABLES[kind]
        except KeyError as exc:
            raise ValueError(f"Unsupported product record kind: {kind}") from exc

    @staticmethod
    def _record(kind: str, row: dict[str, Any]) -> ProductRecord:
        payload = dict(row.get("payload") or {})
        if row.get("parent_kind") is not None:
            payload["parent_kind"] = row["parent_kind"]
        if row.get("parent_id") is not None:
            payload["parent_id"] = row["parent_id"]
        return ProductRecord(
            id=str(row["id"]), kind=kind,
            scope=Scope(str(row["organization_id"]), row.get("project_id"), row.get("team_id")),
            state=str(row["state"]), version=int(row["version"]), payload=payload,
            created_by=str(row["created_by"]), created_at=str(row["created_at"]), updated_at=str(row["updated_at"]),
        )

    @staticmethod
    def _one(data: Any) -> dict[str, Any]:
        if isinstance(data, list):
            if not data:
                raise KeyError("not_found")
            return dict(data[0])
        if not isinstance(data, dict):
            raise KeyError("not_found")
        return dict(data)

    def list(self, *, kind: str, scope: Scope, states: tuple[str, ...] = ()) -> list[ProductRecord]:
        query = (self.client.table(self._table(kind)).select("*")
                 .eq("kind", kind).eq("organization_id", scope.organization_id))
        query = query.is_("project_id", "null") if scope.project_id is None else query.eq("project_id", scope.project_id)
        query = query.is_("team_id", "null") if scope.team_id is None else query.eq("team_id", scope.team_id)
        if states:
            query = query.in_("state", list(states))
        rows = query.order("updated_at", desc=True).limit(200).execute().data or []
        return [self._record(kind, dict(row)) for row in rows]

    def list_recent(self, *, kind: str, organization_id: str,
                    states: tuple[str, ...] = (), limit: int = 20) -> list[ProductRecord]:
        query = (self.client.table(self._table(kind)).select("*")
                 .eq("kind", kind).eq("organization_id", organization_id))
        if states:
            query = query.in_("state", list(states))
        bounded = max(1, min(limit, 100))
        rows = query.order("updated_at", desc=True).limit(bounded).execute().data or []
        return [self._record(kind, dict(row)) for row in rows]

    def list_global(self, *, kind: str, states: tuple[str, ...] = (), limit: int = 200) -> list[ProductRecord]:
        query = self.client.table(self._table(kind)).select("*").eq("kind", kind)
        if states:
            query = query.in_("state", list(states))
        rows = query.order("updated_at", desc=True).limit(max(1, min(limit, 1000))).execute().data or []
        return [self._record(kind, dict(row)) for row in rows]

    def get(self, *, kind: str, record_id: str, scope: Scope) -> ProductRecord | None:
        query = (self.client.table(self._table(kind)).select("*").eq("kind", kind)
                 .eq("id", record_id).eq("organization_id", scope.organization_id))
        query = query.is_("project_id", "null") if scope.project_id is None else query.eq("project_id", scope.project_id)
        query = query.is_("team_id", "null") if scope.team_id is None else query.eq("team_id", scope.team_id)
        rows = query.limit(1).execute().data or []
        return self._record(kind, dict(rows[0])) if rows else None

    def create_once(self, *, kind: str, scope: Scope, actor_id: str, idempotency_key: str,
                    request_digest: str, state: str, payload) -> ProductRecord:
        self._table(kind)
        params = {"p_kind": kind, "p_organization_id": scope.organization_id,
                  "p_project_id": scope.project_id, "p_team_id": scope.team_id, "p_actor_id": actor_id,
                  "p_idempotency_key": idempotency_key, "p_request_digest": request_digest,
                  "p_state": state, "p_payload": dict(payload), "p_parent_kind": None, "p_parent_id": None}
        try:
            row = self._one(self.client.rpc("product_create_record_once", params).execute().data)
        except Exception as exc:
            if "idempotency_key_reused" in str(exc):
                raise ConflictError("idempotency_key_reused") from exc
            raise
        return self._record(kind, row)

    def update(self, *, kind: str, record_id: str, scope: Scope, actor_id: str,
               expected_version: int, state: str | None = None, payload=None) -> ProductRecord:
        self._table(kind)
        params = {"p_kind": kind, "p_record_id": record_id,
                  "p_organization_id": scope.organization_id, "p_project_id": scope.project_id,
                  "p_team_id": scope.team_id, "p_actor_id": actor_id,
                  "p_expected_version": expected_version, "p_state": state,
                  "p_payload": dict(payload) if payload is not None else None}
        try:
            row = self._one(self.client.rpc("product_update_record", params).execute().data)
        except Exception as exc:
            message = str(exc)
            if "stale_version" in message:
                raise ConflictError("stale_version") from exc
            if "not_found" in message:
                raise KeyError("not_found") from exc
            raise
        return self._record(kind, row)

    def append_once(self, *, kind: str, parent_kind: str, parent_id: str, scope: Scope,
                    actor_id: str, idempotency_key: str, request_digest: str, state: str, payload) -> ProductRecord:
        self._table(kind)
        self._table(parent_kind)
        params = {"p_kind": kind, "p_organization_id": scope.organization_id,
                  "p_project_id": scope.project_id, "p_team_id": scope.team_id, "p_actor_id": actor_id,
                  "p_idempotency_key": idempotency_key, "p_request_digest": request_digest,
                  "p_state": state, "p_payload": dict(payload), "p_parent_kind": parent_kind,
                  "p_parent_id": parent_id}
        try:
            row = self._one(self.client.rpc("product_create_record_once", params).execute().data)
        except Exception as exc:
            message = str(exc)
            if "idempotency_key_reused" in message:
                raise ConflictError("idempotency_key_reused") from exc
            if "parent_not_found" in message:
                raise KeyError("parent_not_found") from exc
            raise
        return self._record(kind, row)

    def get_capability_run(self, *, run_id: str) -> CapabilityRun | None:
        rows = (self.client.table("runtime_runs")
                .select("id,organization_id,project_id,actor_id,agent_version_id,state")
                .eq("id", run_id).limit(1).execute().data or [])
        if not rows:
            return None
        row = rows[0]
        return CapabilityRun(str(row["id"]), str(row["organization_id"]), str(row["project_id"]),
                             str(row["actor_id"]), str(row["agent_version_id"]), str(row["state"]))

    def record_capability_resolution(self, *, run: CapabilityRun, actor_id: str,
                                     projection_digest: str, metadata,
                                     approval_claims=()) -> None:
        if approval_claims:
            raise ProductPersistenceUnavailable(
                "Approval-backed capability resolution requires a SECURITY INVOKER service-role-only "
                "RPC named consume_capability_approvals_for_resolution. In one transaction it must "
                "SELECT FOR UPDATE each approval, verify organization/project/run/tool/argument_digest/"
                "idempotency_key/status/expiry against database now(), mark each approval consumed once, "
                "and insert the capability.resolve audit event keyed by projection_digest."
            )
        self.client.table("audit_events").insert({
            "organization_id": run.organization_id,
            "actor_profile_id": actor_id,
            "action": "capability.resolve",
            "resource_type": "runtime_run",
            "resource_id": run.run_id,
            "request_id": projection_digest,
            "metadata": dict(metadata),
        }).execute()
