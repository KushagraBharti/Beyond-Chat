param(
    [switch]$Execute
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$env:PYTHONUTF8 = "1"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ControlPlane = Join-Path $RepoRoot "services/modal-control-plane"

if (-not $Execute) {
    Write-Output "Dry run only. Re-run with -Execute after reviewing image definitions, locks, and the security gate."
    exit 0
}

Push-Location $ControlPlane
try {
    $profile = (uv run modal profile current).Trim()
    if ($profile -ne "kushagrabharti") {
        throw "Refusing deploy: Modal profile '$profile' is not the verified Beyond profile."
    }
    uv run pytest
    if ($LASTEXITCODE -ne 0) { throw "Modal control-plane tests failed with exit code $LASTEXITCODE." }
    uv run modal deploy -e beyond-chat-production --strategy rolling --tag phase4-2026-07-11.4 -m beyond_modal_control_plane.app
    if ($LASTEXITCODE -ne 0) { throw "Modal deployment failed with exit code $LASTEXITCODE." }
}
finally {
    Pop-Location
}
