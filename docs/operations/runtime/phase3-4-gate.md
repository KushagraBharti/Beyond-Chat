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

See `docs/operations/runtime/phase4b-evidence.md` for v4 immutable IDs, security remediation, remote smoke, mutation history, and exact remaining blockers.
