# Phase 4A Evidence and Phase 4B Handoff

## Scope completed

Phase 4A establishes a real, isolated Modal provider plane without routing product traffic. It includes:

- verified Modal profile and production environment;
- deployed `beyond-chat-runtime` app;
- three new scoped Volumes without mutating the three pre-existing volumes;
- layered, versioned base/documents/research/data-finance images;
- immutable friendly image names and object IDs for release `2026-07-11.2`;
- private runtime sidecar and readiness probe;
- short-lived run-bound Ed25519 capability implementation;
- product-owned TypeScript `ModalSandboxProvider` contract implementation;
- file integrity, allowed-root, secret, resource, network, port, and error-mapping policies;
- stable filesystem checkpoint plus logical Volume recovery, explicitly without memory snapshots;
- deterministic document, finance, and research scenarios;
- exact in-image CycloneDX SBOM capture and OSV security gate;
- provider identity, cleanup, billing, cost, and aggregate audit evidence;
- dry-run guarded deploy/publish/smoke/cleanup scripts;
- explicit 0% rollout, retained legacy runner, v1 rollback image mapping, and runbooks.

## Authoritative remote identifiers

| Resource | Name | Object ID |
|---|---|---|
| App | `beyond-chat-runtime` | `ap-FbZZRj50uSQRtGe2nwvlYH` |
| Base image | `beyond-chat-runtime-base:2026-07-11.2` | `im-D5dkQAFtfYmGYfWlYd2Fk3` |
| Documents image | `beyond-chat-runtime-documents:2026-07-11.2` | `im-IrwPQpqMUA8v6VoV6tIuLm` |
| Research image | `beyond-chat-runtime-research:2026-07-11.2` | `im-SBLo5XHyKWBL7JHrVtW1y5` |
| Data/finance image | `beyond-chat-runtime-data-finance:2026-07-11.2` | `im-bau2LHUDl4L1XU7SPQKyQ7` |
| Cache Volume | `beyond-chat-runtime-cache-v1` | `vo-32ghh7cJPxUHAg54jwujdl` |
| Workspace Volume | `beyond-chat-runtime-workspaces-v1` | `vo-Vji1FReSJUHavoZX6WsIEL` |
| Artifact Volume | `beyond-chat-runtime-artifacts-v1` | `vo-k3pPcHikaFcfChazNxkILK` |

Rollback release `2026-07-11.1` remains published with its four exact IDs in `infra/modal/rollout.json`.

## Evidence inventory

| File | Meaning |
|---|---|
| `modal-resources.json` | new Volume names, IDs, timestamps, dashboard URLs, and guarded deletion precondition |
| `modal-images.json` | immutable v2 name-to-ID mapping |
| `modal-image-probes.json` | sequential remote identity checks for all four deployed images |
| `modal-remote-smoke.json` | lifecycle, capability, event, recovery, output, SBOM, cleanup, latency, and floor-cost results |
| `sbom-*.cdx.json` | exact installed Python and Debian components from each deployed image |
| `modal-osv-scan.json` | deduplicated, severity-classified exact-version advisory report |
| `modal-provider-state.json` | profile, environment, deployed app, image/volume bindings, zero active Phase 4 sandboxes, and billing |
| `modal-phase4a-audit.json` | requirement-by-requirement provider-plane aggregation without claiming full Phase 4 completion |
| `infra/modal/rollout.json` | explicit disabled/0% traffic state, rollback release, blockers, and promotion requirements |

## Remote smoke result

The final v2 smoke captured at `2026-07-11T17:07:43.813840+00:00` completed in `49.672` seconds with `all_passed: true`. It produced checkpoint image `im-01KX92B67GRQ5Y0G6G2AREC1NQ` and proved:

- base sandbox readiness and `exec`;
- echo tool and deterministic fake model through the capability-gated sidecar;
- durable event append/replay;
- cancellation and timeout;
- filesystem checkpoint with `memory_snapshot: false`;
- source deletion plus snapshot restore and replay;
- independent pinned-image plus Volume logical restore;
- a 28,467-byte edited PPTX and 14,145-byte rendered PDF with SHA-256 hashes;
- finance count/sum/min/max/average output;
- Chromium `150.0.7871.100` and research dependencies;
- four nonempty SBOMs totaling 232, 839, 532, and 250 components respectively;
- `secrets_in_sandbox: false` and `memory_snapshots_used: false`;
- cleanup of every tagged transient sandbox.

The provider-state recapture subsequently found zero running Phase 4 sandboxes.

## Local validation baseline

At handoff, the focused suites are expected to report:

- `packages/modal-sandbox-provider`: TypeScript typecheck passes, 7 Node tests pass, npm production audit has zero vulnerabilities at high threshold. The suite includes immutable image-ID verification, content-addressed working-set materialization, checkpoint-manifest integrity, snapshot restore, and immutable-base fallback after snapshot expiry.
- `services/modal-runtime`: 7 pytest tests pass.
- `services/modal-control-plane`: 8 pytest tests pass, including cost and security classification.
- The read-only provider-state recapture verifies the app, four release images, and three Volumes against the exact object IDs in `infra/modal/rollout.json`; friendly-name presence alone is not sufficient.

Regenerate the final counts with `scripts/modal/Test-ModalProvider.ps1`; evidence is only current if those commands still pass against the checked-out locks.

## Promotion blocker

The v2 exact-image scan is intentionally not green: 7 critical, 23 high, and 36 unclassified Debian records remain. The provider plane is usable for controlled engineering verification, but the image release is not authorized for production traffic. `infra/modal/rollout.json` therefore remains disabled at 0% and the legacy runner remains available.

## Phase 4B dependency handoff

The owning integration workstream must complete, in dependency order:

1. Persist sandbox attempts, provider IDs, lifecycle, idempotency, leases, resource reservations, and actual usage in the durable run control plane.
2. Issue run capabilities from the trusted product control plane and make the gateway recheck current organization/project/actor policy and connection ownership.
3. Materialize only ACL-approved working-set objects; upload semantic outputs to authoritative object storage before committing completion events.
4. Replace fake model/tool probes with controlled real gateway tests while keeping master credentials outside Modal.
5. Bind checkpoint manifests to real durable event cursors, serialized Pi logical state, artifact references, image/skill/agent versions, and object hashes.
6. Implement durable cancellation across coordinator, Pi, subprocesses, tool calls, and Modal teardown.
7. Add organization/global concurrency, budget reservations, actual cost finalization, and orphan reconciliation.
8. Prove browser close, API restart, worker loss, duplicate command, approval suspension, provider 429/500, model timeout, partial upload, and snapshot expiration.
9. Compare General/Research/Finance outputs, traces, latency, cost, cancellation, and recovery against the retained local/legacy paths.
10. Remediate or narrowly risk-accept every security blocker, rebuild a new immutable release, and obtain a passing promotion report.
11. Run an internal 0-to-small canary with explicit thresholds and immediate 0% rollback.
12. Observe the rollback window before separately authorizing legacy runner decommission.

Until these are complete, no truthful status may say “Phase 4 complete,” “production Modal active,” or “legacy runner safely removable.”
