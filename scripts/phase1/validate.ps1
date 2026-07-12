$ErrorActionPreference = "Stop"
$validationPaths = @(
  "packages/contracts",
  "packages/runtime-contracts",
  "packages/pi-runtime-adapter",
  "packages/sandbox-provider",
  "services/local-app-server",
  "fixtures/phase1",
  "scripts/phase1",
  "scripts/pi",
  "docs/architecture/pi",
  "docs/architecture/runtime-spike",
  "vendor/pi",
  "reference"
)
$statusBefore = @(git status --porcelain=v1 --untracked-files=all -- $validationPaths)
if ($LASTEXITCODE -ne 0) { throw "Unable to capture the pre-validation Git status" }

node scripts/pi/verify-provenance.mjs
node scripts/pi/verify-upstreams-online.mjs
node scripts/pi/verify-import-boundary.mjs
node scripts/pi/build-selected.mjs

Push-Location "vendor/pi/upstream"
try {
  npm audit --omit=dev --audit-level=high
}
finally {
  Pop-Location
}

$roots = @(
  "packages/contracts",
  "packages/runtime-contracts",
  "packages/pi-runtime-adapter",
  "packages/sandbox-provider",
  "services/local-app-server"
)

foreach ($root in $roots) {
  Push-Location $root
  try {
    npm ci
    npm audit --audit-level=high
    npm run typecheck
    npm test
  }
  finally {
    Pop-Location
  }
}

node --experimental-strip-types scripts/phase1/run-fixtures.ts
node scripts/pi/verify-provenance.mjs
node scripts/pi/verify-import-boundary.mjs

$statusAfter = @(git status --porcelain=v1 --untracked-files=all -- $validationPaths)
if ($LASTEXITCODE -ne 0) { throw "Unable to capture the post-validation Git status" }
if (($statusBefore -join "`n") -ne ($statusAfter -join "`n")) {
  throw "Phase 1 validation changed the repository working-tree status"
}
