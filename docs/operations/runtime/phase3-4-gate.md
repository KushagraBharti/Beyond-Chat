# Phase 3–4 Gate Evidence

Captured on 2026-07-11 and refreshed on 2026-07-12 from the shared checkout. This record separates executable local/provider evidence from the production gates that remain open. It does not claim that Phase 3 or Phase 4 is complete.

## Gate matrix

| Gate | Evidence | Status |
|---|---|---|
| Canonical command/event ordering, cursor replay, and idempotency | `runtime-contracts` typecheck and 5 tests | Pass |
| Nonblocking start, live SSE, reconnect replay, restart recovery, cancellation, checkpoint/resume, retry, and corruption failure | `local-app-server` typecheck and 12 tests | Pass for the local executable control-plane slice |
| Approval suspends durably, releases runtime resources, and resumes once | immediate-resolution regression test; old execution exits as suspended even if approval changes the projected state before teardown | Pass for the local executable control-plane slice |
| Clean local shutdown | SSE and lease heartbeat timers are non-owning; HTTP tests actively drain server connections; suite exits in about one second | Pass |
| Production multi-worker durability, queueing, leases, usage limits, and reconciliation | local migration adds service-only atomic cancellation completion, reserve/adjust/release usage, and bounded retry/failure RPCs; provider-neutral coordinator tests cover claims and expiry | Partial; migration is local-only and has not been replayed or failure-injected against the linked project |
| Browser/API/worker-loss and duplicate-command gate | reconnect, process restart, cancellation-intent restart, and duplicate execution are covered locally | Partial; production failure injection remains open |
| Modal app, runtime images, sidecar, filesystem checkpoint, logical restore, and cleanup | Phase 4 fixtures and remote smoke for release `2026-07-11.4` | Pass for the provider plane |
| Modal adapter immutable image selection and working-set restore | `modal-sandbox-provider` typecheck and 8 tests; manifests and objects are hash/size checked and paths are policy checked | Pass |
| Immutable remote resource identity | read-only recapture matched app `ap-FbZZRj50uSQRtGe2nwvlYH`, four image IDs, and three Volume IDs to `infra/modal/rollout.json`; zero running Phase 4 sandboxes | Pass |
| No memory-snapshot dependency or master secret in sandbox | remote smoke and checkpoint metadata | Pass |
| Exact-image security promotion gate | exact v4 scan reports 0 critical, 0 high, and 0 unclassified; 66 prior blocking/manual findings have evidence-backed dispositions | Pass |
| Product coordinator, run identity, real gateway, policy rechecks, and authoritative output storage | run identities are now fail-closed on exact gateway audience and explicit operation capability before the live policy/connection recheck; immutable output upload and actual-cost finalization are locally tested | Partial; trusted issuance and real gateway execution remain unwired |
| Legacy Finance parity, canary, rollback observation, and decommission | not executed; legacy runner retained | Blocked |
| Production routing | `infra/modal/rollout.json`: disabled, `traffic_percent: 0`, authorization false | Intentionally blocked |

## Focused validation

- Phase 3 runtime persistence: 11 focused backend tests passed; full backend suite passed 102 tests with 2 third-party deprecation warnings; Python runtime compilation and `git diff --check` passed.
- Canonical PostgreSQL 17.10 replay: all 8 migrations applied twice; 2 security passes and 2 service-table policy passes succeeded; 27/27 public tables had RLS. The Phase 3 migration depends on `20260711234500_runtime_control_plane.sql` for runtime tables/RPCs and follows `20260712004658_cover_product_record_scope_foreign_keys.sql` at canonical head.
- `packages/runtime-contracts`: typecheck; 5 tests passed.
- `packages/sandbox-provider`: typecheck; 4 tests passed; production audit found 0 vulnerabilities.
- `services/local-app-server`: typecheck; 12 tests passed.
- `packages/modal-sandbox-provider`: typecheck; 8 tests passed; production audit found 0 vulnerabilities.
- `services/modal-runtime`: 8 tests passed.
- `services/modal-control-plane`: 15 tests passed.
- Modal provider-state read: ready; exact app/image/Volume IDs matched; zero running Phase 4 sandboxes.
- Linked Supabase read: project ref `vffndfwdykxqjlnntuuk`; runtime table and cancellation/reconciliation RPCs present. No database mutation was made.
- Modal provider-state recapture at `2026-07-12T00:47:42.059076+00:00`: ready, exact v4 app/image/Volume IDs matched, zero running Phase 4 sandboxes, and current provider-day billed total reported as `$0`. No Modal mutation was made.

