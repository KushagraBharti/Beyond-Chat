from __future__ import annotations

import hashlib
import hmac
import json
import time
from collections.abc import Callable

from .models import VerifiedStripeEvent


class WebhookVerificationError(ValueError):
    pass


def verify_stripe_signature(payload: bytes, signature_header: str, secret: str, *, tolerance_seconds: int = 300, now: Callable[[], float] = time.time) -> VerifiedStripeEvent:
    fields: dict[str, list[str]] = {}
    for item in signature_header.split(","):
        key, separator, value = item.partition("=")
        if separator:
            fields.setdefault(key.strip(), []).append(value.strip())
    try:
        timestamp = int(fields["t"][0])
    except (KeyError, ValueError, IndexError) as exc:
        raise WebhookVerificationError("Missing Stripe signature timestamp.") from exc
    if abs(now() - timestamp) > tolerance_seconds:
        raise WebhookVerificationError("Stripe signature timestamp is outside the replay window.")
    signed = str(timestamp).encode() + b"." + payload
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, candidate) for candidate in fields.get("v1", [])):
        raise WebhookVerificationError("Invalid Stripe webhook signature.")
    try:
        raw = json.loads(payload)
        event_object = raw["data"]["object"]
        if not isinstance(event_object, dict):
            raise TypeError("event object")
        return VerifiedStripeEvent(id=str(raw["id"]), type=str(raw["type"]), created=int(raw["created"]), livemode=bool(raw.get("livemode", False)), object=event_object)
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise WebhookVerificationError("Invalid Stripe webhook payload.") from exc
