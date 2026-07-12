from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
from dataclasses import asdict
from datetime import UTC, datetime
from typing import Mapping, Protocol

from .models import CapabilityGrant

MIN_JTI_LENGTH = 8
MAX_JTI_LENGTH = 255
MIN_IDEMPOTENCY_KEY_LENGTH = 8
MAX_IDEMPOTENCY_KEY_LENGTH = 255
MIN_HMAC_KEY_BYTES = 32
_KEY_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
_SHA256_DIGEST_RE = re.compile(r"^sha256:[0-9a-f]{64}$")


class TokenValidationError(ValueError):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class SigningKeyRing(Protocol):
    @property
    def active_key_id(self) -> str: ...
    def signing_key(self, key_id: str) -> bytes | None: ...
    def verification_key(self, key_id: str) -> bytes | None: ...


class HmacKeyRing:
    """Rotation-ready key ring; callers may retain old verification-only keys."""

    def __init__(self, *, active_key_id: str, keys: Mapping[str, bytes]) -> None:
        if not isinstance(active_key_id, str) or _KEY_ID_RE.fullmatch(active_key_id) is None:
            raise ValueError("active_signing_key_id_invalid")
        if active_key_id not in keys:
            raise ValueError("active_signing_key_missing")
        if any(
            not isinstance(key_id, str)
            or _KEY_ID_RE.fullmatch(key_id) is None
            or not isinstance(material, bytes)
            or len(material) < MIN_HMAC_KEY_BYTES
            for key_id, material in keys.items()
        ):
            raise ValueError("signing_key_invalid")
        self._active_key_id = active_key_id
        self._keys = dict(keys)

    @property
    def active_key_id(self) -> str:
        return self._active_key_id

    def signing_key(self, key_id: str) -> bytes | None:
        return self._keys.get(key_id) if key_id == self._active_key_id else None

    def verification_key(self, key_id: str) -> bytes | None:
        return self._keys.get(key_id)


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    try:
        return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except Exception as exc:
        raise TokenValidationError("token_encoding_invalid") from exc


class RunCapabilityTokenCodec:
    def __init__(self, key_ring: SigningKeyRing, *, expected_issuer: str, max_ttl_seconds: int = 300) -> None:
        self.key_ring = key_ring
        self.expected_issuer = expected_issuer
        self.max_ttl_seconds = max_ttl_seconds

    def issue(self, grant: CapabilityGrant) -> str:
        if grant.issuer != self.expected_issuer:
            raise ValueError("issuer_mismatch")
        ttl = (grant.expires_at - grant.issued_at).total_seconds()
        if ttl <= 0 or ttl > self.max_ttl_seconds or grant.not_before > grant.expires_at:
            raise ValueError("token_lifetime_invalid")
        if not MIN_JTI_LENGTH <= len(grant.jti) <= MAX_JTI_LENGTH:
            raise ValueError("token_jti_invalid")
        if not MIN_IDEMPOTENCY_KEY_LENGTH <= len(grant.idempotency_key) <= MAX_IDEMPOTENCY_KEY_LENGTH:
            raise ValueError("token_idempotency_key_invalid")
        if (
            _SHA256_DIGEST_RE.fullmatch(grant.capability_digest) is None
            or _SHA256_DIGEST_RE.fullmatch(grant.argument_digest) is None
        ):
            raise ValueError("token_digest_invalid")
        header = {"alg": "HS256", "kid": self.key_ring.active_key_id, "typ": "RCP+JWT"}
        payload = asdict(grant)
        for name in ("issued_at", "not_before", "expires_at"):
            payload[name] = int(payload[name].timestamp())
        encoded = [_b64encode(json.dumps(item, sort_keys=True, separators=(",", ":")).encode()) for item in (header, payload)]
        key = self.key_ring.signing_key(header["kid"])
        if key is None:
            raise ValueError("active_signing_key_unavailable")
        signature = hmac.new(key, ".".join(encoded).encode(), hashlib.sha256).digest()
        return ".".join((*encoded, _b64encode(signature)))

    def validate(self, token: str, *, audience: str, now: datetime) -> CapabilityGrant:
        if now.tzinfo is None:
            raise TokenValidationError("validation_time_invalid")
        try:
            header_part, payload_part, signature_part = token.split(".")
            header = json.loads(_b64decode(header_part))
            payload = json.loads(_b64decode(payload_part))
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError, TokenValidationError) as exc:
            raise TokenValidationError("token_malformed") from exc
        if header.get("alg") != "HS256" or header.get("typ") != "RCP+JWT" or not isinstance(header.get("kid"), str):
            raise TokenValidationError("token_header_invalid")
        key = self.key_ring.verification_key(header["kid"])
        if key is None:
            raise TokenValidationError("signing_key_unknown")
        expected = hmac.new(key, f"{header_part}.{payload_part}".encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64decode(signature_part)):
            raise TokenValidationError("token_signature_invalid")
        required = {"issuer", "audience", "subject", "run_id", "organization_id", "project_id", "attempt", "lease_id", "jti", "issued_at", "not_before", "expires_at", "capability_digest", "argument_digest", "idempotency_key", "max_calls", "max_cost_microusd"}
        if set(payload) != required:
            raise TokenValidationError("token_claims_invalid")
        string_claims = required - {"attempt", "issued_at", "not_before", "expires_at", "max_calls", "max_cost_microusd"}
        if any(not isinstance(payload[name], str) or not payload[name] for name in string_claims):
            raise TokenValidationError("token_claims_invalid")
        if any(not isinstance(payload[name], int) or isinstance(payload[name], bool) for name in ("attempt", "issued_at", "not_before", "expires_at", "max_calls", "max_cost_microusd")):
            raise TokenValidationError("token_claims_invalid")
        if payload["issuer"] != self.expected_issuer or payload["audience"] != audience:
            raise TokenValidationError("token_scope_invalid")
        try:
            issued_at = datetime.fromtimestamp(payload["issued_at"], UTC)
            not_before = datetime.fromtimestamp(payload["not_before"], UTC)
            expires_at = datetime.fromtimestamp(payload["expires_at"], UTC)
            grant = CapabilityGrant(**{**payload, "issued_at": issued_at, "not_before": not_before, "expires_at": expires_at})
        except (TypeError, ValueError, OSError) as exc:
            raise TokenValidationError("token_claims_invalid") from exc
        if not_before > now:
            raise TokenValidationError("token_not_yet_valid")
        if expires_at <= now:
            raise TokenValidationError("token_expired")
        if issued_at > now or expires_at <= issued_at or (expires_at - issued_at).total_seconds() > self.max_ttl_seconds:
            raise TokenValidationError("token_lifetime_invalid")
        if grant.attempt <= 0 or grant.max_calls < 1 or grant.max_cost_microusd < 0:
            raise TokenValidationError("token_claims_invalid")
        if not MIN_JTI_LENGTH <= len(grant.jti) <= MAX_JTI_LENGTH:
            raise TokenValidationError("token_claims_invalid")
        if not MIN_IDEMPOTENCY_KEY_LENGTH <= len(grant.idempotency_key) <= MAX_IDEMPOTENCY_KEY_LENGTH:
            raise TokenValidationError("token_claims_invalid")
        if (
            _SHA256_DIGEST_RE.fullmatch(grant.capability_digest) is None
            or _SHA256_DIGEST_RE.fullmatch(grant.argument_digest) is None
        ):
            raise TokenValidationError("token_claims_invalid")
        return grant
