from __future__ import annotations

from typing import Any, Mapping

import httpx

from .http import request_json
from .types import ProviderCallError


class ExaAdapter:
    provider_version = "exa-search-rest-v1"

    def __init__(self, api_key: str, *, timeout_seconds: float = 30.0,
                 base_url: str = "https://api.exa.ai", client: httpx.AsyncClient | None = None) -> None:
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.base_url = base_url.rstrip("/")
        self._client = client or httpx.AsyncClient(timeout=timeout_seconds)

    @property
    def ready(self) -> bool:
        return bool(self.api_key and 0 < self.timeout_seconds <= 120)

    async def search(self, *, query: str, limit: int) -> dict[str, Any]:
        if not self.ready:
            raise ProviderCallError("exa", "not_configured")
        value = await request_json(
            self._client, "exa", "POST", f"{self.base_url}/search",
            headers={"x-api-key": self.api_key, "Content-Type": "application/json"},
            json={"query": query, "numResults": limit, "type": "auto",
                  "moderation": True, "contents": {"highlights": {"maxCharacters": 2000}}},
        )
        rows = value.get("results")
        if not isinstance(rows, list):
            raise ProviderCallError("exa", "invalid_response")
        results: list[dict[str, Any]] = []
        for row in rows[:limit]:
            if not isinstance(row, Mapping) or not isinstance(row.get("url"), str):
                continue
            results.append({key: row.get(key) for key in
                            ("id", "title", "url", "publishedDate", "author", "highlights")})
        return {
            "request_id": value.get("requestId"),
            "results": results,
            "cost_dollars": value.get("costDollars"),
            "provider_version": self.provider_version,
        }
