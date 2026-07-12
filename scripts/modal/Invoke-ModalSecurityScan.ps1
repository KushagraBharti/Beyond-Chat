$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ControlPlane = Join-Path $RepoRoot "services/modal-control-plane"
$Fixtures = Join-Path $RepoRoot "fixtures/phase4"

Push-Location $ControlPlane
try {
    uv run python -m beyond_modal_control_plane.security_scan `
        --sbom (Join-Path $Fixtures "sbom-base.cdx.json") `
        --sbom (Join-Path $Fixtures "sbom-documents.cdx.json") `
        --sbom (Join-Path $Fixtures "sbom-research.cdx.json") `
        --sbom (Join-Path $Fixtures "sbom-data-finance.cdx.json") `
        --output (Join-Path $Fixtures "modal-osv-scan.json")
}
finally {
    Pop-Location
}
