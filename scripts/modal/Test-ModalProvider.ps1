$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$env:PYTHONUTF8 = "1"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ControlPlane = Join-Path $RepoRoot "services/modal-control-plane"
$Runtime = Join-Path $RepoRoot "services/modal-runtime"
$Provider = Join-Path $RepoRoot "packages/modal-sandbox-provider"
$Fixtures = Join-Path $RepoRoot "fixtures/phase4"

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
    uv run python -m beyond_modal_control_plane.probe --output (Join-Path $Fixtures "modal-image-probes.json")
    uv run python -m beyond_modal_control_plane.provider_state `
        --output (Join-Path $Fixtures "modal-provider-state.json") `
        --images-fixture (Join-Path $Fixtures "modal-images.json") `
        --rollout-fixture (Join-Path $RepoRoot "infra/modal/rollout.json")
    uv run python -m beyond_modal_control_plane.audit `
        --fixtures $Fixtures `
        --rollout (Join-Path $RepoRoot "infra/modal/rollout.json") `
        --output (Join-Path $Fixtures "modal-phase4a-audit.json")
}
finally {
    Pop-Location
}
