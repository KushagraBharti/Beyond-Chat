from __future__ import annotations

from typing import Any

from ...billing_v2.ports import BillingRepository


class BillingStatusAdapter:
    """Maps only the billing_v2 repository's server-verified status authority."""

    provider_version = "billing-v2-verified-status-v1"

    def __init__(self, repository: BillingRepository, *, enabled: bool) -> None:
        self.repository = repository
        self.enabled = enabled

    async def status(self, organization_id: str) -> dict[str, Any]:
        if not self.enabled:
            return {"state": "unavailable", "externally_verified": False,
                    "entitlement_state": "disabled", "provider_version": self.provider_version}
        value = await self.repository.get_status(organization_id)
        verified = value.externally_verified is True
        entitlement = value.entitlement_state if verified and value.entitlement_state in {
            "enabled", "grace", "disabled"
        } else "disabled"
        return {**value.__dict__, "state": "ready" if verified else "unavailable",
                "externally_verified": verified, "entitlement_state": entitlement,
                "provider_version": self.provider_version}
