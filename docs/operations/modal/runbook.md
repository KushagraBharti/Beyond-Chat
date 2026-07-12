# Deployment, Verification, and Recovery Runbook

## Safety model

All commands target environment `beyond-chat-production`, app `beyond-chat-runtime`, immutable `2026-07-11.4` image names, and the three new `-v1` volumes. Verify these identifiers before any mutation. Never infer identity from a friendly name alone.

The scripts under `scripts/modal/` are intentionally conservative:

- deploy, publish, and remote smoke require `-Execute`;
- cleanup is a dry-run unless `-Execute` is supplied;
- cleanup can select only app `beyond-chat-runtime` sandboxes with all tags `product=beyond-chat`, `phase=4`, and `smoke=true`;
- no script changes `infra/modal/rollout.json` or routes traffic;
- no script deletes a volume or published image.

## Prerequisites

1. Modal CLI version matches the `modal==1.5.2` control-plane lock.
2. `uv` is available; never use `pip` in these Python services.
3. Node 24 and npm are available for the TypeScript provider; never use yarn or pnpm.
4. `modal profile current` returns `kushagrabharti`.
5. Environment `beyond-chat-production` exists.
6. Review `git status` and preserve changes outside the Modal-owned paths.
7. Confirm `infra/modal/rollout.json` remains `enabled: false` and `traffic_percent: 0` unless a separately authorized canary is underway.

## Local validation

```powershell
cd packages/modal-sandbox-provider
npm run typecheck
npm test
npm run audit

cd ../../services/modal-runtime
uv sync --locked
uv run pytest

cd ../modal-control-plane
uv sync --locked
uv run pytest
uv run python -m compileall -q src tests
```

Do not deploy if these fail. A failure in unrelated repository work is reported to the owning workstream rather than “fixed” from this scope.

## Deploy the Modal app

Review `services/modal-control-plane/src/beyond_modal_control_plane/config.py` and `images.py`, both uv lock files, the current security report, and the proposed release tag. Then:

```powershell
./scripts/modal/Deploy-ModalRuntime.ps1 -Execute
```

Expected result: app `ap-FbZZRj50uSQRtGe2nwvlYH` remains the single deployed `beyond-chat-runtime` app and exposes four private image probe functions.

The deploy does not publish friendly image names. It also does not route product traffic.

## Publish immutable image names

```powershell
./scripts/modal/Publish-ModalImages.ps1 -Execute
```

Expected result: `fixtures/phase4/modal-images.json` contains the exact name/ID mapping for all four images. Compare those IDs with `infra/modal/rollout.json`. A mismatch is a stop condition.

Never delete release `2026-07-11.1` while it remains the declared rollback release. Never delete any image referenced by a checkpoint manifest.

## Probe the deployed release

The normal verification script invokes probes sequentially to avoid Modal app-creation rate limits:

```powershell
./scripts/modal/Test-ModalProvider.ps1
```

Each probe must return app `beyond-chat-runtime`, its exact image kind, release `2026-07-11.4`, and cryptography runtime `49.0.0`. The command also recaptures provider identity, image/volume bindings, active Phase 4 sandbox count, and current-day provider billing.

## Extended remote smoke

The smoke is billable and creates remote sandboxes, so it is separate from routine verification:

```powershell
./scripts/modal/Invoke-ModalSmoke.ps1 -Execute
```

It runs serially and proves:

1. base image create/readiness/exec;
2. capability-gated echo tool and deterministic fake model;
3. append and replay of durable events;
4. cancellation and provider timeout behavior;
5. stable filesystem snapshot checkpoint with `memory_snapshot: false`;
6. source sandbox termination followed by snapshot restore and event replay;
7. separate pinned-image plus Volume-only logical restore;
8. PPTX create, edit, and PDF render with nonempty outputs and content hashes;
9. finance CSV calculation and durable JSON output;
10. research Python imports and Chromium availability;
11. exact Python and Debian SBOM capture from each release image;
12. termination of every transient sandbox in `finally` cleanup.

If the command is interrupted, first dry-run cleanup:

```powershell
./scripts/modal/Remove-ModalSmokeSandboxes.ps1
```

