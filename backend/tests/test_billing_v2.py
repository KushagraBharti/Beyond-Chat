from __future__ import annotations

import hashlib
import hmac
import json

import pytest

from src.billing_v2.models import BillingStatus, SubscriptionRecord, VerifiedStripeEvent
from src.billing_v2.config import BillingV2Settings
from src.billing_v2.observability import ObservabilitySettings
from src.billing_v2.service import BillingWebhookProcessor
from src.billing_v2.webhook import WebhookVerificationError, verify_stripe_signature


class Repo:
    def __init__(self):
        self.events: set[str] = set(); self.subscription = None; self.entitlement = None; self.failures = {}
    async def begin_event(self, event):
        if event.id in self.events: return "duplicate"
        self.events.add(event.id); return "accepted"
    async def complete_event(self, event_id): pass
    async def fail_event(self, event_id, reason): self.failures[event_id] = reason
    async def get_subscription(self, organization_id): return self.subscription
    async def save_subscription(self, value): self.subscription = value
    async def save_entitlement(self, value): self.entitlement = value
    async def get_status(self, organization_id): return BillingStatus(organization_id,"none","disabled",0,0,False,False,False)


class Telemetry:
    def counter(self, *args, **kwargs): pass
    def error(self, *args, **kwargs): pass


def signed(payload: bytes, timestamp: int, secret: str = "whsec_test") -> str:
    digest = hmac.new(secret.encode(), str(timestamp).encode() + b"." + payload, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={digest}"


def payload(created=100):
    return json.dumps({"id":"evt_1","type":"customer.subscription.updated","created":created,"data":{"object":{"id":"sub_1","customer":"cus_1","status":"active","quantity":2,"metadata":{"organization_id":"org_1"}}}}).encode()


def test_signature_verification_and_replay_window():
    raw = payload(); event = verify_stripe_signature(raw, signed(raw,100), "whsec_test", now=lambda:100)
    assert event.id == "evt_1"
    with pytest.raises(WebhookVerificationError, match="replay window"):
        verify_stripe_signature(raw, signed(raw,100), "whsec_test", now=lambda:1000)
    with pytest.raises(WebhookVerificationError, match="Invalid"):
        verify_stripe_signature(raw, "t=100,v1=bad", "whsec_test", now=lambda:100)


def test_billing_and_observability_are_disabled_by_default():
    assert BillingV2Settings().checkout_ready is False
    assert BillingV2Settings(enabled=True, livemode=True, price_id="price_live_configured").checkout_ready is False
    assert BillingV2Settings(enabled=True, livemode=True, checkout_activated=True,
                             price_id="price_live_configured").checkout_ready is True
    assert ObservabilitySettings().sentry_enabled is False
    assert ObservabilitySettings().otel_enabled is False


@pytest.mark.asyncio
async def test_idempotency_stale_order_and_failure_are_explicit():
    repo=Repo(); processor=BillingWebhookProcessor(repo,Telemetry(),enabled=True,expected_livemode=False)
    event=verify_stripe_signature(payload(200),signed(payload(200),200),"whsec_test",now=lambda:200)
    assert await processor.process(event)=="applied"; assert repo.entitlement.state=="enabled"
    assert await processor.process(event)=="duplicate"
    stale=VerifiedStripeEvent("evt_old","customer.subscription.deleted",100,False,{"id":"sub_1","customer":"cus_1","status":"canceled","quantity":2,"metadata":{"organization_id":"org_1"}})
    assert await processor.process(stale)=="ignored_stale"; assert repo.subscription.status=="active"
    bad=VerifiedStripeEvent("evt_bad","customer.subscription.updated",300,False,{"id":"sub_bad"})
    with pytest.raises(ValueError): await processor.process(bad)
    assert "evt_bad" in repo.failures


@pytest.mark.asyncio
async def test_disabled_billing_and_mode_mismatch_fail_closed():
    disabled_repo=Repo(); disabled=BillingWebhookProcessor(disabled_repo,Telemetry())
    test_event=VerifiedStripeEvent("evt_disabled","customer.subscription.updated",100,False,{"id":"sub_1","customer":"cus_1","status":"active","metadata":{"organization_id":"org_1"}})
    assert await disabled.process(test_event)=="ignored_disabled"
    assert disabled_repo.entitlement is None
    live_repo=Repo(); live=BillingWebhookProcessor(live_repo,Telemetry(),enabled=True,expected_livemode=True)
    assert await live.process(test_event)=="ignored_mode"
    assert live_repo.entitlement is None
