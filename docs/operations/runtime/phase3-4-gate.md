# Phase 3–4 Gate Evidence

Captured on 2026-07-11 from the shared checkout. This record separates executable local/provider evidence from the production gates that remain open. It does not claim that Phase 3 or Phase 4 is complete.

## Gate matrix

| Gate | Evidence | Status |
|---|---|---|
| Canonical command/event ordering, cursor replay, and idempotency | `runtime-contracts` typecheck and 5 tests | Pass |
| Nonblocking start, live SSE, reconnect replay, restart recovery, cancellation, checkpoint/resume, retry, and corruption failure | `local-app-server` typecheck and 12 tests | Pass for the local executable control-plane slice |
| Approval suspends durably, releases runtime resources, and resumes once | immediate-resolution regression test; old execution exits as suspended even if approval changes the projected state before teardown | Pass for the local executable control-plane slice |
| Clean local shutdown | SSE and lease heartbeat timers are non-owning; HTTP tests actively drain server connections; suite exits in about one second | Pass |
| Production multi-worker durability, queueing, leases, usage limits, and reconciliation | provider-neutral coordinator ports, deterministic multi-worker/org-limit/recovery tests, and a concrete Supabase/Postgres RPC adapter contract exist in `backend/src/runtime`; canonical schema/RPC deployment remains open | Partial |
| Browser/API/worker-loss and duplicate-command gate | reconnect, process restart, cancellation-intent restart, and duplicate execution are covered locally | Partial; production failure injection remains open |
| Modal app, runtime images, sidecar, filesystem checkpoint, logical restore, and cleanup | Phase 4 fixtures and remote smoke for release `2026-07-11.4` | Pass for the provider plane |
| Modal adapter immutable image selection and working-set restore | `modal-sandbox-provider` typecheck and 8 tests; manifests and objects are hash/size checked and paths are policy checked | Pass |
| Immutable remote resource identity | read-only recapture matched app `ap-FbZZRj50uSQRtGe2nwvlYH`, four image IDs, and three Volume IDs to `infra/modal/rollout.json`; zero running Phase 4 sandboxes | Pass |
| No memory-snapshot dependency or master secret in sandbox | remote smoke and checkpoint metadata | Pass |
| Exact-image security promotion gate | exact v4 scan reports 0 critical, 0 high, and 0 unclassified; 66 prior blocking/manual findings have evidence-backed dispositions | Pass |
| Product coordinator, run identity, real gateway, policy rechecks, and authoritative output storage | integration contracts, bound Modal run identity, current-policy/connection rechecks, immutable output upload, and actual-cost finalization are implemented and locally tested; live DB/gateway rollout remains open | Partial |
| Legacy Finance parity, canary, rollback observation, and decommission | not executed; legacy runner retained | Blocked |
| Production routing | `infra/modal/rollout.json`: disabled, `traffic_percent: 0`, authorization false | Intentionally blocked |

## Focused validation

- `packages/runtime-contracts`: typecheck; 5 tests passed.
- `packages/sandbox-provider`: typecheck; 4 tests passed; production audit found 0 vulnerabilities.
- `services/local-app-server`: typecheck; 12 tests passed.
- `packages/modal-sandbox-provider`: typecheck; 8 tests passed; production audit found 0 vulnerabilities.
- `services/modal-runtime`: 8 tests passed.
- `services/modal-control-plane`: 9 tests passed.
- Modal provider-state read: ready; exact app/image/Volume IDs matched; zero running Phase 4 sandboxes.

## Exact blockers

1. Admit and deploy the reviewed runtime tables/RPCs in the canonical database migration, then exercise the Supabase/Postgres adapter against the linked project with service-role scope kept outside Modal.
2. Mount the runtime router/integration entrypoint in the manager-owned API and connect the real worker/gateway; the local contract is not evidence of live production durability.
3. Run remote API/worker/provider failure injection through that path, including 429/500, timeout, partial upload, expired snapshot, cancellation propagation, and approval suspension.
4. Complete real General/Research/Finance gateway parity, controlled canary, immediate rollback proof, and the observation window before separately authorizing any legacy-runner decommission or nonzero traffic.

See `docs/operations/runtime/phase4b-evidence.md` for v4 immutable IDs, security remediation, remote smoke, mutation history, and exact remaining blockers.
