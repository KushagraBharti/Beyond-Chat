# Local Pi patch stack

The patch stack is intentionally empty. Prefer behavior in `packages/pi-runtime-adapter`, an upstream extension point, or an upstreamable change.

If a fork patch becomes unavoidable:

1. Make one narrowly scoped commit on the Beyond-controlled Pi fork.
2. Export it as a numbered patch without rewriting authorship or license notices.
3. Add its filename, source commit, purpose, owner, upstream issue/PR, and SHA-256 digest to `series.json`.
4. Update `vendor/pi/PROVENANCE.json` so `currentForkCommit` points to the exact fork commit and `patchCount` matches.
5. Apply patches in series order in an isolated build copy; never mutate the archived `upstream/` baseline in place.
6. Run provenance, build, adapter contract, eval, recovery, security, and rollback gates.
7. Remove the patch when its upstream equivalent is imported.

Large feature forks, squashed third-party history, and undocumented edits fail the upgrade gate.
