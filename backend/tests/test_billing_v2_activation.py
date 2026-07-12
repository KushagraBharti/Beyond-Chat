"""Activation-readiness contract tests for billing_v2.

Proves the full pre-live journey with fakes: fail-closed status, role-gated
checkout/portal, signed webhook → subscription → entitlement, seat
reconciliation, and the boot guard that refuses non-durable live billing.
No Stripe API is contacted anywhere in this file.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from src.billing_v2.adapters import InMemoryBillingRepository
from src.billing_v2.composition import create_configured_billing_router
from src.billing_v2.config import BillingV2Settings
from src.billing_v2.models import BillingPrincipal, SubscriptionRecord
from src.billing_v2.observability import StructuredLogTelemetry, init_observability
from src.billing_v2.reconciliation import SeatReconciler
from src.billing_v2.router import BillingDependencies, create_billing_router

WEBHOOK_SECRET = "whsec_test_secret_not_real"


def sign(payload: dict, *, secret: str = WEBHOOK_SECRET, at: int | None = None) -> tuple[bytes, str]:
    body = json.dumps(payload).encode()
    timestamp = at or int(time.time())
    digest = hmac.new(secret.encode(), f"{timestamp}".encode() + b"." + body, hashlib.sha256).hexdigest()
    return body, f"t={timestamp},v1={digest}"


def subscription_event(event_id: str, *, status: str = "active", quantity: int = 5,
                       created: int = 1_800_000_000, livemode: bool = False) -> dict:
    return {
        "id": event_id, "type": "customer.subscription.updated", "created": created,
        "livemode": livemode,
        "data": {"object": {
            "id": "sub_test_1", "customer": "cus_test_1", "status": status,
            "quantity": quantity, "current_period_end": created + 2_592_000,
            "metadata": {"organization_id": "org-a"},
        }},
    }


class FakeCheckout:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    async def create_checkout(self, **kwargs) -> str:
        self.calls.append(kwargs)
        return "https://checkout.stripe.example/session"


class FakePortal:
    async def create_portal(self, **kwargs) -> str:
        return "https://portal.stripe.example/session"


class FakeMembers:
    def __init__(self, count: int) -> None:
        self.count = count

    async def count_billable_members(self, organization_id: str) -> int:
        return self.count


class FakeSeats:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    async def set_quantity(self, **kwargs) -> None:
        self.calls.append(kwargs)


def build_client(*, settings: BillingV2Settings, role: str = "owner", members: int = 3,
                 repository: InMemoryBillingRepository | None = None):
    repository = repository or InMemoryBillingRepository()
    checkout = FakeCheckout()

    async def principal(_request: Request) -> BillingPrincipal:
        return BillingPrincipal(actor_id="profile-a", organization_id="org-a", role=role)

    app = FastAPI()
    app.include_router(create_billing_router(BillingDependencies(
        settings=settings, repository=repository, checkout=checkout, portal=FakePortal(),
        memberships=FakeMembers(members), principal=principal, telemetry=StructuredLogTelemetry(),
    )))
    return TestClient(app), repository, checkout


DISABLED = BillingV2Settings()
ENABLED = BillingV2Settings(enabled=True, checkout_activated=True, price_id="price_test_1",
                            webhook_secret=WEBHOOK_SECRET)


def test_status_fails_closed_until_billing_is_enabled_and_verified() -> None:
    api, _, _ = build_client(settings=DISABLED)
    value = api.get("/api/v2/billing/status").json()
    assert value["entitlement_state"] == "disabled"
    assert value["externally_verified"] is False
    assert value["checkout_enabled"] is False
    assert value["portal_enabled"] is False


def test_checkout_requires_admin_role_activation_and_members() -> None:
    member_api, _, _ = build_client(settings=ENABLED, role="member")
    assert member_api.post("/api/v2/billing/checkout", json={"idempotency_key": "checkout-1"}).status_code == 403

    inactive_api, _, _ = build_client(settings=DISABLED, role="owner")
    assert inactive_api.post("/api/v2/billing/checkout", json={"idempotency_key": "checkout-1"}).status_code == 503

    empty_api, _, _ = build_client(settings=ENABLED, role="owner", members=0)
    assert empty_api.post("/api/v2/billing/checkout", json={"idempotency_key": "checkout-1"}).status_code == 409

    api, _, checkout = build_client(settings=ENABLED, role="owner", members=7)
    response = api.post("/api/v2/billing/checkout", json={"idempotency_key": "checkout-1"})
    assert response.status_code == 200
    assert response.json()["url"].startswith("https://checkout.stripe.example/")
    assert checkout.calls[0]["quantity"] == 7
    assert checkout.calls[0]["price_id"] == "price_test_1"
    assert checkout.calls[0]["idempotency_key"] == "checkout-1"


def test_signed_webhook_drives_subscription_entitlement_and_status() -> None:
    api, repository, _ = build_client(settings=ENABLED)
    body, signature = sign(subscription_event("evt_1"))
    applied = api.post("/api/v2/billing/webhooks/stripe", content=body,
                       headers={"stripe-signature": signature})
    assert applied.status_code == 200
    assert applied.json()["result"] == "applied"
    assert repository.subscriptions["org-a"].status == "active"
    assert repository.entitlements["org-a"].state == "enabled"

    replay = api.post("/api/v2/billing/webhooks/stripe", content=body,
                      headers={"stripe-signature": signature})
    assert replay.json()["result"] == "duplicate"

    status = api.get("/api/v2/billing/status").json()
    assert status["entitlement_state"] == "enabled"
    assert status["externally_verified"] is True
    assert status["seat_quantity"] == 5
    assert status["portal_enabled"] is True


def test_forged_or_stale_webhook_causes_no_mutation() -> None:
    api, repository, _ = build_client(settings=ENABLED)
    body, _ = sign(subscription_event("evt_forged"))
    forged = api.post("/api/v2/billing/webhooks/stripe", content=body,
                      headers={"stripe-signature": "t=1,v1=deadbeef"})
    assert forged.status_code == 400
    assert repository.subscriptions == {}
    assert repository.events == {}

    stale_body, stale_signature = sign(subscription_event("evt_stale"), at=int(time.time()) - 4000)
    outside_window = api.post("/api/v2/billing/webhooks/stripe", content=stale_body,
                              headers={"stripe-signature": stale_signature})
    assert outside_window.status_code == 400
    assert repository.subscriptions == {}


def test_out_of_order_webhook_cannot_regress_newer_subscription_state() -> None:
    api, repository, _ = build_client(settings=ENABLED)
    newer_body, newer_signature = sign(subscription_event("evt_new", status="active", created=1_800_000_100))
    api.post("/api/v2/billing/webhooks/stripe", content=newer_body, headers={"stripe-signature": newer_signature})
    older_body, older_signature = sign(subscription_event("evt_old", status="canceled", created=1_800_000_000))
    response = api.post("/api/v2/billing/webhooks/stripe", content=older_body,
                        headers={"stripe-signature": older_signature})
    assert response.json()["result"] == "ignored_stale"
    assert repository.subscriptions["org-a"].status == "active"


@pytest.mark.asyncio
async def test_seat_reconciliation_updates_only_when_out_of_sync() -> None:
    seats = FakeSeats()
    telemetry = StructuredLogTelemetry()
    subscription = SubscriptionRecord("org-a", "cus_1", "sub_1", "active", 5, 1_800_000_000)

    reconciler = SeatReconciler(FakeMembers(5), seats, telemetry)
    in_sync = await reconciler.reconcile(subscription, organization_id="org-a")
    assert in_sync.action == "in_sync" and seats.calls == []

    reconciler = SeatReconciler(FakeMembers(8), seats, telemetry)
    updated = await reconciler.reconcile(subscription, organization_id="org-a")
    assert updated.action == "updated"
    assert seats.calls == [{"subscription_id": "sub_1", "quantity": 8,
                            "idempotency_key": "seats:sub_1:8"}]

    reconciler = SeatReconciler(FakeMembers(0), seats, telemetry)
    zero = await reconciler.reconcile(subscription, organization_id="org-a")
    assert zero.action == "skipped_zero" and len(seats.calls) == 1

    canceled = SubscriptionRecord("org-a", "cus_1", "sub_1", "canceled", 5, 1_800_000_000)
    reconciler = SeatReconciler(FakeMembers(8), seats, telemetry)
    skipped = await reconciler.reconcile(canceled, organization_id="org-a")
    assert skipped.action == "skipped_status" and len(seats.calls) == 1

    reconciler = SeatReconciler(FakeMembers(8), seats, telemetry)
    missing = await reconciler.reconcile(None, organization_id="org-a")
    assert missing.action == "skipped_no_subscription"


def test_live_billing_refuses_to_boot_without_durable_persistence(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BILLING_V2_ENABLED", "true")
    monkeypatch.setenv("BEYOND_ENV", "production")
    with pytest.raises(RuntimeError, match="durable billing persistence"):
        create_configured_billing_router()

    monkeypatch.setenv("BEYOND_ENV", "development")
    router = create_configured_billing_router()
    assert any(route.path == "/api/v2/billing/status" for route in router.routes)


def test_observability_is_disabled_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("SENTRY_ENABLED", "SENTRY_DSN", "OTEL_ENABLED", "OTEL_EXPORTER_OTLP_ENDPOINT"):
        monkeypatch.delenv(name, raising=False)
    assert init_observability() == {"sentry": False, "otel": False}
