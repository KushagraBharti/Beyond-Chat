# Pi provenance tooling

These dependency-free Node scripts keep the maintained Pi import reproducible. Run them with the repository-approved Node/npm toolchain from the repository root.

```powershell
node scripts/pi/verify-provenance.mjs
node scripts/pi/verify-import-boundary.mjs
node scripts/pi/verify-upstreams-online.mjs
node scripts/pi/build-selected.mjs
```

`stage-upstream.mjs` requires an immutable full commit and writes only to a caller-selected temporary destination by default:

```powershell
node scripts/pi/stage-upstream.mjs --commit <40-character-sha> --destination "$env:TEMP\pi-candidate"
```

`upgrade-rehearsal.mjs` stages a candidate, installs with `npm ci`, builds the approved packages, runs their tests, and rejects high/critical production dependency advisories. It does not modify `vendor/pi/upstream`:

```powershell
node scripts/pi/upgrade-rehearsal.mjs --candidate <40-character-sha> --report docs/architecture/pi/evidence/pi-upgrade.json
```

After an approved import, regenerate integrity artifacts deliberately:

```powershell
node scripts/pi/generate-manifest.mjs --write
node scripts/pi/generate-sbom.mjs --write
```

Then update `vendor/pi/PROVENANCE.json`, review all diffs, run adapter contract/evaluation gates, and verify rollback before promotion. These scripts never choose or promote a floating branch head.
