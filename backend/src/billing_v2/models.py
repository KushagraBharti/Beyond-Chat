from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

SubscriptionStatus = Literal["incomplete", "trialing", "active", "past_due", "unpaid", "canceled", "paused"]


@dataclass(frozen=True)
class BillingPrincipal:
    actor_id: str
    organization_id: str
    role: str


@dataclass(frozen=True)
class VerifiedStripeEvent:
    id: str
    type: str
    created: int
    livemode: bool
    object: dict[str, Any]


@dataclass(frozen=True)
class SubscriptionRecord:
    organization_id: str
    customer_id: str
    subscription_id: str
    status: SubscriptionStatus
    quantity: int
    provider_event_created: int
    current_period_end: int | None = None


@dataclass(frozen=True)
class EntitlementDecision:
    organization_id: str
    state: Literal["enabled", "grace", "disabled"]
    reason: str
    source_subscription_id: str | None


@dataclass(frozen=True)
class BillingStatus:
    organization_id: str
    subscription_status: str
    entitlement_state: str
    seat_quantity: int
    billable_members: int
    checkout_enabled: bool
    portal_enabled: bool
    externally_verified: bool
