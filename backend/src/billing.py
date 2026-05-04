from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from postgrest.exceptions import APIError

from .auth import RequestContext, require_request_context
from .config import settings
from .supabase_service import supabase_service

LOGGER = logging.getLogger("beyond_chat.billing")

router = APIRouter(prefix="/api/billing", tags=["billing"])

FREE_REQUEST_LIMIT = 20
FREE_SPEND_LIMIT = 2.00
PRO_SPEND_LIMIT = 50.00


def _configure_stripe() -> None:
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe is not configured.")
    stripe.api_key = settings.stripe_secret_key


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

    result = db.table("user_plans").upsert({"user_id": user_id}).execute()
    rows = result.data or []
    if rows:
        return rows[0]
    return {
        "user_id": user_id,
        "plan": "free",
        "status": "active",
        "stripe_customer_id": None,
        "stripe_subscription_id": None,
        "current_period_end": None,
    }


def _free_plan(user_id: str) -> dict[str, Any]:
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
    total_cost = sum(float(row.get("estimated_cost_usd") or 0) for row in rows)
    return {"requests": len(rows), "spend_usd": round(total_cost, 6)}


def _subscription_period_end(subscription: Any) -> str | None:
    period_end = None
    if isinstance(subscription, dict):
        period_end = subscription.get("current_period_end")
    else:
        period_end = getattr(subscription, "current_period_end", None)
    if not period_end:
        return None
    return datetime.fromtimestamp(int(period_end), tz=timezone.utc).isoformat()


def _subscription_plan_status(stripe_status: str | None) -> tuple[str, str]:
    status = stripe_status or "active"
    if status in {"active", "trialing", "past_due"}:
        return "pro", status
    if status in {"canceled", "unpaid", "incomplete_expired", "paused"}:
        return "free", "cancelled" if status == "canceled" else status
    return "free", status


def _extract_subscription_id(value: Any) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        candidate = value.get("id")
        return candidate if isinstance(candidate, str) else None
    candidate = getattr(value, "id", None)
    return candidate if isinstance(candidate, str) else None


def _sync_subscription(subscription: Any) -> None:
    subscription_id = _extract_subscription_id(subscription)
    if not subscription_id:
        return

    if isinstance(subscription, dict):
        stripe_status = subscription.get("status")
        customer_id = subscription.get("customer")
        metadata = subscription.get("metadata") or {}
    else:
        stripe_status = getattr(subscription, "status", None)
        customer_id = getattr(subscription, "customer", None)
        metadata = getattr(subscription, "metadata", {}) or {}

    plan, status = _subscription_plan_status(stripe_status)
    update: dict[str, Any] = {
        "plan": plan,
        "status": status,
        "current_period_end": _subscription_period_end(subscription),
    }
    if plan == "free":
        update["stripe_subscription_id"] = None

    db = _db()
    user_id = metadata.get("supabase_user_id") if isinstance(metadata, dict) else None
    if isinstance(user_id, str) and user_id:
        update["stripe_customer_id"] = customer_id
        if plan == "pro":
            update["stripe_subscription_id"] = subscription_id
        db.table("user_plans").upsert({"user_id": user_id, **update}).execute()
        return

    db.table("user_plans").update(update).eq("stripe_subscription_id", subscription_id).execute()


def record_usage_event(
    context: RequestContext,
    *,
    event_type: str,
    model: str | None = None,
    estimated_cost_usd: float = 0.0,
) -> None:
    try:
        _db().table("usage_events").insert(
            {
                "user_id": context.user_id,
                "workspace_id": context.workspace_id,
                "event_type": event_type,
                "model": model,
                "estimated_cost_usd": estimated_cost_usd,
            }
        ).execute()
    except APIError as exc:
        LOGGER.warning("usage event write failed user_id=%s event_type=%s error=%s", context.user_id, event_type, exc)
    except Exception:
        LOGGER.exception("usage event write failed user_id=%s event_type=%s", context.user_id, event_type)


