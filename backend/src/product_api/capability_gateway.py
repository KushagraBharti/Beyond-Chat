from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Mapping

from ..authorization.policy import Principal
from ..product_persistence import ConflictError, ProductRepository, Scope
from .schemas import CapabilityResolveRequest
from .service import digest


_TERMINAL_RUN_STATES = {"completed", "failed", "cancelled", "expired"}
_SECRET_NAMES = {"credential", "credentials", "credential_reference", "connected_account_id",
                 "access_token", "refresh_token", "api_key", "secret", "oauth_state_digest"}


def _configuration(payload: Mapping[str, Any]) -> Mapping[str, Any]:
    value: Any = payload.get("config")
    if not isinstance(value, Mapping):
        value = payload.get("manifest")
    if isinstance(value, Mapping):
        nested = value.get("configuration") or value.get("config")
        return nested if isinstance(nested, Mapping) else value
    return {}


def _definition(payload: Mapping[str, Any]) -> Mapping[str, Any]:
    value = payload.get("definition")
    return value if isinstance(value, Mapping) else payload


def _unique(values: list[str], field: str) -> set[str]:
    result = set(values)
    if len(result) != len(values):
        raise ConflictError(f"duplicate_{field}")
    return result


class CapabilityGateway:
    def __init__(self, repository: ProductRepository) -> None:
        self.repository = repository

    def resolve(self, *, run_id: str, principal: Principal,
                body: CapabilityResolveRequest) -> dict[str, Any]:
        run = self.repository.get_capability_run(run_id=run_id)
        if run is None or run.organization_id != principal.organization_id:
            raise KeyError("run_not_found")
        if run.actor_id != principal.profile_id:
            raise PermissionError("run_actor_mismatch")
        if run.state in _TERMINAL_RUN_STATES:
            raise ConflictError("run_is_terminal")
        if body.agent_version_id != run.agent_version_id:
            raise ConflictError("agent_version_mismatch")

        scope = Scope(run.organization_id, run.project_id)
        agent = self.repository.get(kind="agent_version", record_id=run.agent_version_id, scope=scope)
        if agent is None or agent.state != "published":
            raise ConflictError("agent_version_unavailable")
        config = _configuration(agent.payload)
        bindings = {str(item.get("id")): item for item in config.get("tools", [])
                    if isinstance(item, Mapping) and isinstance(item.get("id"), str)}
        capabilities = sorted({str(item) for item in config.get("capabilities", []) if isinstance(item, str)})

        selected_skills = _unique(body.selected_skill_version_ids, "skill_source")
        selected_connections = _unique(body.selected_connection_ids, "connection_source")
        selected_mcp = _unique(body.selected_mcp_binding_ids, "mcp_source")
        connections = {}
        for connection_id in selected_connections:
            connection = self.repository.get(kind="connection", record_id=connection_id, scope=scope)
            if connection is not None:
                connections[connection_id] = connection

        candidates: dict[str, list[tuple[Any, Mapping[str, Any]]]] = {}
        for record in self.repository.list(kind="tool", scope=scope, states=("active", "published")):
            definition = _definition(record.payload)
            tool_id = definition.get("id")
            if not isinstance(tool_id, str) or tool_id not in bindings:
                continue
            source = str(definition.get("source") or "native")
            source_id = definition.get("source_id")
            selected = (source == "native" or
                        (source == "skill" and source_id in selected_skills) or
                        (source == "app" and source_id in selected_connections) or
                        (source == "mcp" and source_id in selected_mcp))
            if selected:
                candidates.setdefault(tool_id, []).append((record, definition))

        now = datetime.now(UTC)
        claims = {claim.tool_id: claim for claim in body.approval_claims}
        if len(claims) != len(body.approval_claims):
            raise ConflictError("duplicate_approval_tool")
        resolved: list[dict[str, Any]] = []
        withheld: list[dict[str, str]] = []
        consumed: list[Mapping[str, Any]] = []
        for tool_id, binding in sorted(bindings.items()):
            matches = candidates.get(tool_id, [])
            if len(matches) > 1:
                withheld.append({"id": tool_id, "reason": "duplicate_source"})
                continue
            if not matches:
                withheld.append({"id": tool_id, "reason": "source_unavailable"})
                continue
            _, definition = matches[0]
            source = str(definition.get("source") or "native")
            if source == "app":
                connection = connections.get(str(definition.get("source_id")))
                if connection is None or connection.state != "active":
                    withheld.append({"id": tool_id, "reason": "connection_revoked_or_unavailable"})
                    continue
                ownership = connection.payload.get("ownership", "project")
                owner_id = connection.payload.get("owner_id", run.project_id)
                expected_owner = {"organization": run.organization_id, "project": run.project_id,
                                  "user": run.actor_id}.get(ownership)
                if expected_owner is None or owner_id != expected_owner:
                    withheld.append({"id": tool_id, "reason": "connection_out_of_scope"})
                    continue
            decision = str(binding.get("decision") or "deny")
            risk = str(definition.get("risk") or binding.get("risk") or "admin")
            if decision == "deny":
                withheld.append({"id": tool_id, "reason": "agent_policy_denied"})
                continue
            if isinstance(binding.get("max_calls"), int) and body.current_calls >= binding["max_calls"]:
                withheld.append({"id": tool_id, "reason": "call_budget_exhausted"})
                continue
            if isinstance(binding.get("max_concurrency"), int) and body.current_concurrency >= binding["max_concurrency"]:
                withheld.append({"id": tool_id, "reason": "concurrency_budget_exhausted"})
                continue
            if isinstance(binding.get("max_cost_cents"), int) and body.current_cost_cents >= binding["max_cost_cents"]:
                withheld.append({"id": tool_id, "reason": "cost_budget_exhausted"})
                continue
            consequential = risk != "read" or decision == "ask"
            claim = claims.get(tool_id)
            if consequential:
                if claim is None:
                    resolved.append({"id": tool_id, "version": str(definition.get("version") or "unknown"),
                                     "risk": risk, "approval_required": True})
                    continue
                approval = self.repository.get(kind="capability_approval", record_id=claim.approval_id, scope=scope)
                approval_config = _configuration(approval.payload) if approval else {}
                try:
                    expires = datetime.fromisoformat(str(approval_config.get("expires_at", "")).replace("Z", "+00:00"))
                except ValueError:
                    expires = datetime.min.replace(tzinfo=UTC)
                expected = {"run_id": run.run_id, "tool_id": tool_id,
                            "argument_digest": claim.argument_digest,
                            "idempotency_key": claim.idempotency_key}
                if approval is None or approval.state != "approved" or expires <= now:
                    raise ConflictError("approval_expired_or_unavailable")
                if any(approval_config.get(key) != value for key, value in expected.items()):
                    raise ConflictError("approval_binding_mismatch")
                consumed.append(claim.model_dump())
            resolved.append({"id": tool_id, "version": str(definition.get("version") or "unknown"),
                             "risk": risk, "approval_required": False})

        resolved_at = now.isoformat()
        projection = {"schema_version": "1.0", "run_id": run.run_id,
                      "agent_version_id": run.agent_version_id, "agent_id": agent.payload.get("agent_id"),
                      "capabilities": capabilities, "tools": resolved, "withheld": withheld,
                      "resolved_at": resolved_at}
        projection_digest = f"sha256:{digest(projection)}"
        projection["projection_digest"] = projection_digest
        if any(name in str(projection).lower() for name in _SECRET_NAMES):
            raise RuntimeError("credential_material_in_projection")
        metadata = {"project_id": run.project_id, "agent_version_id": run.agent_version_id,
                    "projection_digest": projection_digest,
                    "tool_ids": [item["id"] for item in resolved],
                    "withheld_ids": [item["id"] for item in withheld]}
        self.repository.record_capability_resolution(
            run=run, actor_id=principal.profile_id, projection_digest=projection_digest,
            metadata=metadata, approval_claims=tuple(consumed))
        return projection
