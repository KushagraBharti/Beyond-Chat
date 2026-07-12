"""Composition root for billing_v2.

Mounting is safe in every environment because each route fails closed on the
activation flags. What is NOT safe is running with ``BILLING_V2_ENABLED=true``
before durable billing persistence exists, so that combination refuses to
boot rather than silently processing webhooks into process memory.
"""

from __future__ import annotations

from fastapi import APIRouter

from .adapters import (
    InMemoryBillingRepository,
    SupabaseBillingRepository,
    StripeCheckoutAdapter,
    StripePortalAdapter,
    SupabaseMembershipCounter,
    workos_principal_resolver,
)
from .config import BillingV2Settings
from .observability import StructuredLogTelemetry
from .router import BillingDependencies, create_billing_router
from ..supabase_service import supabase_service


def create_configured_billing_router() -> APIRouter:
    settings = BillingV2Settings.from_env()
    client = supabase_service.client()
    repository = SupabaseBillingRepository(client) if client is not None else InMemoryBillingRepository()
    return create_billing_router(
        BillingDependencies(
            settings=settings,
            repository=repository,
            checkout=StripeCheckoutAdapter(),
            portal=StripePortalAdapter(repository),
            memberships=SupabaseMembershipCounter(),
            principal=workos_principal_resolver(),
            telemetry=StructuredLogTelemetry(),
        )
    )
