from __future__ import annotations

from dataclasses import dataclass
from os import environ


@dataclass(frozen=True)
class BillingV2Settings:
    enabled: bool = False
    price_id: str | None = None
    unit_amount_cents: int = 3000
    currency: str = "usd"
    interval: str = "month"
    webhook_secret: str | None = None
    webhook_tolerance_seconds: int = 300
    app_url: str = "http://127.0.0.1:5173"

    @classmethod
    def from_env(cls) -> "BillingV2Settings":
        return cls(
            enabled=environ.get("BILLING_V2_ENABLED", "false").lower() == "true",
            price_id=environ.get("STRIPE_BILLING_V2_PRICE_ID") or None,
            webhook_secret=environ.get("STRIPE_BILLING_V2_WEBHOOK_SECRET") or None,
            app_url=environ.get("APP_URL", "http://127.0.0.1:5173"),
        )

    @property
    def checkout_ready(self) -> bool:
        return bool(self.enabled and self.price_id)
