param(
    [switch]$SkipBillableProbe
)

$ErrorActionPreference = "Stop"

function Invoke-Probe {
    param(
        [Parameter(Mandatory)] [string]$Provider,
        [Parameter(Mandatory)] [string]$EnvironmentVariable,
        [Parameter(Mandatory)] [scriptblock]$Request
    )

    $credential = [Environment]::GetEnvironmentVariable($EnvironmentVariable)
    if ([string]::IsNullOrWhiteSpace($credential)) {
        return [pscustomobject]@{
            provider = $Provider
            environment_variable = $EnvironmentVariable
            configured = $false
            authenticated = $false
            status_code = $null
            note = "credential is not configured"
        }
    }

    try {
        $result = & $Request $credential
        return [pscustomobject]@{
            provider = $Provider
            environment_variable = $EnvironmentVariable
            configured = $true
            authenticated = ($result.status_code -ge 200 -and $result.status_code -lt 300)
            status_code = $result.status_code
            note = $result.note
        }
    }
    catch {
        $statusCode = $null
        if ($null -ne $_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        return [pscustomobject]@{
            provider = $Provider
            environment_variable = $EnvironmentVariable
            configured = $true
            authenticated = $false
            status_code = $statusCode
            note = $_.Exception.GetType().Name
        }
    }
}

$results = @()

$results += Invoke-Probe -Provider "OpenRouter" -EnvironmentVariable "OPENROUTER_API_KEY" -Request {
    param($credential)
    $response = Invoke-WebRequest `
        -Uri "https://openrouter.ai/api/v1/auth/key" `
        -Headers @{ Authorization = "Bearer $credential" } `
        -Method Get

    [pscustomobject]@{
        status_code = [int]$response.StatusCode
        note = "read-only key metadata endpoint accepted the credential"
    }
}

if (-not $SkipBillableProbe) {
    $results += Invoke-Probe -Provider "Exa" -EnvironmentVariable "EXASEARCH_API_KEY" -Request {
        param($credential)
        $response = Invoke-WebRequest `
            -Uri "https://api.exa.ai/search" `
            -Headers @{ "x-api-key" = $credential } `
            -ContentType "application/json" `
            -Body '{"query":"Beyond Chat provider credential health check","numResults":1}' `
            -Method Post

        [pscustomobject]@{
            status_code = [int]$response.StatusCode
            note = "minimal one-result search probe accepted the credential"
        }
    }

    $results += Invoke-Probe -Provider "Financial Datasets" -EnvironmentVariable "FINANCIAL_DATASETS_API_KEY" -Request {
        param($credential)
        $response = Invoke-WebRequest `
            -Uri "https://api.financialdatasets.ai/financials/income-statements?ticker=AAPL&period=annual&limit=1" `
            -Headers @{ "X-API-KEY" = $credential } `
            -Method Get

        [pscustomobject]@{
            status_code = [int]$response.StatusCode
            note = "minimal one-statement read probe accepted the credential"
        }
    }
}

[pscustomobject]@{
    checked_at_utc = [DateTime]::UtcNow.ToString("o")
    billable_probes_skipped = [bool]$SkipBillableProbe
    results = $results
} | ConvertTo-Json -Depth 4
