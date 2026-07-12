# Phase 5–7 integration evidence

This document records the coherent offline integration boundary. It is not evidence that the Phase 3 durable command service, provider credentials, live connectors, or external app actions are deployed.

| Phase | Integrated evidence | Current gate status |
| --- | --- | --- |
| 5 — Unified shell and built-ins | Canonical workspace navigation; explicit compatibility routes for every legacy studio; Chat-to-Work local draft handoff; typed slash/mention discovery with stable reference chips; immutable General, Research, and Finance manifests; task/output fixture model; loading, empty, disconnected, permission-denied, and unknown-task states. | **Contract and offline UI pass.** Live durable run APIs and Pi/Dexter parity remain external dependencies. |
| 6 — Skills, tools, apps, and MCP | Versioned registries; deny-by-default tool policy; run/tool/argument/idempotency-bound approvals; agent-capability intersection; connection tenant/project ownership checks; ambiguous-source denial; approval expiry and budget checks; credential-free Connect Link contract; app/MCP revocation; schema-cache expiry/breaking-change behavior; read-only discovery views that distinguish ready, disconnected, review-required, and unavailable states. | **Contract, policy, and offline UI pass.** Provider calls, encrypted credential storage, persistence, canonical argument hashing, gateway execution, and live audit remain external dependencies. |
| 7 — Knowledge plane | Common connector contracts and offline fakes; pre-score ACL filtering; tenant/source isolation; exact immutable-revision citations; cursor replay/idempotency; ACL replacement; tombstones and reconciliation; injection classification; freshness targets; health/access/citation previews. | **Contract, negative tests, and offline UI pass.** Authenticated transports, durable jobs, database/RLS, embeddings, and source-backed freshness measurements remain external dependencies. |

## Accessibility and truthful-state evidence

- The shell has a skip link, semantic navigation/main landmarks, a mobile menu button with expanded/control state, Escape handling, and focus return.
- Slash discovery uses the textbox/listbox `aria-activedescendant` pattern, arrow/Home/End navigation, disabled-result semantics, stable typed chips, and focus restoration.
- Output and Knowledge & Apps tabs use roving `tabIndex`, arrow/Home/End navigation, selected state, and linked tab panels.
- Repeated disabled controls have unique description IDs. New and unknown task URLs never substitute unrelated fixture outputs.
- Fixtures label local, offline, disconnected, unavailable, review-required, and permission-denied states and never claim a run, connector, approval, or provider action succeeded.

## Repeatable validation

Run with npm only:

```powershell
cd packages/product-catalog; npm test; npm run typecheck
cd ../skill-registry; npm test; npm run typecheck
cd ../tool-policy; npm test; npm run typecheck
cd ../app-registry; npm test; npm run typecheck
cd ../mcp-registry; npm test; npm run typecheck
cd ../knowledge-plane; npm test; npm run typecheck
cd ../../frontend; npm test; npm run lint; npm run build
```