Review the exact candidate IDs, then:

```powershell
./scripts/modal/Remove-ModalSmokeSandboxes.ps1 -Execute
```

Never broaden the cleanup tags to a friendly-name prefix or delete an unknown sandbox.

## Security scan and promotion decision

```powershell
./scripts/modal/Invoke-ModalSecurityScan.ps1
```

The command queries the fixed official OSV API for every exact PyPI and Debian version in the four SBOMs, enriches advisories, uses Debian urgency first, falls back to CVE CVSS only when Debian has not assigned urgency, deduplicates identical package/version/advisory occurrences, and fails on high, critical, or unclassified findings.

As of the evidence capture, this returns a nonzero exit and keeps promotion blocked. Do not override the exit code in CI. See `security-and-promotion.md` for triage.

## Evidence audit

```powershell
cd services/modal-control-plane
uv run python -m beyond_modal_control_plane.audit `
  --fixtures ../../fixtures/phase4 `
  --rollout ../../infra/modal/rollout.json `
  --output ../../fixtures/phase4/modal-phase4a-audit.json
```

The audit can report `provider_plane_complete: true` while `phase4_gate_satisfied: false`. That distinction is intentional.

## Recovery procedure

### Sandbox lost during a run

1. Stop issuing commands to the lost provider ID.
2. Read the authoritative run state, last committed event sequence, object references, and checkpoint manifest from product storage.
3. Re-resolve actor membership, agent version, runtime image, policy, approvals, budget, and connection ownership.
4. Issue a new short-lived run capability and nonce; do not reuse expired or potentially exposed credentials.
5. Prefer a valid stable filesystem snapshot referenced by the manifest.
6. If the snapshot is expired or unavailable, create from the pinned base image and mount/materialize the content-addressed working set and semantic outputs.
7. Start a new sidecar and verify readiness.
8. Replay events strictly after the restored cursor, reconcile provider state, and resume only an idempotent next action.
9. Record the new sandbox attempt and causation. The new provider ID must never overwrite the prior attempt record.
10. On completion or terminal failure, finalize usage and terminate the new sandbox.

The current smoke proves steps 5–8 with Volume-backed events and a manifest. Phase 4B must bind those steps to the durable product database and object storage.

### Output upload partially fails

1. Keep the run in a recoverable state; do not emit a completed output event.
2. Recalculate content hash and byte size.
3. Retry to a new immutable object key using the run/output idempotency key.
4. Verify object readability and metadata before committing the output reference.
5. If retry budget is exhausted, checkpoint the working set and expose a truthful recoverable failure.

### Provider rate limit

1. Map to `provider.rate_limited`.
2. Do not create multiple parallel replacement sandboxes.
3. Retry with bounded jitter and the same logical operation idempotency key.
4. Leave durable queued/running state truthful.
5. Escalate if the age or attempt budget crosses policy.

## Rollback

At current 0% traffic, rollback is simply to keep the legacy runner selected. No database or volume deletion is required.

For a future canary rollback:

1. Set product routing to 0% Modal through the authorized rollout mechanism.
2. Stop new Modal dispatch.
3. Allow safe in-flight actions to checkpoint, or cancel them according to policy.
4. Reconcile every Modal attempt and terminate its sandbox.
5. Resume retryable work on the legacy runner only if the agent/runtime/output contract is compatible.
6. Preserve Modal event, output, usage, and checkpoint evidence for incident review.
7. If the defect is image-specific and Modal remains selected for internal tests, repoint internal configuration to the exact `2026-07-11.2` rollback IDs in `infra/modal/rollout.json`; do not mutate the `2026-07-11.4` name.
8. Re-run local tests, probes, extended smoke, security scan, and the full product parity suite before another canary.

Volume deletion is not part of rollback. The destructive commands recorded in `fixtures/phase4/modal-resources.json` are inventory-only and require a separate export, retention, and approval procedure.

## Escalation conditions

Stop rather than guess if identity differs, image name points at an unexpected ID, a master credential appears in a sandbox, a running smoke sandbox cannot be terminated, event replay diverges, output hashes mismatch, recovery needs a memory snapshot, billing is materially above the measured envelope, or the security gate is not passing.
