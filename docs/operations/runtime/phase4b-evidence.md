# Phase 4B Runtime and Security Evidence

Captured 2026-07-11. This record is intentionally narrower than a Phase 4 completion claim. Product traffic remains disabled at 0%, the legacy runner remains retained, and no canary or decommission is authorized.

## Integration progress

- `backend/src/runtime` defines provider-neutral coordinator, persistence, queue, current-policy, connection-ownership, output-store, and run-capability ports.
- `SupabasePostgresRuntimeRepository` is the concrete PostgREST/RPC contract. Atomic queue claims require `FOR UPDATE SKIP LOCKED`; output plus event, event sequence, actual-cost finalization, and expired-lease reconciliation are single short database transactions.
- Supabase output storage is content-addressed and verifies bytes after duplicate-path conflicts. The sandbox never receives the Supabase service key.
- `ModalSandboxProvider` can require a fresh product-issued identity bound to run, organization, project, actor, immutable agent version, gateway audience, and expiry before creating compute.
- Gateway authorization re-resolves the durable run, current policy, and current connection ownership. A valid capability alone cannot bypass membership/policy/connection revocation.
- Authoritative events are contiguous; outputs are stored before `output.created`; actual provider cost is idempotent and retained for failed, canceled, timed-out, and partial-upload attempts.
- A deny-by-default FastAPI router factory is exposed for the manager to mount later. `backend/src/main.py` was not edited while the identity workstream was active.
- The parity harness returns required traffic `0` on any correctness, source, output, cost, latency, cancellation, or recovery threshold failure. It never changes routing itself.

Local failure tests cover duplicate API acceptance/replay, multi-worker claims, organization concurrency, worker lease expiry, live policy revocation, connection revocation, provider 429/500, timeout, partial upload, failed-run costs, and canary rollback decisions. Live linked-database and real gateway failure injection remain required.

## Image remediation

Pre-mutation verification matched profile `kushagrabharti`, environment `beyond-chat-production`, app `ap-FbZZRj50uSQRtGe2nwvlYH`, four v2 image IDs, three volume IDs, and zero active Phase 4 sandboxes.

The v2 Debian-based scan had 7 critical, 23 high, and 36 unclassified findings. The remediation:

- moved the final runtime OS to digest-pinned Ubuntu 26.04;
- retained a separately digest-pinned Python 3.12.12 build stage;
- installed distro security updates with `--no-install-recommends`;
- removed pip, setuptools, wheel, caches, and ensurepip from runtime layers;
- replaced Debian Chromium with vendor-version-pinned Chrome for Testing `150.0.7871.114`, recording SHA-256 `03963c0dd9bf91e9b0e760cff37680f9b92ff42758182286382787622323cf9d` and fixing executable permissions for its crash handler;
- updated and pinned Python runtime packages;
- corrected SBOM ecosystem detection so Ubuntu packages use Canonical/Ubuntu advisory priority rather than Debian records.

Candidate `2026-07-11.3` was published but failed smoke because copied CPython needed `libffi.so.8` and Chrome's crash handler lacked execute permission. It was not overwritten. Candidate `2026-07-11.4` added `libffi8` and corrected the vendor executable mode.

The exact v4 scan reports 0 critical, 0 high, and 0 unclassified findings (151 visible findings: 128 medium, 20 low, 3 unimportant). The evidence review classifies all 66 historical blocking/manual findings: 38 package removals and 28 replaced versions no longer affected by the prior advisory.

## Immutable v4 resources

| Resource | Object ID |
|---|---|
| App | `ap-FbZZRj50uSQRtGe2nwvlYH` |
| Base | `im-sM7PhCwKy46WBkVzcK23iM` |
| Documents | `im-kGV2kfZyxOSCnGQWnkHA7m` |
| Research | `im-HbHwCRRnHDWgjdoNTB0bx9` |
| Data/finance | `im-QDEEaGhyZNLNQ3JdR0PWwe` |
| Cache volume | `vo-32ghh7cJPxUHAg54jwujdl` |
| Workspace volume | `vo-Vji1FReSJUHavoZX6WsIEL` |
| Artifact volume | `vo-k3pPcHikaFcfChazNxkILK` |

The deployed v4 probes all pass. The remote smoke passes create/exec, capability-gated model/tool/event/cancel, timeout, document render/edit, finance/data imports, research/Chrome, filesystem snapshot restore, logical volume-only restore, SBOM capture, secret exclusion, and cleanup. It used no memory snapshot and left zero tagged sandboxes.

`infra/modal/rollout.json` now binds the verified v4 IDs but remains `enabled: false`, `traffic_percent: 0`, and `production_routing_authorized: false`. V2 is the explicit rollback mapping.

## Remote mutations

1. A first v3 publication command failed before image creation because the Windows console could not encode Modal's Unicode output. Mutation wrappers now force UTF-8 and fail on native nonzero exit codes.
2. V3 images were published under new immutable names; smoke failed and the candidate was retained only as evidence.
3. V4 images were published under new immutable names; remote smoke and exact-image scan passed.
4. The existing app was rolling-deployed with v4 probe functions. The app ID did not change. A transient old base probe was observed during rollout; the subsequent full probe passed v4 for all four images.
5. No traffic flag was enabled, no legacy resource was deleted, and cleanup verified zero tagged transient sandboxes.

## Remaining gate blockers

1. Runtime tables and atomic RPCs have not been admitted to the manager-owned canonical migration or exercised against the linked Supabase project.
2. The router is not mounted and the real worker/model/tool gateways are not connected to the new coordinator ports.
3. Remote API/worker/provider failure injection must run through that live path.
4. Real General, Research, and Finance parity must meet correctness/source/output/cost/latency/cancellation/recovery thresholds.
5. A separately authorized controlled canary, immediate rollback proof, and observation window are required before any nonzero traffic or legacy-runner decommission.