@router.get("/status")
def billing_status(context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    billing_storage = "available"
    try:
        plan = _get_or_create_plan(context.user_id)
    except HTTPException:
        billing_storage = "unavailable"
        plan = _free_plan(context.user_id)
    except APIError as exc:
        billing_storage = "unavailable"
        LOGGER.warning("billing plan lookup failed user_id=%s error=%s", context.user_id, exc)
        plan = _free_plan(context.user_id)

    try:
        usage = _monthly_usage(context.user_id) if billing_storage == "available" else {"requests": 0, "spend_usd": 0.0}
    except APIError as exc:
        billing_storage = "unavailable"
        LOGGER.warning("billing usage lookup failed user_id=%s error=%s", context.user_id, exc)
        usage = {"requests": 0, "spend_usd": 0.0}

    active_plan = plan.get("plan") or "free"
    return {
        "plan": active_plan,
        "status": plan.get("status") or "active",
        "current_period_end": plan.get("current_period_end"),
        "billing_storage": billing_storage,
        "checkout_configured": bool(settings.stripe_secret_key and settings.stripe_pro_price_id),
        "portal_configured": bool(settings.stripe_secret_key and plan.get("stripe_customer_id")),
        "usage": usage,
        "limits": {
            "requests": FREE_REQUEST_LIMIT if active_plan == "free" else None,
            "spend_usd": FREE_SPEND_LIMIT if active_plan == "free" else PRO_SPEND_LIMIT,
        },
    }


@router.post("/checkout")
def create_checkout(context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    if not settings.stripe_pro_price_id:
        raise HTTPException(status_code=503, detail="Stripe price ID is not configured.")

    _configure_stripe()
    db = _db()
    plan = _get_or_create_plan(context.user_id)
    customer_id = plan.get("stripe_customer_id")

    if not customer_id:
        customer = stripe.Customer.create(
            email=context.email,
            metadata={"supabase_user_id": context.user_id},
        )
        customer_id = customer.id
        db.table("user_plans").update({"stripe_customer_id": customer_id}).eq("user_id", context.user_id).execute()

    base_url = settings.app_url.rstrip("/")
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        payment_method_types=["card"],
        line_items=[{"price": settings.stripe_pro_price_id, "quantity": 1}],
        success_url=f"{base_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{base_url}/billing/cancel",
        client_reference_id=context.user_id,
        metadata={"supabase_user_id": context.user_id},
        subscription_data={"metadata": {"supabase_user_id": context.user_id}},
    )
    if not session.url:
        raise HTTPException(status_code=502, detail="Stripe did not return a checkout URL.")
    return {"checkoutUrl": session.url}


@router.post("/portal")
def create_portal(context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    _configure_stripe()
    plan = _get_or_create_plan(context.user_id)
    customer_id = plan.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer found for this account.")

    base_url = settings.app_url.rstrip("/")
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{base_url}/settings",
    )
    if not session.url:
        raise HTTPException(status_code=502, detail="Stripe did not return a portal URL.")
    return {"portalUrl": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request) -> Response:
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhook secret is not configured.")
    _configure_stripe()

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook payload.") from exc
    except stripe.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook signature.") from exc

    event_type = event["type"]
    data = event["data"]["object"]
    db = _db()

    if event_type == "checkout.session.completed":
        user_id = (data.get("metadata") or {}).get("supabase_user_id")
        subscription_id = data.get("subscription")
        if user_id:
            update: dict[str, Any] = {
                "user_id": user_id,
                "stripe_customer_id": data.get("customer"),
                "stripe_subscription_id": subscription_id,
                "plan": "pro",
                "status": "active",
            }
            if subscription_id:
                try:
                    subscription = stripe.Subscription.retrieve(subscription_id)
                    update["current_period_end"] = _subscription_period_end(subscription)
                except Exception:
                    LOGGER.exception("failed to retrieve subscription %s during checkout webhook", subscription_id)
            db.table("user_plans").upsert(update).execute()
            LOGGER.info("checkout.session.completed user_id=%s subscription_id=%s", user_id, subscription_id)

    elif event_type in {"customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"}:
        _sync_subscription(data)

    elif event_type == "invoice.payment_succeeded":
        subscription_id = _extract_subscription_id(data.get("subscription"))
        if subscription_id:
            subscription = stripe.Subscription.retrieve(subscription_id)
            _sync_subscription(subscription)

    return Response(status_code=200)
