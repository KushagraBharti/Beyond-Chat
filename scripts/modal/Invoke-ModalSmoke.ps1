param(
    [switch]$Execute
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$env:PYTHONUTF8 = "1"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ControlPlane = Join-Path $RepoRoot "services/modal-control-plane"
$Output = Join-Path $RepoRoot "fixtures/phase4/releases/2026-07-11.4/modal-remote-smoke.json"

if (-not $Execute) {
    Write-Output "Dry run only. The smoke creates billable, tagged sandboxes and deletes them. Re-run with -Execute."
    exit 0
}

Push-Location $ControlPlane
try {
    uv run python -m beyond_modal_control_plane.smoke --output $Output
    if ($LASTEXITCODE -ne 0) { throw "Modal smoke failed with exit code $LASTEXITCODE." }
    uv run python -m beyond_modal_control_plane.cleanup
    if ($LASTEXITCODE -ne 0) { throw "Modal smoke cleanup failed with exit code $LASTEXITCODE." }
}
finally {
    Pop-Location
}
