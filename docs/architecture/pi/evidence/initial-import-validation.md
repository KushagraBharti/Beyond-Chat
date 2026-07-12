# Initial Pi import validation — 2026-07-11

## Identity

- Canonical repository: `https://github.com/earendil-works/pi`
- Historical redirect: `https://github.com/badlogic/pi-mono`
- Commit: `19fe0e01c5eca791c9da0372b49256845555a783`
- Tree: `d77910df21965dcf37f4a577bf8e3625e6babbd4`
- Commit date: `2026-07-11T11:12:23Z`
- Version: `0.80.6`
- License: MIT; SHA-256 `0457f5bcec3b3b211605dfb5d1a49042fd638f3686a410fe099c24a25af13c48`
- Archived source: 1,017 files; manifest SHA-256 `d7f3178aff53828bf93505820623f5ccc63f1bfa24e13bb1e3349b0f2868eceb`
- Selected-package SPDX 2.3 SBOM: 128 packages, zero unresolved declared licenses
- Local patch stack: zero

GitHub API metadata and `git ls-remote` agreed on the commit. The canonical remote returned the recorded repository URL. The archived tree contains no nested `.git`, submodule, or Git LFS dependency.

## Commands and results

### Provenance and boundary

```powershell
node scripts/pi/verify-provenance.mjs
node scripts/pi/verify-import-boundary.mjs
```

Result: pass. All 1,017 archived source files match the manifest, all are visible to Git despite repository-level `.pi/` and `skills/` ignore rules, the SBOM and license match recorded digests, references remain metadata-only, and no product source imports Pi outside `packages/pi-runtime-adapter`.

### Clean install and build

```powershell
node scripts/pi/build-selected.mjs
```

Result: pass on Windows with Node `24.18.0` and npm `11.16.0`.

- `npm ci --ignore-scripts`: 349 packages installed.
- `@earendil-works/pi-tui`: compiled only because the upstream coding-agent declarations require it.
- `@earendil-works/pi-ai`: compiled offline from the generated model catalogs pinned in Git.
- `@earendil-works/pi-agent-core`: compiled.
- `@earendil-works/pi-coding-agent`: compiled and copied its declared build assets.
- Source provenance still matched after the build.

The first attempted upstream `pi-ai` build invoked live model-catalog APIs and changed tracked generated source. That path was rejected as non-reproducible, the archived source was restored from the exact commit, and the Beyond build now invokes `tsgo` directly against the pinned catalogs. Catalog refresh is an explicit fork-update operation, never an ordinary production build side effect.

### Dependency audit

```powershell
npm audit --omit dev --json
```

Result: pass; zero info, low, moderate, high, or critical production vulnerabilities reported on 2026-07-11. This is point-in-time evidence and must be rerun for every build/promotion.

### Upstream tests on the Windows development host

Full `pi-ai` result:

- 70 test files passed, 25 skipped;
- 493 tests passed, 733 skipped;
- zero failures.

Full `pi-agent-core` result:

- 13 test files passed, 3 failed;
- 168 tests passed, 12 failed;
- failures were confined to three explicit harness files whose POSIX-relative-path assumptions produce Windows absolute/backslash paths.

Windows-filtered `pi-agent-core` result:

- 13 files / 150 tests passed;
- excluded: `nodejs-env.test.ts`, `prompt-templates.test.ts`, `skills.test.ts`.

Full `pi-coding-agent` result:

- 149 test files passed, 11 failed, 6 skipped;
- 1,508 tests passed, 27 failed, 47 skipped;
- failures were confined to the 11 exact files in `WINDOWS_TEST_EXCEPTIONS`; causes were Windows path/permission/signal behavior plus discovery of the developer’s global `.agents/skills` during tests that expected an empty home.

Windows-filtered `pi-coding-agent` result:

- 149 files passed, 6 skipped;
- 1,286 tests passed, 47 skipped;
- zero failures.

These exceptions do not waive the production gate. Modal is Linux; a complete unfiltered Linux run in the runtime image family is required before promotion. The explicit list exists to make Windows development evidence useful without hiding platform defects.

### Upgrade rehearsal

```powershell
node scripts/pi/upgrade-rehearsal.mjs `
  --candidate 19fe0e01c5eca791c9da0372b49256845555a783 `
  --report docs/architecture/pi/evidence/initial-import-rehearsal.json
```

Result: pass under the documented Windows exception policy.

- staged candidate matched the baseline: 0 added, 0 removed, 0 changed source files;
- dependency lock SHA-256 matched `94dff387e60a036d5313bd8c9f26d397f3fa306f79d50ba293fed54a5bb79227`;
- license unchanged;
- clean install and selected build passed;
- all unexcluded tests passed;
- production audit reported zero vulnerabilities.

The machine-readable result is `initial-import-rehearsal.json`.

## Promotion gates recorded at initial import

- an unfiltered Linux upstream suite in the Modal-compatible image;
- exact application lock/build resolution to this vendored fork;
- `PiRuntimeAdapter` contract and event-normalization tests;
- start, stream, steer, cancel, checkpoint, restart, replay, and resume evidence;
- document-generation and Dexter parity evals;
- run-scoped credential and sandbox permission evidence;
- a decision/patch for a headless coding-agent entry point so TUI does not become a product dependency;
- immutable runtime image digest and rollback execution.

The provenance work was complete at initial import; this list intentionally prevented that record from overstating the runtime gate at that time.

## Beyond fork activation — 2026-07-11

After the initial zero-patch archive was validated, GitHub repository `KushagraBharti/beyond-pi` (repository ID `1297429140`) was created as a full-history fork of `earendil-works/pi`. GitHub API verification proved that the fork contains the recorded commit and identical tree. No source patch or history rewrite was introduced to claim fork ownership.

## Local Phase 1 closure update — 2026-07-11

The following initial gates now have executable repository evidence:

- application locks for `packages/pi-runtime-adapter` resolve `pi-ai` and `pi-agent-core` to the vendored Beyond fork; the app server imports only the adapter;
- `PiRuntimeAdapter` implements the canonical `AgentRuntime`, normalizes actual Pi lifecycle/tool events, suppresses duplicate deliveries, validates logical checkpoints, and fails closed on unsupported events;
- the SQLite-backed local app server demonstrates durable acceptance, live SSE, steering, cancellation, checkpoint/pause, process restart, replay, reconciliation, and resume;
- cancellation remains terminal in races, including recovery of a durable cancellation intent whose runtime effect was interrupted by process loss;
- the document and Dexter finance fixtures exercise the real Pi `Agent` loop, create real Markdown bytes, and enforce source/numeric/quality/trace/latency/cost tolerances;
- the semantic sandbox reference and Docker provider contract tests prove byte/digest handling, resource and port policy arguments, wall-time cancellation, working-set checkpoint/restore, and teardown behavior;
- `scripts/phase1/validate.ps1` and Node 24 CI rerun provenance, import-boundary, build, audit, contract, fixture, and clean-tree checks.

The remaining gates are external rather than silently waived:

- run the complete unfiltered upstream and Beyond runtime suites on Linux in the exact Modal-compatible image family;
- build, scan, record, and deploy an immutable runtime image digest and prove rollback to the prior image/adapter/fork tuple;
- prove forced Modal sandbox/worker loss and recovery using durable object/filesystem state with memory snapshots disabled;
- prove fresh short-lived run credentials, network restrictions, sandbox-secret isolation, and approval enforcement through the production tool gateway;
- decide or patch a headless `pi-coding-agent` entry point before adding its optional capabilities to the production runtime. The current application runtime correctly excludes it and `pi-tui`.
