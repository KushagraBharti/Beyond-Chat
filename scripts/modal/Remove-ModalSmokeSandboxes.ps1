param(
    [switch]$Execute
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ControlPlane = Join-Path $RepoRoot "services/modal-control-plane"

Push-Location $ControlPlane
try {
    if ($Execute) {
        uv run python -m beyond_modal_control_plane.cleanup --execute
    }
    else {
        uv run python -m beyond_modal_control_plane.cleanup
    }
}
finally {
    Pop-Location
}
