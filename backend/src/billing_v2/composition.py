"""Composition root for billing_v2.

Mounting is safe in every environment because each route fails closed on the
activation flags. What is NOT safe is running with ``BILLING_V2_ENABLED=true``
before durable billing persistence exists, so that combination refuses to
boot rather than silently processing webhooks into process memory.
"""

from __future__ import annotations

from os import environ

from fastapi import APIRouter

from .adapters import (
    InMemoryBillingRepository,
    StripeCheckoutAdapter,
    StripePortalAdapter,
    SupabaseMembershipCounter,
    workos_principal_resolver,
)
from .config import BillingV2Settings
from .observability import StructuredLogTelemetry
from .router import BillingDependencies, create_billing_router


def create_configured_billing_router() -> APIRouter:
    settings = BillingV2Settings.from_env()
    environment = environ.get("BEYOND_ENV", "production").strip().lower()
    if settings.enabled and environment not in {"development", "dev", "test"}:
        # Durable billing tables (activation runbook gate M1) are a hard
        # precondition for live processing. Fail loudly at boot, never
        # accumulate verified billing events in process memory.
        raise RuntimeError(
            "BILLING_V2_ENABLED requires durable billing persistence; "
            "apply the billing tables migration and swap the repository first."
        )
    repository = InMemoryBillingRepository()
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
