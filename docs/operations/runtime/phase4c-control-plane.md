# Phase 4C live control-plane integration

Captured 2026-07-11. This is migration and application integration evidence, not production rollout authorization.

## Admitted contract

- `20260711234500_runtime_control_plane.sql` adds commands, runs, attempts, events, leases, approvals, outputs, actual costs, and the dispatch signal table.
- Authenticated clients have organization/project-scoped read-only RLS. Queue, lease, attempt, and every authoritative mutation remain service-role only.
- Admission, `SKIP LOCKED` claim, event append, output+event commit, cost finalization, cancellation, approval resolution, and expired-lease reconciliation are short atomic RPCs with execution revoked from `anon` and `authenticated`.
- Runtime output objects use the existing canonical Storage contract: `{organization_id}/{project_id}/runs/{run_id}/{sha256}/{filename}`. The service key stays in the app server and never enters Modal.

## API and execution gate

The WorkOS principal dependency is mounted at `/api/runtime`. Cookie-authenticated mutations also require the existing CSRF dependency. Client-authored durable events are not exposed. The coordinator is wired to the existing OpenRouter, Exa, provider-status, Supabase persistence, and Storage ports only when `BEYOND_RUNTIME_CONTROL_PLANE_ENABLED=true`; the default is disabled and returns `503`.

No migration was applied remotely, no Modal resource or routing flag was mutated, and traffic remains zero. The manager must review/apply the migration, then start a separately supervised worker and run linked-project failure injection before considering a canary.

## Parity and failure evidence

`fixtures/runtime/phase4c_parity.json` defines General document, Research cited brief, and Finance evidence-backed memo fixtures while pinning traffic to zero. Backend tests cover duplicate API admission, API restart/replay, worker lease loss, cross-tenant guessing, and cancellation. SQL tests cover service-only RPCs/leases, duplicate admission, `SKIP LOCKED`, and cross-tenant RLS.

## Remaining blockers

1. Manager review and remote application of the migration plus local/remote schema equivalence.
2. A long-lived trusted worker deployment; Vercel request handlers are not treated as the worker.
3. Real model/tool gateway identities and connection ownership tables/policies; connection-backed tools currently deny by default.
4. Linked-project restart, worker-loss, 429/500, timeout, partial-upload, approval-wait, cancellation-propagation, and expired-snapshot injection.
5. Real General/Research/Finance outputs and threshold review, followed by separately authorized canary/rollback observation. Production routing and legacy-runner decommission remain unauthorized.
