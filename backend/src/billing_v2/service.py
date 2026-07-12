from __future__ import annotations

from .models import EntitlementDecision, SubscriptionRecord, SubscriptionStatus, VerifiedStripeEvent
from .ports import BillingRepository, TelemetryPort

VALID_STATUSES: set[str] = {"incomplete", "trialing", "active", "past_due", "unpaid", "canceled", "paused"}


def derive_entitlement(subscription: SubscriptionRecord | None) -> EntitlementDecision:
    if subscription is None:
        return EntitlementDecision("unknown", "disabled", "no_verified_subscription", None)
    enabled = subscription.status in {"active", "trialing"}
    return EntitlementDecision(subscription.organization_id, "enabled" if enabled else "disabled", f"subscription_{subscription.status}", subscription.subscription_id)


class BillingWebhookProcessor:
    def __init__(self, repository: BillingRepository, telemetry: TelemetryPort):
        self.repository = repository
        self.telemetry = telemetry

    async def process(self, event: VerifiedStripeEvent) -> str:
        if await self.repository.begin_event(event) == "duplicate":
            self.telemetry.counter("billing.webhook.duplicate", event_type=event.type)
            return "duplicate"
        try:
            if not event.type.startswith("customer.subscription."):
                await self.repository.complete_event(event.id)
                return "ignored"
            metadata = event.object.get("metadata")
            organization_id = metadata.get("organization_id") if isinstance(metadata, dict) else None
            subscription_id, customer_id = event.object.get("id"), event.object.get("customer")
            if not all(isinstance(value, str) and value for value in (organization_id, subscription_id, customer_id)):
                raise ValueError("Verified subscription event lacks organization metadata or provider IDs.")
            current = await self.repository.get_subscription(organization_id)
            if current and current.provider_event_created > event.created:
                await self.repository.complete_event(event.id)
                self.telemetry.counter("billing.webhook.stale", event_type=event.type)
                return "ignored_stale"
            raw_status = "canceled" if event.type.endswith(".deleted") else event.object.get("status", "incomplete")
            status: SubscriptionStatus = raw_status if raw_status in VALID_STATUSES else "incomplete"  # type: ignore[assignment]
            quantity = event.object.get("quantity", current.quantity if current else 0)
            record = SubscriptionRecord(organization_id, customer_id, subscription_id, status, max(0, int(quantity)), event.created, int(event.object["current_period_end"]) if event.object.get("current_period_end") else None)
            await self.repository.save_subscription(record)
            await self.repository.save_entitlement(derive_entitlement(record))
            await self.repository.complete_event(event.id)
            self.telemetry.counter("billing.webhook.applied", event_type=event.type)
            return "applied"
        except Exception as exc:
            await self.repository.fail_event(event.id, str(exc))
            self.telemetry.error(exc, event_id=event.id, event_type=event.type)
            raise
