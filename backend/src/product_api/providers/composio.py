from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any, Mapping
from urllib.parse import quote, urlparse

import httpx

from .http import request_json
from .types import ProviderCallError, ProviderScope


@dataclass(frozen=True)
class ComposioConfig:
    api_key: str
    auth_configs: Mapping[str, str]
    read_tools: Mapping[str, str]
    write_tools: Mapping[str, str]
    callback_base_url: str
    timeout_seconds: float = 30.0
    base_url: str = "https://backend.composio.dev"

    @property
    def ready(self) -> bool:
        callback = urlparse(self.callback_base_url)
        callback_is_safe = callback.scheme == "https" or (
            callback.scheme == "http" and callback.hostname in {"localhost", "127.0.0.1"}
        )
        return bool(
            self.api_key and self.auth_configs and (self.read_tools or self.write_tools)
            and callback_is_safe and 0 < self.timeout_seconds <= 120
        )


class ComposioAdapter:
    provider_version = "composio-rest-v3.1-connections-v3-tools"

    def __init__(self, config: ComposioConfig, client: httpx.AsyncClient | None = None) -> None:
        self.config = config
        self._client = client or httpx.AsyncClient(timeout=config.timeout_seconds)

    def _headers(self) -> dict[str, str]:
        return {"x-api-key": self.config.api_key, "Content-Type": "application/json"}

    @staticmethod
    def external_user_id(scope: ProviderScope) -> str:
        raw = f"{scope.organization_id}\x1f{scope.project_id}\x1f{scope.profile_id}".encode()
        return "beyond_" + hashlib.sha256(raw).hexdigest()

    async def connect_link(self, *, scope: ProviderScope, toolkit: str,
                           connection_record_id: str, state: str) -> dict[str, Any]:
        if not self.config.ready:
            raise ProviderCallError("composio", "not_configured")
        auth_config_id = self.config.auth_configs.get(toolkit)
        if not auth_config_id:
            raise ProviderCallError("composio", "toolkit_not_allowed")
        callback_url = (
            f"{self.config.callback_base_url.rstrip('/')}/projects/{quote(scope.project_id, safe='')}"
            f"/connections/{quote(connection_record_id, safe='')}/callback?state={quote(state)}"
        )
        value = await request_json(
            self._client, "composio", "POST",
            f"{self.config.base_url.rstrip('/')}/api/v3.1/connected_accounts/link",
            headers=self._headers(), expected=(201,),
            json={"auth_config_id": auth_config_id, "user_id": self.external_user_id(scope),
                  "callback_url": callback_url},
        )
        redirect_url = value.get("redirect_url")
        if not isinstance(redirect_url, str) or not redirect_url.startswith("https://"):
            raise ProviderCallError("composio", "invalid_response")
        return {
            "redirect_url": redirect_url,
            "expires_at": value.get("expires_at"),
            "connected_account_id": value.get("connected_account_id"),
            "provider_version": self.provider_version,
        }

    async def connection_status(self, *, scope: ProviderScope, connected_account_id: str) -> dict[str, Any]:
        if not self.config.ready:
            raise ProviderCallError("composio", "not_configured")
        value = await request_json(
            self._client, "composio", "GET",
            f"{self.config.base_url.rstrip('/')}/api/v3.1/connected_accounts",
            headers=self._headers(),
            params={"connected_account_ids": [connected_account_id],
                    "user_ids": [self.external_user_id(scope)], "limit": 2},
        )
        rows = value.get("items")
        if not isinstance(rows, list):
            raise ProviderCallError("composio", "invalid_response")
        exact = [row for row in rows if isinstance(row, Mapping)
                 and (row.get("id") == connected_account_id or row.get("nanoid") == connected_account_id)]
        if len(exact) != 1:
            raise ProviderCallError("composio", "connection_not_in_scope")
        row = exact[0]
        toolkit = row.get("toolkit") if isinstance(row.get("toolkit"), Mapping) else {}
        return {
            "connected_account_id": connected_account_id,
            "status": str(row.get("status", "UNKNOWN")).lower(),
            "toolkit": toolkit.get("slug"),
            "provider_version": self.provider_version,
        }

    async def execute(self, *, scope: ProviderScope, connected_account_id: str, tool_slug: str,
                      arguments: Mapping[str, Any], version: str, approved: bool) -> dict[str, Any]:
        expected = self.config.read_tools.get(tool_slug)
        risk = "read"
        if expected is None:
            expected = self.config.write_tools.get(tool_slug)
            risk = "write"
        if expected is None:
            raise ProviderCallError("composio", "tool_not_allowed")
        if version != expected:
            raise ProviderCallError("composio", "tool_version_not_allowed")
        if risk == "write" and not approved:
            raise ProviderCallError("composio", "approval_required")
        connection = await self.connection_status(scope=scope, connected_account_id=connected_account_id)
        if connection["status"] != "active":
            raise ProviderCallError("composio", "connection_not_active")
        value = await request_json(
            self._client, "composio", "POST",
            f"{self.config.base_url.rstrip('/')}/api/v3/tools/execute/{quote(tool_slug, safe='')}",
            headers=self._headers(),
            json={"connected_account_id": connected_account_id,
                  "user_id": self.external_user_id(scope), "version": version,
                  "arguments": dict(arguments)},
        )
        return {
            "successful": value.get("successful") is True,
            "data": value.get("data"),
            "error": value.get("error") if value.get("successful") is not True else None,
            "log_id": value.get("log_id"),
            "tool_slug": tool_slug,
            "tool_version": version,
            "risk": risk,
            "provider_version": self.provider_version,
        }

    async def revoke(self, *, scope: ProviderScope, connected_account_id: str) -> dict[str, Any]:
        before = await self.connection_status(scope=scope, connected_account_id=connected_account_id)
        try:
            await request_json(
                self._client, "composio", "POST",
                f"{self.config.base_url.rstrip('/')}/api/v3.1/connected_accounts/"
                f"{quote(connected_account_id, safe='')}/revoke",
                headers=self._headers(), expected=(200, 201, 204),
            )
        except ProviderCallError as exc:
            # Composio returns 409 when an OAuth attempt was abandoned before
            # credentials were granted. There is nothing active to revoke, so
            # allow the local connection record to leave `authorizing`.
            if exc.code != "http_409" or before["status"] == "active":
                raise
            return {"connected_account_id": connected_account_id,
                    "revocation_propagated": True, "provider_version": self.provider_version}
        try:
            current = await self.connection_status(scope=scope, connected_account_id=connected_account_id)
            propagated = current["status"] in {"inactive", "revoked", "disabled"}
        except ProviderCallError as exc:
            if exc.code != "connection_not_in_scope":
                raise
            propagated = True
        return {"connected_account_id": connected_account_id,
                "revocation_propagated": propagated, "provider_version": self.provider_version}
