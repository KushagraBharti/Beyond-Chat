from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from math import ceil
from typing import Any, Mapping, Sequence

import httpx

from .http import request_json
from .types import ProviderCallError


@dataclass(frozen=True)
class OpenRouterConfig:
    api_key: str
    allowed_models: frozenset[str]
    max_completion_tokens: int
    max_request_cost_cents: int
    timeout_seconds: float = 45.0
    base_url: str = "https://openrouter.ai/api/v1"
    http_referer: str | None = None

    @property
    def ready(self) -> bool:
        return bool(
            self.api_key
            and self.allowed_models
            and self.max_completion_tokens > 0
            and self.max_request_cost_cents > 0
            and 0 < self.timeout_seconds <= 120
        )


class OpenRouterAdapter:
    provider_version = "openrouter-rest-v1"

    def __init__(self, config: OpenRouterConfig, client: httpx.AsyncClient | None = None) -> None:
        self.config = config
        self._client = client or httpx.AsyncClient(timeout=config.timeout_seconds)
        self._pricing: dict[str, tuple[Decimal, Decimal]] = {}

    def _headers(self) -> dict[str, str]:
        value = {"Authorization": f"Bearer {self.config.api_key}", "Content-Type": "application/json"}
        if self.config.http_referer:
            value["HTTP-Referer"] = self.config.http_referer
            value["X-OpenRouter-Title"] = "Beyond Chat"
        return value

    async def models(self) -> list[dict[str, Any]]:
        if not self.config.ready:
            raise ProviderCallError("openrouter", "not_configured")
        value = await request_json(
            self._client, "openrouter", "GET", f"{self.config.base_url}/models", headers=self._headers()
        )
        rows = value.get("data")
        if not isinstance(rows, list):
            raise ProviderCallError("openrouter", "invalid_response")
        result: list[dict[str, Any]] = []
        for row in rows:
            if not isinstance(row, Mapping) or row.get("id") not in self.config.allowed_models:
                continue
            pricing = row.get("pricing") if isinstance(row.get("pricing"), Mapping) else {}
            try:
                self._pricing[str(row["id"])] = (
                    Decimal(str(pricing.get("prompt", "0"))),
                    Decimal(str(pricing.get("completion", "0"))),
                )
            except InvalidOperation:
                raise ProviderCallError("openrouter", "invalid_pricing")
            result.append({
                "id": row["id"],
                "name": row.get("name") or row["id"],
                "canonical_slug": row.get("canonical_slug"),
                "context_length": row.get("context_length"),
                "pricing": pricing,
                "supported_parameters": row.get("supported_parameters", []),
                "provider_version": self.provider_version,
            })
        return result

    async def run(
        self,
        *,
        model: str,
        messages: Sequence[Mapping[str, Any]],
        max_completion_tokens: int,
        budget_cents: int,
        temperature: float | None = None,
    ) -> dict[str, Any]:
        if not self.config.ready:
            raise ProviderCallError("openrouter", "not_configured")
        if model not in self.config.allowed_models:
            raise ProviderCallError("openrouter", "model_not_allowed")
        if not 1 <= max_completion_tokens <= self.config.max_completion_tokens:
            raise ProviderCallError("openrouter", "token_budget_exceeded")
        if not 1 <= budget_cents <= self.config.max_request_cost_cents:
            raise ProviderCallError("openrouter", "cost_budget_exceeded")
        if model not in self._pricing:
            await self.models()
        prompt_price, completion_price = self._pricing.get(model, (Decimal("0"), Decimal("0")))
        if prompt_price < 0 or completion_price < 0:
            raise ProviderCallError("openrouter", "pricing_unavailable")
        input_characters = sum(len(str(message.get("content", ""))) for message in messages)
        estimated_prompt_tokens = max(1, ceil(input_characters / 4))
        maximum_cost_cents = (
            prompt_price * estimated_prompt_tokens + completion_price * max_completion_tokens
        ) * 100
        if maximum_cost_cents > Decimal(budget_cents):
            raise ProviderCallError("openrouter", "estimated_cost_exceeds_budget")
        payload: dict[str, Any] = {
            "model": model,
            "messages": list(messages),
            "max_completion_tokens": max_completion_tokens,
            "stream": False,
            "provider": {"sort": "price", "max_price": {
                "prompt": float(prompt_price * 1_000_000),
                "completion": float(completion_price * 1_000_000),
            }},
        }
        if temperature is not None:
            payload["temperature"] = temperature
        value = await request_json(
            self._client, "openrouter", "POST", f"{self.config.base_url}/chat/completions",
            headers=self._headers(), json=payload,
        )
        choices = value.get("choices")
        if not isinstance(choices, list):
            raise ProviderCallError("openrouter", "invalid_response")
        usage = value.get("usage") if isinstance(value.get("usage"), Mapping) else {}
        raw_cost = usage.get("cost")
        if isinstance(raw_cost, (int, float)) and raw_cost * 100 > budget_cents:
            raise ProviderCallError("openrouter", "provider_cost_exceeded")
        return {
            "id": value.get("id"),
            "model": value.get("model") or model,
            "choices": choices,
            "usage": dict(usage),
            "provider_version": self.provider_version,
        }
