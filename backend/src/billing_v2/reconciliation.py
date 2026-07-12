"""Seat reconciliation: canonical active memberships drive the paid quantity.

Reconciliation is deliberately one-directional — the canonical database is the
source of truth for billable seats, Stripe follows. It never mutates
memberships, never lowers access on its own, and is idempotent: the
idempotency key derives from (subscription, target quantity), so retries and
duplicate schedules cannot double-apply.
"""

from __future__ import annotations

from dataclasses import dataclass

from .models import SubscriptionRecord
from .ports import MembershipPort, SeatQuantityPort, TelemetryPort


@dataclass(frozen=True)
class SeatReconciliationResult:
    organization_id: str
    action: str  # "updated" | "in_sync" | "skipped_no_subscription" | "skipped_status" | "skipped_zero"
    billable_members: int
    previous_quantity: int


RECONCILABLE_STATUSES = {"active", "trialing", "past_due"}


class SeatReconciler:
    def __init__(self, memberships: MembershipPort, seats: SeatQuantityPort, telemetry: TelemetryPort) -> None:
        self._memberships = memberships
        self._seats = seats
        self._telemetry = telemetry

    async def reconcile(self, subscription: SubscriptionRecord | None, *, organization_id: str) -> SeatReconciliationResult:
        billable = await self._memberships.count_billable_members(organization_id)
        previous = subscription.quantity if subscription else 0
        if subscription is None:
            return SeatReconciliationResult(organization_id, "skipped_no_subscription", billable, previous)
        if subscription.status not in RECONCILABLE_STATUSES:
            # Canceled/unpaid subscriptions are portal/checkout journeys, not
            # silent quantity edits.
            return SeatReconciliationResult(organization_id, "skipped_status", billable, previous)
        if billable < 1:
            # Never reconcile to zero automatically; an organization with no
            # active members is an offboarding decision, not a quantity tweak.
            self._telemetry.counter("billing.seats.skipped_zero", organization_id=organization_id)
            return SeatReconciliationResult(organization_id, "skipped_zero", billable, previous)
        if billable == subscription.quantity:
            return SeatReconciliationResult(organization_id, "in_sync", billable, previous)
        await self._seats.set_quantity(
            subscription_id=subscription.subscription_id,
            quantity=billable,
            idempotency_key=f"seats:{subscription.subscription_id}:{billable}",
        )
        self._telemetry.counter(
            "billing.seats.updated",
            organization_id=organization_id,
            from_quantity=str(subscription.quantity),
            to_quantity=str(billable),
        )
        return SeatReconciliationResult(organization_id, "updated", billable, previous)
