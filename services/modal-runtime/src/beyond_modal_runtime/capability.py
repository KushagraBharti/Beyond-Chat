"""Short-lived, least-privilege run capabilities for sandbox gateway calls."""

from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass
from typing import Any, Iterable

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey


class CapabilityError(ValueError):
    """A capability is malformed, expired, or outside its declared scope."""


@dataclass(frozen=True)
class CapabilityClaims:
    run_id: str
    organization_id: str
    project_id: str
    actor_id: str
    agent_version_id: str
    audience: str
    expires_at: int
    nonce: str
    capabilities: tuple[str, ...]


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode(value: str) -> bytes:
    try:
        decoded = base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except Exception as exc:  # pragma: no cover - defensive normalization
        raise CapabilityError("invalid base64 encoding") from exc
    if _encode(decoded) != value:
        raise CapabilityError("non-canonical base64 encoding")
    return decoded


def _canonical(value: dict[str, Any]) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


def generate_keypair() -> tuple[str, str]:
    private = Ed25519PrivateKey.generate()
    public = private.public_key()
    private_pem = private.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode("ascii")
    public_pem = public.public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("ascii")
    return private_pem, public_pem


def issue_capability(
    private_key_pem: str,
    *,
    run_id: str,
    organization_id: str,
    project_id: str,
    actor_id: str,
    agent_version_id: str,
    nonce: str,
    capabilities: Iterable[str],
    audience: str = "tool-gateway",
    lifetime_seconds: int = 300,
    now: int | None = None,
) -> str:
    if not 1 <= lifetime_seconds <= 900:
        raise CapabilityError("capability lifetime must be between 1 and 900 seconds")
    normalized = tuple(sorted(set(capabilities)))
    if not normalized or any(not item or ":" not in item for item in normalized):
        raise CapabilityError("at least one namespaced capability is required")
    issued_at = int(time.time() if now is None else now)
    identity = {
        "org": organization_id,
        "project": project_id,
        "actor": actor_id,
        "agent_version": agent_version_id,
    }
    if any(not isinstance(value, str) or not value.strip() for value in identity.values()):
        raise CapabilityError("run identity claims are required")
    if not audience or not isinstance(audience, str):
        raise CapabilityError("capability audience is required")
    header = {"alg": "EdDSA", "typ": "BEYOND-RUN", "v": 1}
    payload = {
        "aud": audience,
        "cap": normalized,
        "exp": issued_at + lifetime_seconds,
        "iat": issued_at,
        "nonce": nonce,
        "run": run_id,
        **identity,
    }
    signing_input = f"{_encode(_canonical(header))}.{_encode(_canonical(payload))}".encode("ascii")
    key = serialization.load_pem_private_key(private_key_pem.encode("ascii"), password=None)
    if not isinstance(key, Ed25519PrivateKey):
        raise CapabilityError("private key must be Ed25519")
    return f"{signing_input.decode('ascii')}.{_encode(key.sign(signing_input))}"


def verify_capability(
    token: str,
    public_key_pem: str,
    *,
    expected_run_id: str,
    required_capability: str,
    expected_audience: str = "tool-gateway",
    now: int | None = None,
    clock_skew_seconds: int = 10,
) -> CapabilityClaims:
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".", 2)
        header = json.loads(_decode(encoded_header))
        payload = json.loads(_decode(encoded_payload))
    except (ValueError, json.JSONDecodeError) as exc:
        raise CapabilityError("malformed capability") from exc
    if header != {"alg": "EdDSA", "typ": "BEYOND-RUN", "v": 1}:
        raise CapabilityError("unsupported capability header")
    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
    key = serialization.load_pem_public_key(public_key_pem.encode("ascii"))
    if not isinstance(key, Ed25519PublicKey):
        raise CapabilityError("public key must be Ed25519")
    try:
        key.verify(_decode(encoded_signature), signing_input)
    except InvalidSignature as exc:
        raise CapabilityError("invalid capability signature") from exc
    if payload.get("aud") != expected_audience or payload.get("run") != expected_run_id:
        raise CapabilityError("capability audience or run scope mismatch")
    current = int(time.time() if now is None else now)
    if not isinstance(payload.get("iat"), int) or payload["iat"] > current + clock_skew_seconds:
        raise CapabilityError("capability is not active")
    if not isinstance(payload.get("exp"), int) or payload["exp"] <= current - clock_skew_seconds:
        raise CapabilityError("capability expired")
    capabilities = tuple(payload.get("cap", ()))
    if required_capability not in capabilities:
        raise CapabilityError("required capability is not granted")
    if not isinstance(payload.get("nonce"), str) or not payload["nonce"]:
        raise CapabilityError("capability nonce is required")
    identity_keys = ("org", "project", "actor", "agent_version")
    if any(not isinstance(payload.get(key), str) or not payload[key] for key in identity_keys):
        raise CapabilityError("run identity claims are required")
    return CapabilityClaims(
        run_id=payload["run"],
        organization_id=payload["org"],
        project_id=payload["project"],
        actor_id=payload["actor"],
        agent_version_id=payload["agent_version"],
        audience=payload["aud"],
        expires_at=payload["exp"],
        nonce=payload["nonce"],
        capabilities=capabilities,
    )
