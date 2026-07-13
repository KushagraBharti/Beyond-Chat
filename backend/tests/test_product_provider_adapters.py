from __future__ import annotations

import json

import httpx
import pytest

from src.billing_v2.models import BillingStatus
from src.product_api.provider_factory import create_live_provider_registry
from src.product_api.providers import (
    BillingStatusAdapter, ComposioAdapter, ComposioConfig, ExaAdapter,
    OpenRouterAdapter, OpenRouterConfig, ProviderCallError, ProviderScope,
)


def async_client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


@pytest.mark.asyncio
async def test_openrouter_filters_catalog_and_enforces_request_budgets() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        assert request.headers["authorization"] == "Bearer secret-value"
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json={"data": [
                {"id": "allowed/model", "name": "Allowed",
                 "pricing": {"prompt": "0.000001", "completion": "0.000002"}},
                {"id": "other/model", "name": "Other"},
            ]})
        body = json.loads(request.content)
        assert body["model"] == "allowed/model"
        assert body["max_completion_tokens"] == 200
        return httpx.Response(200, json={"id": "gen-1", "model": "allowed/model",
            "choices": [{"message": {"role": "assistant", "content": "ok"}}],
            "usage": {"total_tokens": 210, "cost": 0.02}})

    config = OpenRouterConfig("secret-value", frozenset({"allowed/model"}), 500, 10)
    adapter = OpenRouterAdapter(config, async_client(handler))
    assert [item["id"] for item in await adapter.models()] == ["allowed/model"]
    result = await adapter.run(model="allowed/model", messages=[{"role": "user", "content": "hello"}],
        max_completion_tokens=200, budget_cents=5)
    assert result["usage"]["cost"] == 0.02
    with pytest.raises(ProviderCallError, match="cost_budget_exceeded"):
        await adapter.run(model="allowed/model", messages=[{"role": "user", "content": "hello"}],
            max_completion_tokens=200, budget_cents=11)
    assert len(requests) == 2


@pytest.mark.asyncio
async def test_exa_uses_current_search_contract_and_normalizes_citations() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/search"
        assert request.headers["x-api-key"] == "exa-secret"
        body = json.loads(request.content)
        assert body == {"query": "policy", "numResults": 2, "type": "auto", "moderation": True,
                        "contents": {"highlights": {"maxCharacters": 2000}}}
        return httpx.Response(200, json={"requestId": "req-1", "results": [
            {"id": "a", "title": "Official", "url": "https://example.com/a",
             "publishedDate": "2026-01-01", "author": "A", "highlights": ["text"]},
            {"id": "bad", "title": "No URL"},
        ], "costDollars": {"total": 0.01}})

    result = await ExaAdapter("exa-secret", client=async_client(handler)).search(query="policy", limit=2)
    assert result["request_id"] == "req-1"
    assert [item["url"] for item in result["results"]] == ["https://example.com/a"]


@pytest.mark.asyncio
async def test_composio_scopes_connect_execute_and_revocation_with_pinned_versions() -> None:
    calls: list[tuple[str, str]] = []
    status = "ACTIVE"

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal status
        calls.append((request.method, request.url.path))
        assert request.headers["x-api-key"] == "composio-secret"
        if request.url.path.endswith("/connected_accounts/link"):
            body = json.loads(request.content)
            assert body["auth_config_id"] == "ac_github"
            assert body["user_id"].startswith("beyond_")
            assert "oauth-state" in body["callback_url"]
            return httpx.Response(201, json={"redirect_url": "https://connect.composio.dev/link",
                "expires_at": "2026-07-12T00:00:00Z", "connected_account_id": "ca_1"})
        if request.url.path.endswith("/connected_accounts"):
            return httpx.Response(200, json={"items": [
                {"id": "ca_1", "status": status, "toolkit": {"slug": "github"}}
            ]})
        if request.url.path.endswith("/tools/execute/GITHUB_LIST_ISSUES"):
            body = json.loads(request.content)
            assert body["version"] == "20260701_00"
            return httpx.Response(200, json={"successful": True, "data": {"issues": []}, "log_id": "log_1"})
        if request.url.path.endswith("/ca_1/revoke"):
            status = "REVOKED"
            return httpx.Response(200, json={"success": True})
        raise AssertionError(request.url)

    config = ComposioConfig("composio-secret", {"github": "ac_github"},
        {"GITHUB_LIST_ISSUES": "20260701_00"}, {"GITHUB_CREATE_ISSUE": "20260701_00"},
        "https://api.example.com/api/v2/product")
    adapter = ComposioAdapter(config, async_client(handler))
    scope = ProviderScope("org-a", "project-a", "profile-a")
    link = await adapter.connect_link(scope=scope, toolkit="github",
        connection_record_id="record-1", state="oauth-state")
    assert link["connected_account_id"] == "ca_1"
    result = await adapter.execute(scope=scope, connected_account_id="ca_1",
        tool_slug="GITHUB_LIST_ISSUES", arguments={}, version="20260701_00", approved=False)
    assert result["successful"] is True
    with pytest.raises(ProviderCallError, match="approval_required"):
        await adapter.execute(scope=scope, connected_account_id="ca_1",
            tool_slug="GITHUB_CREATE_ISSUE", arguments={"title": "x"},
            version="20260701_00", approved=False)
    revoked = await adapter.revoke(scope=scope, connected_account_id="ca_1")
    assert revoked["revocation_propagated"] is True
    assert calls[-1] == ("GET", "/api/v3.1/connected_accounts")


