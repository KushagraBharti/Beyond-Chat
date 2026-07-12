from __future__ import annotations

import json
import os
from typing import Mapping

from .providers import ComposioAdapter, ComposioConfig, ExaAdapter, LiveProviderRegistry, OpenRouterAdapter, OpenRouterConfig
from .providers.billing import BillingStatusAdapter
from ..billing_v2.ports import BillingRepository


def _csv(name: str) -> frozenset[str]:
    return frozenset(value.strip() for value in os.getenv(name, "").split(",") if value.strip())


def _version_map(name: str) -> Mapping[str, str]:
    raw = os.getenv(name, "")
    if not raw:
        return {}
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return {str(key): str(version) for key, version in value.items()
            if isinstance(key, str) and isinstance(version, str) and key and version}


def _positive_float(name: str, default: float) -> float:
    try:
        value = float(os.getenv(name, str(default)))
    except ValueError:
        return 0.0
    return value if 0 < value <= 120 else 0.0


def create_live_provider_registry(*, billing_repository: BillingRepository | None = None) -> LiveProviderRegistry:
    """Compose only adapters whose full fail-closed configuration is present."""
    openrouter: OpenRouterAdapter | None = None
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
    allowed_models = _csv("OPENROUTER_MODEL_ALLOWLIST")
    try:
        model_tokens = int(os.getenv("OPENROUTER_MAX_COMPLETION_TOKENS", "0"))
        model_budget = int(os.getenv("OPENROUTER_MAX_REQUEST_COST_CENTS", "0"))
        model_timeout = _positive_float("OPENROUTER_TIMEOUT_SECONDS", 45.0)
    except ValueError:
        model_tokens = model_budget = 0
        model_timeout = 0.0
    config = OpenRouterConfig(openrouter_key, allowed_models, model_tokens, model_budget,
                              model_timeout, http_referer=os.getenv("APP_URL"))
    if config.ready:
        openrouter = OpenRouterAdapter(config)

    exa_key = os.getenv("EXASEARCH_API_KEY", "")
    exa_timeout = _positive_float("EXASEARCH_TIMEOUT_SECONDS", 30.0)
    exa = ExaAdapter(exa_key, timeout_seconds=exa_timeout) if exa_key and exa_timeout else None

    composio: ComposioAdapter | None = None
    composio_config = ComposioConfig(
        api_key=os.getenv("COMPOSIO_API_KEY", ""),
        auth_configs=_version_map("COMPOSIO_AUTH_CONFIG_ALLOWLIST_JSON"),
        read_tools=_version_map("COMPOSIO_READ_TOOL_VERSIONS_JSON"),
        write_tools=_version_map("COMPOSIO_WRITE_TOOL_VERSIONS_JSON"),
        callback_base_url=os.getenv("COMPOSIO_CALLBACK_URL", ""),
        timeout_seconds=_positive_float("COMPOSIO_TIMEOUT_SECONDS", 30.0),
    )
    if composio_config.ready:
        composio = ComposioAdapter(composio_config)

    billing = BillingStatusAdapter(billing_repository, enabled=True) if (
        billing_repository is not None and os.getenv("BILLING_V2_ENABLED", "false").lower() == "true"
    ) else None
    return LiveProviderRegistry(openrouter=openrouter, exa=exa, composio=composio, billing=billing)
