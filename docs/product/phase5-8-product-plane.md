# Phase 5–8 Product Plane — Contracts, Implementation, and Open Gates

Snapshot date: 2026-07-12. Workstream: Product & Organization (Claude).
Scope: real workspace shell (Phase 5) and capability discovery / knowledge /
memory product surfaces (Phase 6–8). This document states exactly what is
implemented, what remains runtime-only, and what stays provider-unverified.
It is not a completion claim for any phase gate.

## 1. Canonical contracts

Backend (`/api/v2/product`, WorkOS principal + CSRF guarded):

| Contract | Route | Notes |
|---|---|---|
| Project summary/detail | `GET/POST /projects`, `GET /projects/{id}` | New. Backed by canonical `projects` + `project_memberships` tables via `product_persistence/projects.py`. Organization always from the verified principal; visibility mirrors RLS (owner/admin/builder see all; members see organization-visibility + own/member projects). Viewer cannot create. |
| Organization recent surfaces | `GET /organization/recent/{outputs,approvals,automations,agents}` | New. `ProductRepository.list_recent` (added to contract + all adapters) lists one kind org-wide, newest first, bounded ≤100. Organization boundary strict; unknown surface → 404. |
| Workspace capability report | `GET /workspace/capabilities` | New. Server-computed truthfulness: `runtime_execution` from the runtime flag, provider readiness from the provider registry (`externally_verified` required). The UI renders availability only from this. |
| Memory proposals list | `GET /projects/{id}/memory/proposals` | New; completes the proposal queue loop (create/resolve existed). |
| Everything else | pre-existing product routes | Catalog, skills/tools/apps/mcp, knowledge connections/sources/sync/retrieval/citations, memory CRUD/export, agents drafts/publish/deploy, outputs/comments/reviews, automations. |

Frontend contracts: `frontend/src/features/workspace/api.ts`
(`ProjectSummary`, `ProductRecordSummary` with explicit `scope`,
`WorkspaceCapabilities`, `SectionState`). `features/memory/apiClient.ts` maps
records to the existing `MemoryEntryView`/`MemoryProposalView` UI model and
carries record versions for `If-Match` optimistic concurrency.

## 2. Scope hierarchy and shell behavior

- Organization comes only from the server session (`/api/auth/session`).
- Project selection (`features/workspace/ProjectContext.tsx`) is remembered
  per organization and re-validated against the server list on every load;
  stale/foreign selections fail closed to "no project". Organization switch
  changes the storage key and reload key, invalidating every org-scoped cache.
- `useSection` (features/workspace/hooks.ts) is generation-guarded: a stale
  response from a previous org/project can never overwrite a newer one, and a
  failed section degrades alone (proven in `HomeWorkspacePage.test.tsx`).
- Direct URLs to inaccessible projects render an existence-safe "not
  available" page (`ProjectDetailPage`).

## 3. Fixture-removal matrix (Phase 5 truthfulness)

| Fixture | Was | Now |
|---|---|---|
| `workFixtures` ("Market entry brief", "Q3 scenario model", …) | Home, Work list, Work detail | Deleted. Home sections fetch real org data; Work list/detail state truthfully that durable runs are not enabled. |
| Static "Notion is a disconnected fixture" notice | Home | Removed; Knowledge & Apps shows real catalog/connection state only. |
| `capabilityFixtures` / `knowledgeSourceFixtures` / `policyAuditFixtures` | Knowledge & Apps tabs | Deleted. Apps/Skills/MCP tabs render `GET /catalog` records; Sources renders the current project's real `knowledge/sources`; Readiness renders `workspace/capabilities`. |
| `scopedDiscovery` fixture palette items | Composer discovery | Deleted. Palette = canonical built-ins + real projects + real catalog records (`features/discovery/scopedDiscovery.ts`). |
| Fixture output tabs in Work detail, `WorkRow`, `OutputCanvas` | Work surfaces | Deleted. |
| Built-in agent cards | implied availability | Now annotated from server capability report ("runtime not enabled" until true). |
| Output preview fixture (`OutputWorkspacePage`), Demo agent-builder/automation adapters | Outputs/Builder/Automations pages | **Still present and clearly labeled** — these surfaces depend on runtime/output persistence owned by the runtime workstream; they claim no success. |

## 4. Discovery grammar (Phase 6A)

- One `/` palette in the composer (existing keyboard/listbox a11y retained:
  arrows, Home/End, Enter/Tab select, Escape, `aria-activedescendant`).
- Typed prefixes narrow by kind; `@name` resolves agent mentions; selection
  inserts a typed reference chip storing the stable ID, never raw text.
- Ranking: exact alias < prefix < substring < multi-term (product-catalog
  `queryDiscovery`).
- Scoped items come from real data only; mapping rules
  (`scopedDiscovery.ts`, tested): catalog states map truthfully
  (`active/published→ready`, `revoked/disconnected→disconnected` with reason,
  anything else → unavailable with reason); malformed aliases are rejected;
  duplicate aliases fail closed (first claimant wins); payload configuration
  and secret-shaped fields are never projected into results.
- Direct invocation/execution is NOT implemented here — discovery and typed
  selection only. Browse commands (`/skills`, `/apps`, `/mcp`) open the real
  catalog views.

## 5. Skills / tools / apps / MCP surface (Phase 6B–C)

- One catalog (`GET /catalog`) with distinct kinds preserved; UI shows kind,
  scope, version, state per record. Empty catalogs say so.
- Install/enable/connect controls are NOT rendered because no backend
  install/connect flow is wired for skills, and Composio connection creation
  is project-scoped API-only today. No control claims functionality the
  backend lacks.
- Connections never expose credentials: discovery/catalog project only
  id/name/state/version.

