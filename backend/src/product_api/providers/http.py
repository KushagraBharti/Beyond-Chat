from __future__ import annotations

from typing import Any, Mapping

import httpx

from .types import ProviderCallError, require_object


async def request_json(
    client: httpx.AsyncClient,
    provider: str,
    method: str,
    url: str,
    *,
    headers: Mapping[str, str],
    params: Mapping[str, Any] | None = None,
    json: Mapping[str, Any] | None = None,
    expected: tuple[int, ...] = (200,),
) -> Mapping[str, Any]:
    try:
        response = await client.request(method, url, headers=headers, params=params, json=json)
    except httpx.TimeoutException as exc:
        raise ProviderCallError(provider, "timeout", retryable=True) from exc
    except httpx.HTTPError as exc:
        raise ProviderCallError(provider, "transport_error", retryable=True) from exc
    if response.status_code not in expected:
        retryable = response.status_code in {408, 409, 425, 429} or response.status_code >= 500
        raise ProviderCallError(provider, f"http_{response.status_code}", retryable=retryable)
    if response.status_code == 204 or not response.content:
        return {}
    try:
        return require_object(response.json(), provider)
    except ValueError as exc:
        raise ProviderCallError(provider, "invalid_json") from exc
