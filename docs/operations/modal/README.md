# Beyond Modal Execution Plane

This directory is the operating record for the first governed Modal execution-plane slice. It covers the provider adapter, immutable runtime images, sandbox sidecar, short-lived run capability, stable filesystem recovery, disposable smoke resources, evidence capture, costs, security promotion gate, rollback, and the remaining product-integration work.

## Current truth

The provider plane is deployed and remotely proven in Modal environment `beyond-chat-production`. Production routing is deliberately disabled.

| Item | State | Evidence |
|---|---|---|
| Verified Modal profile | `kushagrabharti` | `fixtures/phase4/modal-provider-state.json` |
| Deployed app | `beyond-chat-runtime` / `ap-FbZZRj50uSQRtGe2nwvlYH` | provider-state fixture |
| Immutable release | `2026-07-11.4` | `fixtures/phase4/releases/2026-07-11.4/modal-images.json` |
| Base image | `im-sM7PhCwKy46WBkVzcK23iM` | v4 image fixture and remote probe |
| Documents image | `im-kGV2kfZyxOSCnGQWnkHA7m` | v4 image fixture and remote probe |
| Research image | `im-HbHwCRRnHDWgjdoNTB0bx9` | v4 image fixture and remote probe |
| Data/finance image | `im-QDEEaGhyZNLNQ3JdR0PWwe` | v4 image fixture and remote probe |
| Remote lifecycle/output smoke | Passed | v4 release fixture |
| Filesystem checkpoint and volume-only restore | Passed; no memory snapshot | smoke fixture |
| Master secrets in sandbox | None | runtime fail-closed policy plus smoke fixture |
| Tagged smoke sandboxes after verification | Zero | provider-state fixture |
| Exact-image SBOM scan | Passed: 0 critical/high/unclassified | v4 release fixture |
| Product traffic | `0%`, disabled | `infra/modal/rollout.json` |
| Legacy runner | Retained | rollout config |

“Provider plane complete” does not mean the complete Phase 4 gate is satisfied. Product coordinator integration, real policy-rechecked model/tool gateway traffic, failure injection, legacy Finance parity, usage finalization, a passing security promotion scan, canary routing, and rollback observation are still Phase 4B work.

## Code and evidence map

- `packages/modal-sandbox-provider/` — product-owned TypeScript `SandboxProvider` implementation using the official Modal JavaScript client.
- `services/modal-runtime/` — Python sidecar, run-capability verification, deterministic output jobs, readiness check, and SBOM helper. Managed only with `uv`.
- `services/modal-control-plane/` — Modal app/image definitions and reproducible provisioning, publication, probes, smoke, provider-state, cleanup, security scan, cost, and audit commands. Managed only with `uv`.
- `infra/modal/rollout.json` — explicit no-traffic rollout state, immutable release bindings, rollback release, and promotion requirements.
- `fixtures/phase4/` — timestamped provider facts and test evidence. Fixtures contain identifiers and results, never credentials.
- `scripts/modal/` — guarded PowerShell entry points. Mutation scripts are dry-run unless `-Execute` is supplied.

## Non-negotiable invariants

1. Sandboxes are disposable compute. The database event log, object references, and content-addressed manifests remain authoritative.
2. No WorkOS key, Supabase service key, Stripe key, Composio project key, OpenRouter key, Modal token, or other master administrative credential may enter the image, sandbox environment, event log, fixture, or output.
3. A run receives a short-lived Ed25519 capability scoped to a single run, explicit operations, a nonce, and at most 900 seconds. The gateway must still re-resolve current membership and policy in Phase 4B.
4. Network access is blocked by default. A future allowlist is policy input, not an arbitrary agent request.
5. Published image names and object IDs are immutable release inputs. Never silently move a release name to different contents after promotion. Failed candidate `2026-07-11.3` remains historical evidence and was not overwritten.
6. Correctness never depends on Modal memory snapshots. Version 1 uses stable filesystem snapshots as an optional fast path and durable volume/object manifests as the fallback.
7. Every transient sandbox is tagged, bounded by CPU/memory/wall-time/idle policy, and terminated on success, failure, cancellation, and smoke cleanup.
8. Existing volumes `beyond-chat-runtime-cache`, `beyond-chat-workspaces`, and `beyond-chat-artifacts` predate this slice and were observed but not mutated. New work uses the three `-v1` volumes recorded in the fixtures.
9. No legacy runner decommission and no nonzero traffic routing occurs until every promotion requirement in `infra/modal/rollout.json` passes and a human authorizes the change.

## Safe verification

Run from the repository root in PowerShell:

```powershell
./scripts/modal/Test-ModalProvider.ps1
```

This runs local provider/runtime/control-plane tests, re-probes the deployed release, captures provider identity and current billing, and regenerates the Phase 4A audit. It does not run the billable extended smoke or mutate the deployment.

The extended smoke is intentionally explicit:

```powershell
./scripts/modal/Invoke-ModalSmoke.ps1 -Execute
```

The security scan returns a nonzero exit code while blocking or unclassified findings remain. That failure is the expected promotion safeguard, not a reason to discard its evidence.

## Detailed documents

- [Architecture and boundaries](architecture.md)
- [Deployment, verification, and recovery runbook](runbook.md)
- [Security and promotion gate](security-and-promotion.md)
- [Cost, latency, and unit economics](cost-and-latency.md)
- [Phase 4A evidence and Phase 4B handoff](phase4a-evidence.md)
