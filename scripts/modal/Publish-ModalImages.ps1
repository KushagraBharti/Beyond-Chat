param(
    [switch]$Execute
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$env:PYTHONUTF8 = "1"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ControlPlane = Join-Path $RepoRoot "services/modal-control-plane"
$Output = Join-Path $RepoRoot "fixtures/phase4/releases/2026-07-11.4/modal-images.json"

if (-not $Execute) {
    Write-Output "Dry run only. Re-run with -Execute to publish the release names declared in config.py."
    exit 0
}

Push-Location $ControlPlane
try {
    $profile = (uv run modal profile current).Trim()
    if ($profile -ne "kushagrabharti") {
        throw "Refusing publish: unexpected Modal profile '$profile'."
    }
    uv run python -m beyond_modal_control_plane.publish --output $Output
    if ($LASTEXITCODE -ne 0) { throw "Modal image publication failed with exit code $LASTEXITCODE." }
}
finally {
    Pop-Location
}
