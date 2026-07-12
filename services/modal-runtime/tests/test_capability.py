from __future__ import annotations

import pytest

from beyond_modal_runtime.capability import CapabilityError, generate_keypair, issue_capability, verify_capability


IDENTITY = {
    "organization_id": "org_0123456789abcdef0123456789abcdef",
    "project_id": "prj_0123456789abcdef0123456789abcdef",
    "actor_id": "act_0123456789abcdef0123456789abcdef",
    "agent_version_id": "agv_0123456789abcdef0123456789abcdef",
}


def test_capability_is_scoped_signed_and_expires() -> None:
    private, public = generate_keypair()
    token = issue_capability(private, run_id="run_0123456789abcdef0123456789abcdef", nonce="nonce-1", capabilities=["tool:echo"], lifetime_seconds=60, now=100, **IDENTITY)
    claims = verify_capability(token, public, expected_run_id="run_0123456789abcdef0123456789abcdef", required_capability="tool:echo", now=120)
    assert claims.audience == "tool-gateway"
    assert claims.organization_id == IDENTITY["organization_id"]
    assert claims.project_id == IDENTITY["project_id"]
    with pytest.raises(CapabilityError, match="expired"):
        verify_capability(token, public, expected_run_id=claims.run_id, required_capability="tool:echo", now=200)
    with pytest.raises(CapabilityError, match="not granted"):
        verify_capability(token, public, expected_run_id=claims.run_id, required_capability="events:read", now=120)


def test_capability_rejects_tampering_and_long_lifetime() -> None:
    private, public = generate_keypair()
    token = issue_capability(private, run_id="run_0123456789abcdef0123456789abcdef", nonce="nonce-1", capabilities=["tool:echo"], now=100, **IDENTITY)
    header, payload, signature = token.split(".")
    tampered_signature = ("A" if signature[0] != "A" else "B") + signature[1:]
    with pytest.raises(CapabilityError, match="signature"):
        verify_capability(f"{header}.{payload}.{tampered_signature}", public, expected_run_id="run_0123456789abcdef0123456789abcdef", required_capability="tool:echo", now=120)
    with pytest.raises(CapabilityError, match="lifetime"):
        issue_capability(private, run_id="run_0123456789abcdef0123456789abcdef", nonce="nonce-2", capabilities=["tool:echo"], lifetime_seconds=901, **IDENTITY)


def test_capability_requires_complete_bound_identity_and_exact_audience() -> None:
    private, public = generate_keypair()
    with pytest.raises(CapabilityError, match="identity"):
        issue_capability(private, run_id="run_1", nonce="nonce", capabilities=["tool:echo"], **{**IDENTITY, "actor_id": ""})
    token = issue_capability(private, run_id="run_1", nonce="nonce", capabilities=["tool:echo"], audience="model-gateway", **IDENTITY)
    with pytest.raises(CapabilityError, match="audience"):
        verify_capability(token, public, expected_run_id="run_1", required_capability="tool:echo", expected_audience="tool-gateway")
