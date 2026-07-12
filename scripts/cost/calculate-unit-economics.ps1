param(
    [int]$Seats = 5,
    [double]$RunsPerSeat = 20,
    [double]$AcceptedOutputRate = 0.70,
    [double]$ModelCostPerRun = 0.25,
    [double]$ExaSearchesPerRun = 2,
    [double]$SandboxMinutesPerRun = 10,
    [double]$SandboxCores = 2,
    [double]$SandboxGiB = 4,
    [int]$SsoConnections = 0,
    [int]$DirectorySyncConnections = 0,
    [double]$SeatPrice = 30,
    [string]$RateRegister = (Join-Path $PSScriptRoot "..\..\docs\operations\providers\rate-register.csv"),
    [switch]$Json
)

$ErrorActionPreference = "Stop"

if ($Seats -lt 1) { throw "Seats must be at least 1." }
if ($RunsPerSeat -lt 0) { throw "RunsPerSeat cannot be negative." }
if ($AcceptedOutputRate -le 0 -or $AcceptedOutputRate -gt 1) { throw "AcceptedOutputRate must be in (0, 1]." }
if ($SandboxMinutesPerRun -lt 0 -or $SandboxCores -lt 0 -or $SandboxGiB -lt 0) { throw "Sandbox inputs cannot be negative." }

$rates = Import-Csv -LiteralPath $RateRegister
function Rate([string]$Id) {
    $row = $rates | Where-Object rate_id -eq $Id
    if ($null -eq $row) { throw "Missing rate: $Id" }
    return [double]$row.rate_usd
}

$monthlyRuns = $Seats * $RunsPerSeat
$acceptedOutputs = $monthlyRuns * $AcceptedOutputRate
$seconds = $SandboxMinutesPerRun * 60
$sandboxPerRun = ($SandboxCores * $seconds * (Rate "modal_cpu")) + ($SandboxGiB * $seconds * (Rate "modal_memory"))
$exaPerRun = $ExaSearchesPerRun * (Rate "exa_search")
$variablePerRun = $ModelCostPerRun + $sandboxPerRun + $exaPerRun
$fixedInfrastructure = (Rate "vercel_pro_platform") + (Rate "supabase_pro_platform") + ($SsoConnections * (Rate "workos_sso")) + ($DirectorySyncConnections * (Rate "workos_directory_sync"))
$providerCogs = $fixedInfrastructure + ($monthlyRuns * $variablePerRun)
$revenue = $Seats * $SeatPrice
$paymentFees = $Seats * (($SeatPrice * (Rate "stripe_domestic_card")) + (Rate "stripe_domestic_card_fixed"))
$grossMarginDollars = $revenue - $paymentFees - $providerCogs
$grossMargin = if ($revenue -gt 0) { $grossMarginDollars / $revenue } else { 0 }
$costPerAcceptedOutput = if ($acceptedOutputs -gt 0) { $providerCogs / $acceptedOutputs } else { $null }
$providerCogsPerSeat = $providerCogs / $Seats

$result = [ordered]@{
    assumptions = [ordered]@{
        seats = $Seats
        seat_price_usd = $SeatPrice
        runs_per_seat = $RunsPerSeat
        accepted_output_rate = $AcceptedOutputRate
        model_cost_per_run_usd = $ModelCostPerRun
        exa_searches_per_run = $ExaSearchesPerRun
        sandbox_minutes_per_run = $SandboxMinutesPerRun
        sandbox_cores = $SandboxCores
        sandbox_gib = $SandboxGiB
        credits_reduce_normalized_cogs = $false
    }
    monthly = [ordered]@{
        runs = [math]::Round($monthlyRuns, 2)
        accepted_outputs = [math]::Round($acceptedOutputs, 2)
        revenue_usd = [math]::Round($revenue, 2)
        fixed_infrastructure_usd = [math]::Round($fixedInfrastructure, 4)
        provider_cogs_usd = [math]::Round($providerCogs, 4)
        payment_fees_usd = [math]::Round($paymentFees, 4)
        gross_margin_usd = [math]::Round($grossMarginDollars, 4)
        gross_margin_percent = [math]::Round($grossMargin * 100, 2)
    }
    unit = [ordered]@{
        sandbox_cost_per_run_usd = [math]::Round($sandboxPerRun, 6)
        exa_cost_per_run_usd = [math]::Round($exaPerRun, 6)
        variable_cost_per_run_usd = [math]::Round($variablePerRun, 6)
        provider_cogs_per_seat_usd = [math]::Round($providerCogsPerSeat, 4)
        provider_cogs_per_accepted_output_usd = if ($null -eq $costPerAcceptedOutput) { $null } else { [math]::Round($costPerAcceptedOutput, 4) }
    }
    guardrail = [ordered]@{
        provider_cogs_share_percent = [math]::Round(($providerCogs / $revenue) * 100, 2)
        target_max_percent = 30
        passes = (($providerCogs / $revenue) -le 0.30)
    }
    exclusions = @("OpenRouter model-specific token rates", "Composio contract usage", "Financial Datasets contract usage", "storage/egress overages", "email/observability", "support and labor", "tax/refunds/disputes")
}

if ($Json) {
    $result | ConvertTo-Json -Depth 5
}
else {
    [pscustomobject]$result.monthly | Format-List
    [pscustomobject]$result.unit | Format-List
    [pscustomobject]$result.guardrail | Format-List
}
