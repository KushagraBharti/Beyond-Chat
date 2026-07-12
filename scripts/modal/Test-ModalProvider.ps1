$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$env:PYTHONUTF8 = "1"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ControlPlane = Join-Path $RepoRoot "services/modal-control-plane"
$Runtime = Join-Path $RepoRoot "services/modal-runtime"
$Provider = Join-Path $RepoRoot "packages/modal-sandbox-provider"
$Fixtures = Join-Path $RepoRoot "fixtures/phase4"
$RolloutFixture = Join-Path $RepoRoot "infra/modal/rollout.json"
$Rollout = Get-Content -Raw -LiteralPath $RolloutFixture | ConvertFrom-Json
$Release = [string]$Rollout.release
if ($Release -notmatch '^\d{4}-\d{2}-\d{2}\.\d+$') {
    throw "Modal rollout release is missing or invalid: '$Release'"
}
$ReleaseFixtures = Join-Path $Fixtures (Join-Path "releases" $Release)
$ImagesFixture = Join-Path $ReleaseFixtures "modal-images.json"
if (-not (Test-Path -LiteralPath $ImagesFixture -PathType Leaf)) {
    throw "Modal image manifest for rollout release '$Release' was not found at '$ImagesFixture'"
}

Push-Location $Provider
try {
    npm run typecheck
    npm test
    npm run audit
}
finally {
    Pop-Location
}

Push-Location $Runtime
try {
    uv run pytest
}
finally {
    Pop-Location
}

Push-Location $ControlPlane
try {
    uv run pytest
    uv run python -m beyond_modal_control_plane.probe --output (Join-Path $ReleaseFixtures "modal-image-probes.json")
    uv run python -m beyond_modal_control_plane.provider_state `
        --output (Join-Path $ReleaseFixtures "modal-provider-state.json") `
        --images-fixture $ImagesFixture `
        --rollout-fixture $RolloutFixture
    uv run python -m beyond_modal_control_plane.audit `
        --fixtures $Fixtures `
        --rollout $RolloutFixture `
        --output (Join-Path $ReleaseFixtures "modal-phase4a-audit.json")
}
finally {
    Pop-Location
}
