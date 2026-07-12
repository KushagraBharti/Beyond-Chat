from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from threading import Lock
from concurrent.futures import ThreadPoolExecutor

import pytest

from src.internal_gateways.gateway import GatewayDenied, InternalGateway, canonical_digest
from src.internal_gateways.models import AuthoritativeRunState, CapabilityGrant, GatewayInvocation
from src.internal_gateways.tokens import HmacKeyRing, RunCapabilityTokenCodec, TokenValidationError


class MemoryInvocationClaims:
    def __init__(self):
        self.jtis, self.idempotency, self.lock = set(), {}, Lock()

    def claim_invocation(self, *, organization_id, run_id, idempotency_key, request_digest, jti, expires_at):
        with self.lock:
            if jti in self.jtis: return "token_replayed"
            scope = (organization_id, run_id, idempotency_key)
            if scope in self.idempotency: return "idempotency_conflict"
            self.jtis.add(jti)
            self.idempotency[scope] = request_digest
            return "claimed"


class Resolver:
    def __init__(self, state): self.state = state
    def resolve(self, run_id): return self.state if self.state.run_id == run_id else None


class Audit:
    def __init__(self): self.items = []
    def record(self, outcome): self.items.append(outcome)


NOW = datetime(2026, 7, 12, 12, tzinfo=UTC)
CAPABILITY = {"kind": "model", "name": "openrouter", "version": "v1", "allowed_fields": ["text"], "max_calls": 2, "max_cost_microusd": 500}
ARGS = {"messages": [{"role": "user", "content": "hello"}]}


def setup_gateway(*, state=None, keys=None, active="2026-07", claims=None):
    ring = HmacKeyRing(active_key_id=active, keys=keys or {active: b"test-key-at-least-32-bytes-long!!"})
    codec = RunCapabilityTokenCodec(ring, expected_issuer="beyond-control-plane")
    state = state or AuthoritativeRunState("run-1", "org-1", "project-1", "worker-1", 3, "lease-1", "running", NOW + timedelta(minutes=2), False, (CAPABILITY,))
    audit = Audit()
    return codec, InternalGateway(tokens=codec, resolver=Resolver(state), invocation_claims=claims or MemoryInvocationClaims(), audit=audit), audit


def grant(**changes):
    base = CapabilityGrant("beyond-control-plane", "internal-model-gateway", "worker-1", "run-1", "org-1", "project-1", 3, "lease-1", "jti-1", NOW, NOW, NOW + timedelta(minutes=1), canonical_digest(CAPABILITY), canonical_digest(ARGS), "idem-1234", 2, 500)
    return replace(base, **changes)


def invocation(token, **changes):
    base = GatewayInvocation(token, "internal-model-gateway", "model", "openrouter", "v1", ARGS, "idem-1234", ("text",), 100)
    return replace(base, **changes)


def test_allows_exactly_bound_request_and_emits_safe_projection():
    codec, gateway, audit = setup_gateway()
    result = gateway.validate(invocation(codec.issue(grant())), now=NOW)
    assert result.audit.allowed is True
    assert result.projection["arguments"] == ARGS
    assert "api_key" not in str(result.projection).lower()
    assert audit.items[-1].code == "allowed"


@pytest.mark.parametrize("change,code", [
    ({"audience": "internal-tool-gateway"}, "token_scope_invalid"),
    ({"arguments": {"messages": []}}, "request_binding_mismatch"),
    ({"projected_fields": ("raw_provider_response",)}, "projection_not_allowlisted"),
])
def test_denies_scope_argument_and_projection_changes(change, code):
    codec, gateway, audit = setup_gateway()
    with pytest.raises(GatewayDenied) as exc:
        gateway.validate(invocation(codec.issue(grant()), **change), now=NOW)
    assert exc.value.outcome.code == code
    assert audit.items[-1].allowed is False


@pytest.mark.parametrize("state_change,code", [
    ({"revoked": True}, "run_revoked_or_terminal"),
    ({"state": "completed"}, "run_revoked_or_terminal"),
    ({"state": "canceled"}, "run_revoked_or_terminal"),
    ({"lease_id": "replacement-lease"}, "authoritative_binding_mismatch"),
    ({"lease_expires_at": NOW}, "lease_expired"),
    ({"calls_used": 2}, "budget_exhausted"),
])
def test_authoritative_state_fails_closed(state_change, code):
    base = AuthoritativeRunState("run-1", "org-1", "project-1", "worker-1", 3, "lease-1", "running", NOW + timedelta(minutes=2), False, (CAPABILITY,))
    codec, gateway, _ = setup_gateway(state=replace(base, **state_change))
    with pytest.raises(GatewayDenied) as exc:
        gateway.validate(invocation(codec.issue(grant())), now=NOW)
    assert exc.value.outcome.code == code


