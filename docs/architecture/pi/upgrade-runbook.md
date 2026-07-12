# Pi fork update, promotion, and rollback runbook

## Roles

- Runtime owner proposes a full candidate commit and owns adapter compatibility.
- Security/license reviewer evaluates advisories, dependency/license changes, and credential/tool boundaries.
- Evaluation owner compares built-in-agent behavior, recovery, latency, and cost.
- Release owner records the immutable fork commit and runtime image digest and verifies rollback.

One person may hold multiple roles early on, but every gate still needs recorded evidence.

## 1. Select and stage

Never sync a branch name directly into production. Resolve a full commit from the canonical repository and stage it outside the working tree:

```powershell
node scripts/pi/stage-upstream.mjs `
  --commit <40-character-candidate-sha> `
  --destination "$env:TEMP\beyond-pi-candidate"
```

Confirm repository ownership/redirects, commit/tree IDs, timestamp, signature/author information when available, and whether the selected revision is a release or an unreleased branch head.

## 2. Review diffs

Compare candidate against the recorded commit:

- source and package exports;
- root/workspace lockfile;
- runtime production dependency closure;
- provider SDKs and network behavior;
- shell/file/process tools;
- authentication and credential discovery;
- event/state serialization;
- cancellation, steering, queues, retry, compaction, and context accounting;
- license, notices, security policy, and dependency license inventory;
- generated source and build scripts.

Reject unexplained generated files or a candidate whose exact source cannot be reconstructed.

## 3. Rehearse without promotion

```powershell
node scripts/pi/upgrade-rehearsal.mjs `
  --candidate <40-character-candidate-sha> `
  --report docs/architecture/pi/evidence/pi-upgrade-<short-sha>.json
```

The rehearsal stages the exact commit, calculates source and dependency-lock diffs, performs an npm clean install, builds the approved packages, runs selected upstream tests, checks the production dependency audit, and records evidence. A license change stops the rehearsal unless explicitly sent through legal review.

The pinned revision has known upstream Windows path-assumption failures in a small explicit file list recorded by `WINDOWS_TEST_EXCEPTIONS` in `scripts/pi/lib.mjs`. On Windows, the rehearsal runs every unaffected test and records each excluded file. This waiver is local only: an unwaived complete Linux suite in the same image family used by Modal remains mandatory for promotion. Adding an exception requires source review and an evidence update; wildcard or test-count based exclusions are prohibited.

Then run Beyond-owned checks that the generic script cannot prove:

- adapter contract and import-boundary tests;
- canonical event fixtures and schema compatibility;
- start/stream/steer/cancel/checkpoint/replay/resume fault injection;
- document-generation and Dexter finance evals;
- permission/approval/secret isolation tests;
- model/provider correctness and cost/latency comparison;
- Modal image build and interrupted-run recovery;
- prior-version rollback.

## 4. Update the maintained fork

After approval, create a Beyond-controlled fork commit that preserves upstream history. Keep patches atomic and upstreamable. Export/document every local patch in `vendor/pi/patches/series.json`.

Replace `vendor/pi/upstream` from a reviewed `git archive`, then regenerate:

```powershell
node scripts/pi/generate-manifest.mjs --write
node scripts/pi/generate-sbom.mjs --write
```

Update together:

- upstream and fork commit/tree;
- import timestamp and commit subject;
- package versions and selected exports;
- file-manifest/SBOM digests and file count;
- patch series;
- known advisories/license review;
- rollback commit;
- application dependency lock/build metadata;
- runtime image digest and immutable agent/runtime version.

Never edit the archived upstream baseline by hand.

## 5. Promotion/rejection rules

Reject or hold an update when it:

- changes canonical event meaning or serialization without a versioned migration;
- weakens tool authorization, sandboxing, or credential isolation;
- changes cancellation/retry/compaction behavior outside accepted tests;
- introduces high/critical production advisories without an approved mitigation;
- adds unknown/incompatible licenses or missing attribution;
- regresses document/Dexter quality, recovery, latency, or cost outside agreed tolerances;
- requires Pi types to leak outside the adapter;
- cannot be reproduced or rolled back.

## 6. Rollback

Rollback is an immutable version selection, not an in-place rewrite:

1. Stop promotion/traffic to the candidate runtime version.
2. Select the prior recorded agent/runtime version, fork commit, and Modal image digest.
3. Preserve new-run evidence and affected checkpoints; do not reinterpret old events with a new adapter.
4. Resume only checkpoints whose adapter/schema compatibility is proven; otherwise restart from the last compatible logical checkpoint.
5. Run the canonical smoke/eval journey on the prior version.
6. Record cause, affected runs, data impact, cost impact, and follow-up action.

The initial rollback anchor is Pi commit `19fe0e01c5eca791c9da0372b49256845555a783`, tree `d77910df21965dcf37f4a577bf8e3625e6babbd4`.