The recapture uses the release in `infra/modal/rollout.json` and resolves `fixtures/phase4/releases/<release>/modal-images.json`. `scripts/modal/Test-ModalProvider.ps1` now fails closed when the release is malformed or its immutable image manifest is absent; it no longer reads the stale top-level v2 manifest.

## Exact blockers

1. Review and replay `20260712013000_phase3_runtime_atomic_persistence.sql` after its prerequisite runtime-control-plane and canonical scope-FK migrations. Then prove cancellation completion, usage reserve/adjust/release, bounded retry/failure, event ordering, and migration replay against canonical local Postgres and the linked project. The migration remains unapplied remotely.
2. Mount the runtime router/integration entrypoint in the manager-owned API and connect a trusted worker plus real model/tool gateways. The local contract is not evidence of live production durability.
3. After manager review, apply the migration remotely with a verified backup/rollback point and service-role configuration; then run API/worker/provider failure injection through that path, including 429/500, timeout, partial upload, expired snapshot, cancellation propagation, approval suspension, and usage reserve/adjust/release assertions. No remote migration was applied during this audit.
4. Complete real General/Research/Finance gateway parity, controlled canary, immediate rollback proof, and the observation window before separately authorizing any legacy-runner decommission or nonzero traffic.

## Phase 3 fencing prerequisite (2026-07-12)

Migration `20260712013200_runtime_fencing_checkpoints_and_budget_windows.sql` is the ordered successor to `20260712013100`. The mandatory `supabase migration new runtime_fencing_checkpoints_and_budget_windows` attempt was made first with CLI 2.109.0; OneDrive returned `LegacyMigrationNewWriteError` / `AlreadyExists` for `supabase/migrations`. The repository owner then explicitly authorized the fixed `013200` filename. It remains local-only and requires the preceding runtime-control-plane, atomic-persistence, and client-deny migrations.

The contract added by this prerequisite is:

- admission remains the sole owner of dispatch insertion, so idempotent API retries do not issue a second queue notification;
- `append_runtime_event_fenced` allocates the next sequence under the run lock and deduplicates by `(run_id, idempotency_key)` while binding the mutation to the active run, attempt, lease, worker, and unexpired lease;
- lease heartbeat and release are service-only fenced RPCs rather than direct table updates;
- durable checkpoints bind logical state, working-set manifest, image digest, byte integrity, event cursor, run, attempt, and lease;
- `suspend_runtime_for_approval` atomically saves a checkpoint, creates the approval/event, closes the attempt, releases the lease and active attempt reservations, and moves the run to `awaiting_approval`;
- `complete_runtime_success` atomically records the output and actual costs, releases the named reservation, closes the attempt and lease, emits completion, and terminalizes the run;
- budget enforcement has explicit organization account/window rows, and `reserve_runtime_usage_window` counts actual costs only inside that window plus its active holds rather than the lifetime ledger.

All new tables and mutation functions are service-role only with RLS enabled. Stale workers receive a serialization failure and cannot mutate a later attempt. Existing unfenced RPCs remain for compatibility but are not acceptable worker mutation paths; worker/gateway wiring must move to the new methods before traffic can be authorized.

Canonical validation now discovers every `supabase/tests/runtime/*.sql` file in deterministic filename order. Both the Phase 4C control-plane suite and the fencing suite run twice after the current-head migrations and once again after full-chain idempotency replay. PostgreSQL 17.10 validation passes all three runtime passes, both Phase 2 security passes, both advisor-policy passes, and two complete migration replays with 31/31 public tables under RLS.

See `docs/operations/runtime/phase4b-evidence.md` for v4 immutable IDs, security remediation, remote smoke, mutation history, and exact remaining blockers.
