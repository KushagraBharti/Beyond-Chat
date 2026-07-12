# Product API live provider adapters

The adapters under `src/product_api/providers` are the fail-closed provider boundary for the Phase 5–12 aggregate API. They use direct HTTP so credentials remain backend-only and tests can exercise exact wire contracts with `httpx.MockTransport`. No adapter logs headers, tokens, OAuth material, prompts, tool arguments, or provider responses.

## Admission rules

- OpenRouter is constructed only when `OPENROUTER_API_KEY`, a non-empty `OPENROUTER_MODEL_ALLOWLIST`, positive `OPENROUTER_MAX_COMPLETION_TOKENS`, and positive `OPENROUTER_MAX_REQUEST_COST_CENTS` exist. Calls are limited to the allowlist, reject requests over either local budget, estimate the model-catalog maximum before dispatch, send an upstream provider price ceiling, and use a bounded timeout.
- Exa is constructed only with `EXASEARCH_API_KEY` and a valid `EXASEARCH_TIMEOUT_SECONDS` in `(0, 120]`. Retrieval uses `POST https://api.exa.ai/search`, requests moderated highlights, and returns normalized citation fields rather than raw provider envelopes. Requests carrying internal `source_ids` fail closed because Exa web search is not the ACL-aware knowledge-plane adapter.
- Composio is constructed only with `COMPOSIO_API_KEY`, an HTTPS `COMPOSIO_CALLBACK_URL` rooted at `/api/v2/product`, at least one allowed auth config, and at least one pinned tool. The JSON maps are `COMPOSIO_AUTH_CONFIG_ALLOWLIST_JSON` (`toolkit -> auth_config_id`), `COMPOSIO_READ_TOOL_VERSIONS_JSON` (`tool_slug -> exact version`), and `COMPOSIO_WRITE_TOOL_VERSIONS_JSON` (`tool_slug -> exact version`). External user IDs are deterministic hashes of organization, project, and internal profile IDs—never email. Writes require a matching approved capability record. Disconnect reports success only after provider revocation is observed.
- Billing maps only an injected `billing_v2.BillingRepository.get_status()` result. It never calls Stripe from the status endpoint and never derives access from request/query parameters. Missing, disabled, or unverified state maps to `entitlement_state=disabled`.

The application composition root injects `create_live_provider_registry(...)` into `ProductApiDependencies`. Missing or invalid policy configuration omits only that adapter and preserves `503 provider_unavailable` behavior. Billing remains unavailable until the composition root can inject a durable `BillingRepository`; unverified state always maps to disabled.

## Current provider contracts

- [OpenRouter models](https://openrouter.ai/docs/api/api-reference/models/get-models), [chat completions](https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request), and [provider price ceilings](https://openrouter.ai/docs/guides/routing/provider-selection)
- [Exa Search](https://exa.ai/docs/reference/search)
- [Composio Connect Links and account lifecycle](https://docs.composio.dev/reference/api-reference/connected-accounts) and [pinned tool execution](https://docs.composio.dev/reference/v3/api-reference/tools)
- Stripe-derived state enters only through the existing signature-verified `billing_v2` webhook/repository boundary.

## Remaining activation gaps

Composio auth configs and exact promoted tool versions must still be selected, OAuth callback URLs registered, and provider revocation behavior verified against the intended project. The billing composition root needs a durable `BillingRepository`; the current billing foundation exposes a port but no admitted production repository in this slice. No provider dashboard or live external mutation was performed.
