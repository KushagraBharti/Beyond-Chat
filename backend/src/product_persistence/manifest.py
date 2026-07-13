from __future__ import annotations

from copy import deepcopy
from typing import Any


PRODUCT_KINDS: tuple[str, ...] = (
    "skill", "tool", "app", "mcp_server", "connection", "capability_approval",
    "knowledge_connection", "source", "sync", "retrieval", "citation", "memory",
    "memory_proposal", "agent", "agent_draft", "agent_version", "agent_deployment",
    "output", "output_version", "comment", "review", "review_decision", "realtime_hint",
    "automation", "automation_version", "automation_execution",
)

# All Phase 5-12 aggregate kinds intentionally share one physical table. Kinds
# remain explicit in the API and migration check constraint without creating a
# sparse, duplicated table per product noun.
KIND_TABLES: dict[str, str] = {kind: "product_records" for kind in PRODUCT_KINDS}

APPEND_ONLY_KINDS = frozenset({
    "agent_version", "output_version", "citation", "retrieval", "review_decision",
    "automation_version", "realtime_hint",
})


SCHEMA_MANIFEST: dict[str, Any] = {
    "version": "phase5-12-admission-v2",
    "status": "admitted",
    "record_kinds": list(PRODUCT_KINDS),
    "common_invariants": [
        "Every query includes organization_id and exact nullable project_id/team_id scope predicates.",
        "Mutable records update through compare-and-swap RPC product_update_record.",
        "Creates bind (organization_id, kind, idempotency_key) to request_digest.",
        "Provider credentials are external references only and never stored in payload.",
        "Authenticated clients have read-only RLS access; writes and RPCs are server-only.",
        "Foreign keys and membership/retrieval/reconciliation predicates are indexed.",
    ],
    "physical_tables": {
        "product_records": {
            "purpose": "Canonical normalized aggregate records for all 26 admitted product kinds.",
            "scope": ["organization_id", "project_id", "team_id"],
            "concurrency": "positive version with compare-and-swap",
            "parentage": ["parent_kind", "parent_id"],
            "payload": "JSON object; no secrets or provider credentials",
        },
        "product_idempotency_keys": {
            "uniqueness": "primary key (organization_id, kind, idempotency_key)",
            "retention": "at least 30 days; longer for provider writes, automations, publishing, and billing",
            "stores": ["request_digest", "record_id", "response_digest", "created_at"],
        },
    },
    "shared_references": {
        "audit": "canonical public.audit_events",
        "outbox": "canonical public.outbox_events",
    },
    "private_writes": {
        "product_create_record_once": "SECURITY INVOKER; executable only by service_role",
        "product_update_record": "SECURITY INVOKER compare-and-swap; executable only by service_role",
    },
    "provider_gates": {
        "connections": "requested/disconnected until a server adapter verifies provider account and credential reference",
        "knowledge_sync": "unavailable until connector adapter is healthy",
        "retrieval": "unavailable until permission-filtered retrieval adapter is healthy",
        "automations": "manual/scheduled dispatch unavailable until durable runtime adapter is mounted",
        "billing": "disabled unless billing_v2 returns externally_verified server state",
    },
}


def schema_manifest() -> dict[str, Any]:
    return deepcopy(SCHEMA_MANIFEST)
