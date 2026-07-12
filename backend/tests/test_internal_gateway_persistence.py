from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from src.internal_gateways.supabase import InvocationClaimStoreError, SupabaseInvocationClaimStore


class RpcClient:
    def __init__(self, *, data=None, error: Exception | None = None) -> None:
        self.data, self.error = data, error
        self.calls: list[tuple[str, dict[str, object]]] = []

    def rpc(self, name: str, params: dict[str, object]):
        self.calls.append((name, params))
        return self

    def execute(self):
        if self.error is not None:
            raise self.error
        return SimpleNamespace(data=self.data)


def claim(store: SupabaseInvocationClaimStore, **changes):
    values = {
        "organization_id": "814a42d5-b760-488b-b01a-635c32ee12c9",
        "project_id": "c7d23b91-07ac-4bb0-b93b-ec86e0340916",
        "run_id": "run-1",
        "subject": "worker-1",
        "attempt": 3,
        "lease_id": "df23e58d-3895-4ae7-afd2-a42a8e36968b",
        "idempotency_key": "idem-1234",
        "request_digest": "sha256:" + "a" * 64,
        "jti": "jti-0001",
        "expires_at": datetime(2026, 7, 12, 13, 30, tzinfo=UTC),
    }
    return store.claim_invocation(**{**values, **changes})


@pytest.mark.parametrize("status", ["claimed", "token_replayed", "idempotency_conflict", "binding_stale"])
def test_claim_adapter_accepts_only_canonical_statuses(status: str) -> None:
    client = RpcClient(data=[{"status": status}])
    assert claim(SupabaseInvocationClaimStore(client)) == status
    name, params = client.calls[0]
    assert name == "claim_internal_gateway_invocation"
    assert params == {
        "p_organization_id": "814a42d5-b760-488b-b01a-635c32ee12c9",
        "p_project_id": "c7d23b91-07ac-4bb0-b93b-ec86e0340916",
        "p_run_id": "run-1",
        "p_subject": "worker-1",
        "p_attempt": 3,
        "p_lease_id": "df23e58d-3895-4ae7-afd2-a42a8e36968b",
        "p_idempotency_key": "idem-1234",
        "p_request_digest": "sha256:" + "a" * 64,
        "p_jti": "jti-0001",
        "p_expires_at": "2026-07-12T13:30:00Z",
    }


@pytest.mark.parametrize("data", [None, {}, [], [{"status": "claimed"}, {"status": "claimed"}], [{"status": "unknown"}], [{"status": "claimed", "extra": True}]])
def test_claim_adapter_rejects_noncanonical_response_shapes(data) -> None:
    with pytest.raises(InvocationClaimStoreError, match="invalid response"):
        claim(SupabaseInvocationClaimStore(RpcClient(data=data)))


def test_claim_adapter_maps_transport_errors_without_leaking_details() -> None:
    store = SupabaseInvocationClaimStore(RpcClient(error=RuntimeError("secret database detail")))
    with pytest.raises(InvocationClaimStoreError, match="RPC failed") as raised:
        claim(store)
    assert "secret database detail" not in str(raised.value)


def test_claim_adapter_rejects_naive_expiry_before_rpc() -> None:
    client = RpcClient(data=[{"status": "claimed"}])
    with pytest.raises(ValueError, match="timezone-aware"):
        claim(SupabaseInvocationClaimStore(client), expires_at=datetime(2026, 7, 12, 13, 30))
    assert client.calls == []