## 6. Knowledge plane (Phase 7 product surface)

- Sources view is project-scoped and real (`/projects/{id}/knowledge/sources`),
  with explicit no-project, loading, error, forbidden, and truthful-empty
  states ("Retrieval stays deny-by-default until a scoped connection exists").
- No connector is claimed connected anywhere; readiness comes only from the
  server capability report. Retrieval, sync, and citation routes exist but are
  provider-gated (`503 provider_unavailable` until externally verified).
- Semantic/vector retrieval is not claimed; the reference knowledge-plane
  package remains lexical-only until embeddings exist (unchanged).

## 7. Memory plane (Phase 8 product surface)

- Project memory is durable and live: list, propose, accept/reject (with
  `If-Match` record versions), delete (state transition to `deleted`), and
  export (real JSON download) against `product_records`.
- User and team memory spaces are truthfully unavailable ("not simulated").
- Editing memory content and per-space recall controls are truthfully
  unsupported: the canonical `ResourcePatch` schema cannot patch `content`.
  Central request: extend the memory PATCH contract (or add a
  `MemoryPatch` schema) if in-place editing is wanted.
- No runtime prompt-injection/recall path is implemented here; this is
  management/discovery only.

## 8. What Codex must wire or decide centrally

1. `ProductApiDependencies.projects` defaults from `configured_project_directory()`
   (Supabase service) — zero `main.py` change needed; review the default.
2. Memory content editing contract (see §7) if desired.
3. Durable runs: Home/Work "active work" intentionally renders from
   `runtime_execution` only; when the runtime lands, replace the placeholder
   section with the real run list (single integration point:
   `HomeWorkspacePage` "Active work" panel + `WorkListPage`).
4. Outputs page still renders its clearly-labeled preview fixture until the
   canonical outputs viewer consumes `GET /projects/{id}/outputs` content
   payloads (blocked on output content/version storage semantics owned by the
   runtime/output workstream).
5. Composio connect/disconnect UI is intentionally absent pending the
   connection-ownership control plane.

## 9. Open production gates (explicitly not claimed)

- No live provider verification of models/retrieval/actions/billing.
- No durable run execution, streaming, or recovery in any UI.
- No real connector sync; knowledge sources appear only if records exist.
- Agent publishing UI (builder) remains demo-adapter-backed; the API path
  (drafts → publish → deploy) is exercised by backend contract tests only.
- Two-organization isolation is proven at the API/contract layer
  (`test_workspace_product_api.py`, `ProjectContext.test.tsx`); live two-org
  browser proof remains a Phase 2 production gate.

## 10. Phase 11 — Automations (added 2026-07-12)

Implemented on the canonical product plane (`product_api/automation_service.py`
+ router routes; proofs in `backend/tests/test_automation_lifecycle.py`,
7 tests):

- **Versions:** `POST /projects/{p}/automations/{a}/versions` publishes an
  immutable pinned config (SHA-256 digest, service principal); triggers refuse
  to run without a published version; executions record the pinned version.
- **Idempotent triggers — the duplicate-side-effect proof:** every path
  (manual, signed webhook, Composio ingestion, scheduler window, retry)
  derives a deterministic trigger key used as the persistence idempotency key,
  so duplicate deliveries and concurrent scheduler ticks collapse onto one
  execution at the database layer (`product_idempotency_keys`).
- **Signed webhook triggers:** `POST /webhooks/automations/{org}/{automation}`
  with Stripe-style `t=,v1=` HMAC; per-automation secret derived from
  `AUTOMATION_WEBHOOK_SIGNING_KEY` (builder-visible via
  `GET .../webhook-secret`); replay window enforced; forged signatures cause
  zero records.
- **Composio trigger ingestion:** same contract at
  `/webhooks/composio-triggers/{org}/{automation}` gated on
  `COMPOSIO_TRIGGER_SECRET` (503 until configured; live provider delivery is
  a provider action, not claimed).
- **Scheduler:** `POST /automations/scheduler/tick` (constant-time-compared
  `X-Scheduler-Secret`), window-indexed enqueue over active schedule
  automations (≥5-minute intervals). Production invocation = a cron hitting
  this endpoint — a deployment action for Codex (Vercel cron or Modal
  scheduled function), documented as the one remaining wiring step.
- **Overlap policy:** `configuration.overlap` skip (default) / allow; retries
  and dead-letter records bypass overlap because they extend an existing
  trigger chain.
- **Retry / dead-letter:** append-only attempts; beyond
  `configuration.max_attempts` (default 3) a `dead_letter` record is
  appended; only `failed` executions are retryable.
- **Service principal + owner offboarding:** service-path executions are
  attributed to the automation owner; if that owner's membership is no longer
  active, triggers pause the automation with `paused_reason=owner_offboarded`
  instead of running work for a departed human.
- **Run history / failure inbox:** `GET .../executions` per automation and
  org-level `GET /organization/automation-failures` (failed + dead_letter).
- **Frontend:** `/automations` now runs on `LiveAutomationAdapter`
  (project-scoped, If-Match state changes, real test runs with destinations
  suppressed, retry, approval resolution via capability approvals); the demo
  adapter is gone from the production path. Integration readiness is reported
  truthfully (scheduler/Composio `not_connected`, runtime from the server
  capability report).

Still runtime-owned (not claimed): execution (queued → running →
succeeded/failed transitions), destination delivery, approval-paused runs,
and notification delivery. Central wiring for Codex: the scheduler cron,
`AUTOMATION_WEBHOOK_SIGNING_KEY` / `AUTOMATION_SCHEDULER_SECRET` /
`COMPOSIO_TRIGGER_SECRET` env provisioning, and marking execution outcomes
from the worker.
