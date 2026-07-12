from __future__ import annotations

from typing import Any, Mapping, Sequence

from .billing import BillingStatusAdapter
from .composio import ComposioAdapter
from .exa import ExaAdapter
from .openrouter import OpenRouterAdapter
from .types import ProviderCallError, ProviderScope


class LiveProviderRegistry:
    def __init__(self, *, openrouter: OpenRouterAdapter | None = None, exa: ExaAdapter | None = None,
                 composio: ComposioAdapter | None = None, billing: BillingStatusAdapter | None = None) -> None:
        self.openrouter = openrouter
        self.exa = exa
        self.composio = composio
        self.billing = billing

    def status(self, capability: str, *, organization_id: str) -> Mapping[str, Any]:
        del organization_id
        adapter: Any | None = {
            "models": self.openrouter,
            "retrieval": self.exa,
            "connections": self.composio,
            "composio_actions": self.composio,
            "actions": self.composio,
            "billing": self.billing,
        }.get(capability)
        configured = adapter is not None and (getattr(adapter, "ready", True) is True
                                               or getattr(getattr(adapter, "config", None), "ready", False) is True)
        return {"capability": capability, "state": "ready" if configured else "unavailable",
                "externally_verified": configured, "provider_version": getattr(adapter, "provider_version", None)}

    async def model_catalog(self) -> list[dict[str, Any]]:
        if not self.openrouter:
            raise ProviderCallError("openrouter", "not_configured")
        return await self.openrouter.models()

    async def run_model(self, *, model: str, messages: Sequence[Mapping[str, Any]],
                        max_completion_tokens: int, budget_cents: int,
                        temperature: float | None = None) -> dict[str, Any]:
        if not self.openrouter:
            raise ProviderCallError("openrouter", "not_configured")
        return await self.openrouter.run(model=model, messages=messages,
            max_completion_tokens=max_completion_tokens, budget_cents=budget_cents, temperature=temperature)

    async def retrieve(self, *, query: str, limit: int) -> dict[str, Any]:
        if not self.exa:
            raise ProviderCallError("exa", "not_configured")
        return await self.exa.search(query=query, limit=limit)

    async def connect_link(self, **kwargs: Any) -> dict[str, Any]:
        if not self.composio:
            raise ProviderCallError("composio", "not_configured")
        return await self.composio.connect_link(**kwargs)

    async def connection_status(self, **kwargs: Any) -> dict[str, Any]:
        if not self.composio:
            raise ProviderCallError("composio", "not_configured")
        return await self.composio.connection_status(**kwargs)

    async def execute_action(self, **kwargs: Any) -> dict[str, Any]:
        if not self.composio:
            raise ProviderCallError("composio", "not_configured")
        return await self.composio.execute(**kwargs)

    async def revoke_connection(self, **kwargs: Any) -> dict[str, Any]:
        if not self.composio:
            raise ProviderCallError("composio", "not_configured")
        return await self.composio.revoke(**kwargs)

    async def billing_status(self, organization_id: str) -> dict[str, Any]:
        if not self.billing:
            return {"state": "unavailable", "externally_verified": False,
                    "entitlement_state": "disabled"}
        return await self.billing.status(organization_id)
