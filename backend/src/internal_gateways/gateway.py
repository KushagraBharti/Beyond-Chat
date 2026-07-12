from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Any, Mapping

from .models import AuditOutcome, AuditSink, AuthoritativeRunResolver, GatewayInvocation, GatewayResult, InvocationClaimStore
from .tokens import RunCapabilityTokenCodec, TokenValidationError

_TERMINAL_STATES = {"completed", "failed", "canceled", "cancelled", "expired"}
_CREDENTIAL_KEYS = {"api_key", "access_token", "refresh_token", "authorization", "cookie", "credential", "credentials", "secret", "password", "provider_key"}


class GatewayDenied(PermissionError):
    def __init__(self, outcome: AuditOutcome) -> None:
        super().__init__(outcome.code)
        self.outcome = outcome


def canonical_digest(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()
    return f"sha256:{hashlib.sha256(encoded).hexdigest()}"


def _contains_credentials(value: Any) -> bool:
    if isinstance(value, Mapping):
        return any(str(key).lower() in _CREDENTIAL_KEYS or _contains_credentials(item) for key, item in value.items())
    if isinstance(value, (list, tuple)):
        return any(_contains_credentials(item) for item in value)
    return False


class InternalGateway:
    def __init__(self, *, tokens: RunCapabilityTokenCodec, resolver: AuthoritativeRunResolver, invocation_claims: InvocationClaimStore, audit: AuditSink) -> None:
        self.tokens, self.resolver = tokens, resolver
        self.invocation_claims, self.audit = invocation_claims, audit

    def validate(self, invocation: GatewayInvocation, *, now: datetime | None = None) -> GatewayResult:
        now = now or datetime.now(UTC)
        operation = f"{invocation.kind}:{invocation.name}@{invocation.version}"
        base = dict(audience=invocation.audience, kind=invocation.kind, operation=operation, idempotency_key=invocation.idempotency_key)
        if invocation.estimated_cost_microusd < 0:
            self._deny("request_invalid", **base)
        try:
            grant = self.tokens.validate(invocation.token, audience=invocation.audience, now=now)
        except TokenValidationError as exc:
            self._deny(exc.code, **base)
        scoped = dict(base, run_id=grant.run_id, organization_id=grant.organization_id, jti=grant.jti, capability_digest=grant.capability_digest, argument_digest=grant.argument_digest)
        state = self.resolver.resolve(grant.run_id)
        if state is None:
            self._deny("run_unavailable", **scoped)
        if state.revoked or state.state in _TERMINAL_STATES:
            self._deny("run_revoked_or_terminal", **scoped)
        if state.lease_expires_at <= now:
            self._deny("lease_expired", **scoped)
        bindings = (state.organization_id, state.project_id, state.subject, state.attempt, state.lease_id)
        if bindings != (grant.organization_id, grant.project_id, grant.subject, grant.attempt, grant.lease_id):
            self._deny("authoritative_binding_mismatch", **scoped)
        allowed = [dict(item) for item in state.capabilities if item.get("kind") == invocation.kind and item.get("name") == invocation.name and item.get("version") == invocation.version]
        if len(allowed) != 1:
            self._deny("capability_not_allowlisted", **scoped)
        capability = allowed[0]
        public_capability = {key: capability[key] for key in ("kind", "name", "version", "allowed_fields", "max_calls", "max_cost_microusd") if key in capability}
        if _contains_credentials(public_capability):
            self._deny("credential_projection_detected", **scoped)
        if canonical_digest(public_capability) != grant.capability_digest:
            self._deny("capability_digest_mismatch", **scoped)
        argument_digest = canonical_digest(invocation.arguments)
        if argument_digest != grant.argument_digest or invocation.idempotency_key != grant.idempotency_key:
            self._deny("request_binding_mismatch", **scoped)
        allowed_fields = tuple(public_capability.get("allowed_fields", ()))
        if set(invocation.projected_fields) - set(allowed_fields):
            self._deny("projection_not_allowlisted", **scoped)
        call_limit = min(grant.max_calls, int(public_capability.get("max_calls", grant.max_calls)))
        cost_limit = min(grant.max_cost_microusd, int(public_capability.get("max_cost_microusd", grant.max_cost_microusd)))
        if state.calls_used >= call_limit or state.cost_used_microusd + invocation.estimated_cost_microusd > cost_limit:
            self._deny("budget_exhausted", **scoped)
        request_digest = canonical_digest({"operation": operation, "arguments": invocation.arguments, "fields": invocation.projected_fields, "cost": invocation.estimated_cost_microusd})
        try:
            claim = self.invocation_claims.claim_invocation(
                organization_id=grant.organization_id,
                run_id=grant.run_id,
                idempotency_key=invocation.idempotency_key,
                request_digest=request_digest,
                jti=grant.jti,
                expires_at=grant.expires_at,
            )
        except Exception:
            self._deny("invocation_claim_unavailable", **scoped)
        if claim not in {"claimed", "token_replayed", "idempotency_conflict"}:
            self._deny("invocation_claim_invalid", **scoped)
        if claim != "claimed":
            self._deny(claim, **scoped)
        projection = {"kind": invocation.kind, "name": invocation.name, "version": invocation.version, "arguments": dict(invocation.arguments), "requested_fields": invocation.projected_fields, "idempotency_key": invocation.idempotency_key}
        if _contains_credentials(projection):
            self._deny("credential_projection_detected", **scoped)
        outcome = AuditOutcome(True, "allowed", details={"estimated_cost_microusd": invocation.estimated_cost_microusd}, **scoped)
        self.audit.record(outcome)
        return GatewayResult(projection, outcome)

    def _deny(self, code: str, *, audience: str, kind: str, operation: str, idempotency_key: str, run_id: str | None = None, organization_id: str | None = None, jti: str | None = None, capability_digest: str | None = None, argument_digest: str | None = None) -> None:
        outcome = AuditOutcome(False, code, run_id, organization_id, jti, audience, kind, operation, idempotency_key, capability_digest, argument_digest)
        self.audit.record(outcome)
        raise GatewayDenied(outcome)
