# Phase 6A capability contracts

Phase 6A establishes deterministic, serializable objects for skills, tools, apps, MCP servers, connection lifecycle, approvals, and the one safe run-time capability projection. The unified shell now exposes read-only Apps, Skills, MCP, and Policy & audit views plus typed slash discovery. It does not create a provider account, call Composio, store secrets, or claim that fixture controls execute remotely.

## Authority and secrets boundary

The future control plane persists immutable manifests, version pins, content/schema digests, scope bindings, policy grants, connection state, cache metadata, approval requests/decisions, and audit fields. The future tool gateway resolves `credential_reference` or `connection-ref.*` server-side only. Browser clients, agents, sandboxes, skill files, discovery results, and resolver output never receive credential values, OAuth tokens, connected-account IDs, or master credentials. Sandboxes receive only a per-run derived gateway capability.

Tool policy is deny-by-default: unknown tools and ungranted resources are denied; any applicable deny wins. Read tools can be allowed; writes, destructive, financial/regulated, and administrative tools need an explicit grant and a live approval where consequential. A decision includes idempotency requirements, resource/effect scope, redaction paths, budget, and concurrency bounds. Approval records are durable, correlated to a run/tool/argument preview, and expire. Revoked/deleted connections and expired capability caches are removed from the next resolver projection immediately.

## Phase 6B APIs and audit data

Phase 6B should implement database rows and gateway endpoints equivalent to: `skill.version.publish`, `skill.install.review`, `skill.install.rollback`, `tool.policy.evaluate`, `approval.request`, `approval.resolve`, `app.connect-link.create`, `app.connect-link.return`, `connection.health`, `connection.revoke`, `mcp.manifest.register`, `mcp.capabilities.refresh`, and `capability.resolve(run_id)`. Each write must include organization/project/agent/user scope, actor ID/type, correlation/causation/run IDs, exact manifest/toolkit/server version, digest, decision/reason, redacted argument preview, timestamps, expiry, and before/after state. Connection rows retain opaque references only.

Composio integration belongs behind the gateway: it maps an internal actor to an external identity, requests a Connect Link using only the pinned action allowlist, records an opaque connected-account reference on return, previews permissions, restricts session tools, checks health, and revokes immediately. Provider SDK results are normalized to these contracts before persistence. MCP transports/auth are allowlisted manifests; capabilities are cached with TTL and digest and a schema change is classified safe, review, or breaking before use.

## Known gaps

There is no capability database migration, gateway, provider client, encrypted secret store, live audit sink, or concurrency lease in Phase 6A. The command menu and browse surfaces are local discovery/read-only views; disconnected, review-required, unavailable, and offline audit states remain visibly non-operational. Phase 6B must add atomic persistence, server-clock expiry checks, authorization backed by canonical tenancy, webhook/revocation reconciliation, signed callback validation, provider error normalization, and end-to-end integration/evasion tests. The in-memory reducers and UI fixtures intentionally cannot substitute for those controls.
