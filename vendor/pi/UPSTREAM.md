# Pi maintained-fork provenance

Beyond uses a maintained, vendored fork of Pi. Production must never resolve Pi from a floating npm range or branch.

## Pinned revision

| Field | Value |
| --- | --- |
| Canonical repository | `https://github.com/earendil-works/pi` |
| Beyond-controlled fork | `https://github.com/KushagraBharti/beyond-pi` (GitHub repository ID `1297429140`) |
| Historical repository | `https://github.com/badlogic/pi-mono` (redirects to the canonical repository) |
| Default branch observed | `main` |
| Upstream commit | `19fe0e01c5eca791c9da0372b49256845555a783` |
| Upstream tree | `d77910df21965dcf37f4a577bf8e3625e6babbd4` |
| Beyond fork baseline/current commit | `19fe0e01c5eca791c9da0372b49256845555a783` |
| Commit timestamp | `2026-07-11T11:12:23Z` |
| Imported | `2026-07-11T11:30:30Z` |
| Package version | `0.80.6` |
| License | MIT |
| Patch count | `0` |

The full-history Beyond-controlled fork was created on 2026-07-11 and independently verified to contain commit `19fe0e01c5eca791c9da0372b49256845555a783` with tree `d77910df21965dcf37f4a577bf8e3625e6babbd4`. Git forks preserve commit object identities, so this zero-patch maintained-fork baseline is the exact upstream commit above. The first source patch must be committed on that Beyond-controlled fork, recorded in `PROVENANCE.json`, and represented in `patches/series.json`.

## Layout and integrity

- `upstream/` is the exact `git archive` of the pinned commit, without nested `.git` state.
- `UPSTREAM_FILES.sha256` hashes every archived source file. Build output, dependency directories, coverage, and Git metadata are excluded from verification.
- `SBOM.spdx.json` is an npm lockfile-derived SPDX 2.3 inventory for the selected runtime packages and their production dependency closure.
- `LICENSE.upstream.txt` is an unmodified copy of the upstream license.
- `patches/series.json` is the ordered local patch stack. It is empty for this import.
- `PROVENANCE.json` is the machine-readable authority for the revision, package selection, integrity digests, and rollback revision.

Validate the import from the repository root:

```powershell
node scripts/pi/verify-provenance.mjs
node scripts/pi/verify-import-boundary.mjs
node scripts/pi/build-selected.mjs
```

## Update policy

1. Select a full candidate commit; never import `main` by name.
2. Stage it outside the working tree with `scripts/pi/stage-upstream.mjs`.
3. Review source, dependency, license, security, and package-export diffs.
4. Run `scripts/pi/upgrade-rehearsal.mjs` and preserve its evidence.
5. Run Beyond adapter contracts, durable replay/recovery tests, built-in-agent evals, and cost/latency comparisons.
6. Reject changes to event meaning, tool authorization, cancellation, serialization, compaction, provider behavior, or cost outside accepted tolerances.
7. Update the fork commit, tree, hashes, SBOM, patch series, image digest, and rollback commit together.
8. Promote by immutable runtime version. Never mutate an already-published agent/runtime version.

Ordinary upstream changes are reviewed on a scheduled cadence. Security advisories are triaged immediately. Updates are never automatic.
