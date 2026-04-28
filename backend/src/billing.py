from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from .auth import RequestContext, require_request_context
from .config import settings
from .supabase_service import supabase_service

LOGGER = logging.getLogger("beyond_chat.billing")

router = APIRouter(prefix="/api/billing", tags=["billing"])

FREE_REQUEST_LIMIT = 20
FREE_SPEND_LIMIT = 2.00
PRO_SPEND_LIMIT = 50.00


def _stripe() -> stripe.StripeClient:
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe is not configured.")
    return stripe.StripeClient(settings.stripe_secret_key)


def _db():
    client = supabase_service.client()
    if client is None:
        raise HTTPException(status_code=503, detail="Supabase is not configured.")
    return client


def _get_or_create_plan(user_id: str) -> dict[str, Any]:
    db = _db()
    result = db.table("user_plans").select("*").eq("user_id", user_id).limit(1).execute()
    rows = result.data or []
    if rows:
        return rows[0]
    db.table("user_plans").insert({"user_id": user_id}).execute()
    return {
        "user_id": user_id,
        "plan": "free",
        "status": "active",
        "stripe_customer_id": None,
        "stripe_subscription_id": None,
        "current_period_end": None,
    }


def _monthly_usage(user_id: str) -> dict[str, Any]:
    db = _db()
    month_start = datetime.now(timezone.utc).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    ).isoformat()
    result = (
        db.table("usage_events")
        .select("id, estimated_cost_usd")
        .eq("user_id", user_id)
        .gte("created_at", month_start)
        .execute()
    )
    rows = result.data or []
    total_cost = sum(float(r.get("estimated_cost_usd") or 0) for r in rows)
    return {"requests": len(rows), "spend_usd": round(total_cost, 6)}


@router.get("/status")
def billing_status(context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    plan = _get_or_create_plan(context.user_id)
    usage = _monthly_usage(context.user_id)
    return {
        "plan": plan["plan"],
        "status": plan["status"],
        "current_period_end": plan.get("current_period_end"),
        "usage": usage,
        "limits": {
            "requests": FREE_REQUEST_LIMIT if plan["plan"] == "free" else None,
            "spend_usd": FREE_SPEND_LIMIT if plan["plan"] == "free" else PRO_SPEND_LIMIT,
        },
    }


@router.post("/checkout")
def create_checkout(context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    if not settings.stripe_pro_price_id:
        raise HTTPException(status_code=503, detail="Stripe price ID is not configured.")

    sc = _stripe()
    plan = _get_or_create_plan(context.user_id)
    customer_id = plan.get("stripe_customer_id")

    if not customer_id:
        customer = sc.customers.create(params={
            "email": context.email,
            "metadata": {"supabase_user_id": context.user_id},
        })
        customer_id = customer.id
        _db().table("user_plans").update(
            {"stripe_customer_id": customer_id}
        ).eq("user_id", context.user_id).execute()

    base_url = settings.app_url.rstrip("/")
    session = sc.checkout.sessions.create(params={
        "customer": customer_id,
        "mode": "subscription",
        "payment_method_types": ["card"],
        "line_items": [{"price": settings.stripe_pro_price_id, "quantity": 1}],
        "success_url": f"{base_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{base_url}/pricing",
        "metadata": {"supabase_user_id": context.user_id},
    })
    return {"checkoutUrl": session.url}


@router.post("/portal")
def create_portal(context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    sc = _stripe()
    plan = _get_or_create_plan(context.user_id)
    customer_id = plan.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer found for this account.")

    base_url = settings.app_url.rstrip("/")
    session = sc.billing_portal.sessions.create(params={
        "customer": customer_id,
        "return_url": f"{base_url}/settings",
    })
    return {"portalUrl": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request) -> Response:
    if not settings.stripe_webhook_secret or not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe webhook secret is not configured.")
    stripe.api_key = settings.stripe_secret_key

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    db = _db()
    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        user_id = (data.get("metadata") or {}).get("supabase_user_id")
        if user_id:
            db.table("user_plans").upsert({
                "user_id": user_id,
                "stripe_customer_id": data.get("customer"),
                "stripe_subscription_id": data.get("subscription"),
                "plan": "pro",
                "status": "active",
            }).execute()
            LOGGER.info("checkout.session.completed user_id=%s", user_id)

    elif event_type == "invoice.payment_succeeded":
        subscription_id = data.get("subscription")
        lines = data.get("lines", {}).get("data", [])
        period_end = lines[0].get("period", {}).get("end") if lines else None
        if subscription_id and period_end:
            end_dt = datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat()
            db.table("user_plans").update(
                {"current_period_end": end_dt, "status": "active"}
            ).eq("stripe_subscription_id", subscription_id).execute()

    elif event_type == "customer.subscription.deleted":
        subscription_id = data.get("id")
        if subscription_id:
            db.table("user_plans").update(
                {"plan": "free", "status": "cancelled", "stripe_subscription_id": None}
            ).eq("stripe_subscription_id", subscription_id).execute()

    elif event_type == "customer.subscription.updated":
        subscription_id = data.get("id")
        stripe_status = data.get("status", "active")
        status_map = {"active": "active", "past_due": "past_due", "canceled": "cancelled"}
        if subscription_id:
            db.table("user_plans").update(
                {"status": status_map.get(stripe_status, stripe_status)}
            ).eq("stripe_subscription_id", subscription_id).execute()

    return Response(status_code=200)