def test_token_is_one_use_and_replay_is_audited():
    codec, gateway, audit = setup_gateway()
    token = codec.issue(grant())
    gateway.validate(invocation(token), now=NOW)
    with pytest.raises(GatewayDenied) as exc:
        gateway.validate(invocation(token), now=NOW)
    assert exc.value.outcome.code == "token_replayed"
    assert audit.items[-1].jti == "jti-1"


def test_distinct_idempotency_key_cannot_replay_same_token():
    codec, gateway, _ = setup_gateway()
    token = codec.issue(grant())
    gateway.validate(invocation(token), now=NOW)
    with pytest.raises(GatewayDenied) as exc:
        gateway.validate(invocation(token, idempotency_key="idem-5678"), now=NOW)
    assert exc.value.outcome.code == "request_binding_mismatch"


def test_distinct_token_with_claimed_idempotency_key_is_conflict():
    codec, gateway, _ = setup_gateway()
    gateway.validate(invocation(codec.issue(grant())), now=NOW)
    second = codec.issue(grant(jti="jti-2"))
    with pytest.raises(GatewayDenied) as exc:
        gateway.validate(invocation(second), now=NOW)
    assert exc.value.outcome.code == "idempotency_conflict"


def test_atomic_claim_allows_only_one_concurrent_invocation():
    codec, gateway, _ = setup_gateway()
    token = codec.issue(grant())

    def call():
        try:
            gateway.validate(invocation(token), now=NOW)
            return "allowed"
        except GatewayDenied as exc:
            return exc.outcome.code

    with ThreadPoolExecutor(max_workers=8) as pool:
        outcomes = list(pool.map(lambda _: call(), range(8)))
    assert outcomes.count("allowed") == 1
    assert outcomes.count("token_replayed") == 7


def test_claim_store_failure_fails_closed_and_is_audited():
    class BrokenClaims:
        def claim_invocation(self, **kwargs): raise RuntimeError("database unavailable")

    codec, gateway, audit = setup_gateway(claims=BrokenClaims())
    with pytest.raises(GatewayDenied) as exc:
        gateway.validate(invocation(codec.issue(grant())), now=NOW)
    assert exc.value.outcome.code == "invocation_claim_unavailable"
    assert audit.items[-1].code == "invocation_claim_unavailable"


def test_zero_attempt_token_is_rejected():
    codec, gateway, _ = setup_gateway()
    with pytest.raises(GatewayDenied) as exc:
        gateway.validate(invocation(codec.issue(grant(attempt=0))), now=NOW)
    assert exc.value.outcome.code == "token_claims_invalid"


def test_unknown_key_and_expiry_are_rejected_but_old_rotation_key_verifies():
    old_codec, _, _ = setup_gateway(keys={"old": b"old-key-at-least-32-bytes-long!!!!"}, active="old")
    token = old_codec.issue(grant())
    rotated = RunCapabilityTokenCodec(HmacKeyRing(active_key_id="new", keys={"old": b"old-key-at-least-32-bytes-long!!!!", "new": b"new-key-at-least-32-bytes-long!!!!"}), expected_issuer="beyond-control-plane")
    assert rotated.validate(token, audience="internal-model-gateway", now=NOW).jti == "jti-1"
    with pytest.raises(TokenValidationError, match="token_expired"):
        rotated.validate(token, audience="internal-model-gateway", now=NOW + timedelta(minutes=2))


def test_credentials_are_never_projected():
    dangerous = {**CAPABILITY, "api_key": "provider-secret"}
    state = AuthoritativeRunState("run-1", "org-1", "project-1", "worker-1", 3, "lease-1", "running", NOW + timedelta(minutes=2), False, (dangerous,))
    codec, gateway, _ = setup_gateway(state=state)
    with pytest.raises(GatewayDenied) as exc:
        gateway.validate(invocation(codec.issue(grant(capability_digest=canonical_digest(dangerous)))), now=NOW)
    assert exc.value.outcome.code in {"credential_projection_detected", "capability_digest_mismatch"}
