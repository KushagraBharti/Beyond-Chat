"""Concrete adapters for the Phase 12 billing_v2 ports.

Everything here is activation-ready but fail-closed by default:

- Stripe adapters call the installed SDK in a worker thread with per-call API
  keys and idempotency keys; they are never constructed unless billing_v2 is
  enabled and a secret is configured.
- The membership counter and principal resolver reuse the canonical identity
  tables and WorkOS session verification — client claims are never trusted.
- Durable subscription/entitlement persistence requires the billing tables
  specified in docs/operations/launch/billing-activation-runbook.md (a
  Codex-owned migration). Until those exist, ``InMemoryBillingRepository`` is
  the only repository and the router must not be mounted with
  ``BILLING_V2_ENABLED=true`` in production.
"""

from __future__ import annotations

import asyncio
from os import environ
from typing import Any, Literal

from fastapi import HTTPException, Request, Response, status

from ..authorization.policy import Principal
from ..identity.authkit import get_identity_repository, get_workos_provider, require_principal
from ..supabase_service import supabase_service
from .models import BillingPrincipal, BillingStatus, EntitlementDecision, SubscriptionRecord, VerifiedStripeEvent


def _stripe():
    import stripe

    return stripe


def _secret_key() -> str:
    key = environ.get("STRIPE_SECRET_KEY", "")
    if not key:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured.")
    return key


class StripeCheckoutAdapter:
    """Creates a seat-quantity subscription Checkout Session."""

    async def create_checkout(self, *, organization_id: str, quantity: int, price_id: str,
                              success_url: str, cancel_url: str, idempotency_key: str) -> str:
        def call() -> str:
            session = _stripe().checkout.Session.create(
                api_key=_secret_key(),
                mode="subscription",
                client_reference_id=organization_id,
                line_items=[{"price": price_id, "quantity": quantity}],
                subscription_data={"metadata": {"organization_id": organization_id}},
                success_url=success_url,
                cancel_url=cancel_url,
                idempotency_key=idempotency_key,
            )
            url = session.get("url") if isinstance(session, dict) else getattr(session, "url", None)
            if not url:
                raise RuntimeError("Stripe did not return a checkout URL.")
            return str(url)

        return await asyncio.to_thread(call)


class StripePortalAdapter:
    """Creates a Billing Portal session for the organization's customer."""

    def __init__(self, repository: "InMemoryBillingRepository | Any") -> None:
        self._repository = repository

    async def create_portal(self, *, organization_id: str, return_url: str) -> str:
        subscription = await self._repository.get_subscription(organization_id)
        if subscription is None:
            raise HTTPException(status.HTTP_409_CONFLICT,
                                "No verified subscription exists for this organization yet.")

        def call() -> str:
            session = _stripe().billing_portal.Session.create(
                api_key=_secret_key(),
                customer=subscription.customer_id,
                return_url=return_url,
            )
            url = session.get("url") if isinstance(session, dict) else getattr(session, "url", None)
            if not url:
                raise RuntimeError("Stripe did not return a portal URL.")
            return str(url)

        return await asyncio.to_thread(call)


class StripeSeatQuantityAdapter:
    """Updates the seat quantity on the single seat subscription item."""

    async def set_quantity(self, *, subscription_id: str, quantity: int, idempotency_key: str) -> None:
        def call() -> None:
            stripe = _stripe()
            subscription = stripe.Subscription.retrieve(subscription_id, api_key=_secret_key())
            items = subscription["items"]["data"] if isinstance(subscription, dict) else subscription.items.data
            if not items:
                raise RuntimeError("The subscription has no items to update.")
            first = items[0]
            item_id = first["id"] if isinstance(first, dict) else first.id
            stripe.SubscriptionItem.modify(
                item_id, api_key=_secret_key(), quantity=quantity, idempotency_key=idempotency_key,
            )

        await asyncio.to_thread(call)


class SupabaseMembershipCounter:
    """Billable seats = active memberships in the canonical organization."""

    def _client(self):
        client = supabase_service.client()
        if client is None:
            raise RuntimeError("Billable member counting requires the canonical database.")
        return client

    async def count_billable_members(self, organization_id: str) -> int:
        def call() -> int:
            rows = (
                self._client()
                .table("organization_memberships")
                .select("id")
                .eq("organization_id", organization_id)
                .eq("state", "active")
                .execute()
                .data
                or []
            )
            return len(rows)

        return await asyncio.to_thread(call)


def workos_principal_resolver():
    """Resolve the canonical WorkOS principal for billing routes.

    Reuses the identity plane's ``require_principal`` so billing authorization
    always reflects the current canonical membership (revocation/suspension is
    immediate), never a client claim.
    """

    async def resolve(request: Request) -> BillingPrincipal:
        provider = get_workos_provider()
        repository = get_identity_repository()
        sealed = request.cookies.get(environ.get("WORKOS_SESSION_COOKIE_NAME", "beyond_session"))
        principal: Principal = await require_principal(
            request, Response(), sealed_session=sealed, provider=provider, repository=repository,
        )
        return BillingPrincipal(
            actor_id=principal.profile_id,
            organization_id=principal.organization_id,
            role=principal.role.value,
        )

    return resolve


class InMemoryBillingRepository:
    """Complete, contract-true repository for tests and pre-activation use.

    Not durable: it must never back a production deployment with
    ``BILLING_V2_ENABLED=true``. The durable adapter lands with the billing
    tables migration (see the activation runbook, gate M1).
    """

    def __init__(self) -> None:
        self.events: dict[str, str] = {}
        self.event_failures: dict[str, str] = {}
        self.subscriptions: dict[str, SubscriptionRecord] = {}
        self.entitlements: dict[str, EntitlementDecision] = {}

    async def begin_event(self, event: VerifiedStripeEvent) -> Literal["accepted", "duplicate"]:
        if event.id in self.events:
            return "duplicate"
        self.events[event.id] = "processing"
        return "accepted"

    async def complete_event(self, event_id: str) -> None:
        self.events[event_id] = "processed"

    async def fail_event(self, event_id: str, reason: str) -> None:
        self.events[event_id] = "failed"
        self.event_failures[event_id] = reason

    async def get_subscription(self, organization_id: str) -> SubscriptionRecord | None:
        return self.subscriptions.get(organization_id)

    async def save_subscription(self, value: SubscriptionRecord) -> None:
        self.subscriptions[value.organization_id] = value

    async def save_entitlement(self, value: EntitlementDecision) -> None:
        self.entitlements[value.organization_id] = value

    async def get_status(self, organization_id: str) -> BillingStatus:
        subscription = self.subscriptions.get(organization_id)
        entitlement = self.entitlements.get(organization_id)
        return BillingStatus(
            organization_id=organization_id,
            subscription_status=subscription.status if subscription else "none",
            entitlement_state=entitlement.state if entitlement else "disabled",
            seat_quantity=subscription.quantity if subscription else 0,
            billable_members=0,
            checkout_enabled=subscription is None or subscription.status in {"canceled", "unpaid"},
            portal_enabled=subscription is not None,
            externally_verified=entitlement is not None,
        )
