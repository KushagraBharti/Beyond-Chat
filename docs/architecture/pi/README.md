# Pi runtime provenance and fork boundary

This directory is the architecture record for Beyond’s maintained Pi dependency. `vendor/pi/PROVENANCE.json` is the machine-readable revision authority; this documentation explains why and how it is used.

## Decision

Beyond owns the product protocol, durability, identity, authorization, policy, knowledge, memory, tools, checkpoints, and outputs. Pi supplies a replaceable agent loop and selected headless coding-agent capabilities behind `PiRuntimeAdapter`.

The production source is the vendored export of the full-history Beyond-controlled fork at `https://github.com/KushagraBharti/beyond-pi`, pinned to an immutable fork commit and stored at `vendor/pi/upstream`. Public `@earendil-works/*` packages are not an acceptable production source. Package names in imports identify upstream modules; resolution must point to the vendored build and lockfile.

The initial fork is a zero-patch import of:

- repository: `https://github.com/earendil-works/pi`
- commit: `19fe0e01c5eca791c9da0372b49256845555a783`
- tree: `d77910df21965dcf37f4a577bf8e3625e6babbd4`
- version: `0.80.6`
- license: MIT

The repository was renamed from `badlogic/pi-mono`; that historical URL currently redirects to the canonical repository. Both are recorded to make future provenance investigations unambiguous.

## Authority and boundaries

| Concern | Authority |
| --- | --- |
| Pi revision, tree, package versions, digests | `vendor/pi/PROVENANCE.json` |
| Exact archived source hashes | `vendor/pi/UPSTREAM_FILES.sha256` |
| Dependency/license inventory | `vendor/pi/SBOM.spdx.json` |
| Local fork patches | `vendor/pi/patches/series.json` |
| Allowed packages and API surface | `selected-packages.md` |
| Product import isolation | `adapter-boundary.md` and `scripts/pi/verify-import-boundary.mjs` |
| Update, promotion, rejection, rollback | `upgrade-runbook.md` |
| Codex protocol inspiration | `reference/codex/` |
| T3 Code orchestration/UI inspiration | `reference/t3code/` |

No Pi-native event, ID, checkpoint, message, permission, or error type may cross the adapter boundary. The browser, API, database, and durable log consume Beyond contracts only.

## Required checks

```powershell
node scripts/pi/verify-provenance.mjs
node scripts/pi/verify-import-boundary.mjs
node scripts/pi/build-selected.mjs
```

The repository now contains executable adapter contract tests, canonical event normalization, start/stream/steer/cancel/checkpoint/process-restart/replay/resume evidence, deterministic document and Dexter finance fixtures, and semantic in-memory/Docker-provider contract evidence. Those checks close the local Phase 1 spike; they do not by themselves promote a production runtime.

External promotion still requires an unfiltered Linux upstream/runtime suite in the Modal-compatible image, a real immutable runtime image digest, run-scoped credential and network-policy evidence, forced Modal sandbox-loss recovery, image scanning/SBOM evidence, and an exercised deployment rollback. See `evidence/initial-import-validation.md` and `../runtime-spike/README.md` for the exact boundary between completed local evidence and external gates.
