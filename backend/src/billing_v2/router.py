from __future__ import annotations

from dataclasses import dataclass

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from .config import BillingV2Settings
from .ports import BillingRepository, CheckoutPort, MembershipPort, PortalPort, PrincipalResolver, TelemetryPort
from .service import BillingWebhookProcessor
from .webhook import WebhookVerificationError, verify_stripe_signature


class CheckoutRequest(BaseModel):
    idempotency_key: str = Field(min_length=8, max_length=200)


@dataclass(frozen=True)
class BillingDependencies:
    settings: BillingV2Settings
    repository: BillingRepository
    checkout: CheckoutPort
    portal: PortalPort
    memberships: MembershipPort
    principal: PrincipalResolver
    telemetry: TelemetryPort


def create_billing_router(deps: BillingDependencies) -> APIRouter:
    """Build the Phase 12 router. Callers must explicitly mount it after activation gates pass."""
    router = APIRouter(prefix="/api/v2/billing", tags=["billing-v2"])
    processor = BillingWebhookProcessor(deps.repository, deps.telemetry)

    @router.get("/status")
    async def status(request: Request):
        principal = await deps.principal(request)
        value = await deps.repository.get_status(principal.organization_id)
        return {**value.__dict__, "checkout_enabled": deps.settings.checkout_ready and value.checkout_enabled, "externally_verified": value.externally_verified}

    @router.post("/checkout")
    async def checkout(body: CheckoutRequest, request: Request):
        principal = await deps.principal(request)
        if principal.role not in {"owner", "admin"}:
            raise HTTPException(403, "Only organization owners or admins may manage billing.")
        if not deps.settings.checkout_ready or not deps.settings.price_id:
            raise HTTPException(503, "Paid checkout is not enabled.")
        quantity = await deps.memberships.count_billable_members(principal.organization_id)
        if quantity < 1:
            raise HTTPException(409, "Organization has no billable members.")
        url = await deps.checkout.create_checkout(organization_id=principal.organization_id, quantity=quantity, price_id=deps.settings.price_id, success_url=f"{deps.settings.app_url.rstrip('/')}/billing/success", cancel_url=f"{deps.settings.app_url.rstrip('/')}/settings/billing", idempotency_key=body.idempotency_key)
        return {"url": url}

    @router.post("/portal")
    async def portal(request: Request):
        principal = await deps.principal(request)
        if principal.role not in {"owner", "admin"}:
            raise HTTPException(403, "Only organization owners or admins may manage billing.")
        if not deps.settings.enabled:
            raise HTTPException(503, "Billing portal is not enabled.")
        return {"url": await deps.portal.create_portal(organization_id=principal.organization_id, return_url=f"{deps.settings.app_url.rstrip('/')}/settings/billing")}

    @router.post("/webhooks/stripe", include_in_schema=False)
    async def stripe_webhook(request: Request):
        if not deps.settings.webhook_secret:
            raise HTTPException(503, "Stripe webhook verification is not configured.")
        try:
            event = verify_stripe_signature(await request.body(), request.headers.get("stripe-signature", ""), deps.settings.webhook_secret, tolerance_seconds=deps.settings.webhook_tolerance_seconds)
        except WebhookVerificationError as exc:
            raise HTTPException(400, str(exc)) from exc
        return {"result": await processor.process(event)}

    return router