@pytest.mark.asyncio
async def test_composio_cancels_an_abandoned_oauth_attempt() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/connected_accounts"):
            return httpx.Response(200, json={"items": [
                {"id": "ca_pending", "status": "INITIATED", "toolkit": {"slug": "gmail"}}
            ]})
        if request.url.path.endswith("/ca_pending/revoke"):
            return httpx.Response(409, json={"message": "account is not active"})
        raise AssertionError(request.url)

    config = ComposioConfig("composio-secret", {"gmail": "ac_gmail"},
        {"GMAIL_FETCH_EMAILS": "20260701_00"}, {},
        "https://api.example.com/api/v2/product")
    adapter = ComposioAdapter(config, async_client(handler))
    result = await adapter.revoke(
        scope=ProviderScope("org-a", "project-a", "profile-a"),
        connected_account_id="ca_pending",
    )
    assert result["revocation_propagated"] is True


class BillingRepositoryStub:
    async def get_status(self, organization_id: str) -> BillingStatus:
        return BillingStatus(organization_id, "active", "enabled", 3, 3, True, True, True)


@pytest.mark.asyncio
async def test_billing_maps_only_server_verified_repository_state() -> None:
    ready = await BillingStatusAdapter(BillingRepositoryStub(), enabled=True).status("org-a")  # type: ignore[arg-type]
    assert ready["externally_verified"] is True
    assert ready["entitlement_state"] == "enabled"
    disabled = await BillingStatusAdapter(BillingRepositoryStub(), enabled=False).status("org-a")  # type: ignore[arg-type]
    assert disabled["externally_verified"] is False
    assert disabled["entitlement_state"] == "disabled"


def test_factory_is_deny_by_default_without_full_policy_configuration(monkeypatch) -> None:
    for name in (
        "OPENROUTER_API_KEY", "OPENROUTER_MODEL_ALLOWLIST", "OPENROUTER_MAX_COMPLETION_TOKENS",
        "OPENROUTER_MAX_REQUEST_COST_CENTS", "EXASEARCH_API_KEY", "COMPOSIO_API_KEY",
        "COMPOSIO_AUTH_CONFIG_ALLOWLIST_JSON", "COMPOSIO_READ_TOOL_VERSIONS_JSON",
        "COMPOSIO_WRITE_TOOL_VERSIONS_JSON", "COMPOSIO_CALLBACK_URL", "BILLING_V2_ENABLED",
    ):
        monkeypatch.delenv(name, raising=False)
    registry = create_live_provider_registry()
    assert registry.status("models", organization_id="org-a")["state"] == "unavailable"
    assert registry.status("connections", organization_id="org-a")["state"] == "unavailable"
    assert registry.status("billing", organization_id="org-a")["externally_verified"] is False


def test_factory_composes_only_fully_configured_live_providers(monkeypatch) -> None:
    values = {
        "APP_URL": "https://beyond-chat-production.vercel.app",
        "OPENROUTER_API_KEY": "openrouter-secret",
        "OPENROUTER_MODEL_ALLOWLIST": "openai/gpt-5.4-nano",
        "OPENROUTER_MAX_COMPLETION_TOKENS": "2048",
        "OPENROUTER_MAX_REQUEST_COST_CENTS": "25",
        "OPENROUTER_TIMEOUT_SECONDS": "40",
        "EXASEARCH_API_KEY": "exa-secret",
        "EXASEARCH_TIMEOUT_SECONDS": "20",
        "COMPOSIO_API_KEY": "composio-secret",
        "COMPOSIO_AUTH_CONFIG_ALLOWLIST_JSON": '{"github":"ac_1"}',
        "COMPOSIO_READ_TOOL_VERSIONS_JSON": '{"GITHUB_LIST_ISSUES":"20260701_00"}',
        "COMPOSIO_WRITE_TOOL_VERSIONS_JSON": "{}",
        "COMPOSIO_CALLBACK_URL": "https://beyond-chat-production.vercel.app/api/v2/product",
        "COMPOSIO_TIMEOUT_SECONDS": "25",
        "BILLING_V2_ENABLED": "true",
    }
    for name, value in values.items():
        monkeypatch.setenv(name, value)

    registry = create_live_provider_registry(billing_repository=BillingRepositoryStub())  # type: ignore[arg-type]
    assert registry.status("models", organization_id="org-a")["state"] == "ready"
    assert registry.status("retrieval", organization_id="org-a")["state"] == "ready"
    assert registry.status("connections", organization_id="org-a")["state"] == "ready"
    assert registry.status("billing", organization_id="org-a")["state"] == "ready"
    assert registry.openrouter and registry.openrouter.config.http_referer == values["APP_URL"]
    assert registry.exa and registry.exa.timeout_seconds == 20
    assert registry.composio and registry.composio.config.timeout_seconds == 25
