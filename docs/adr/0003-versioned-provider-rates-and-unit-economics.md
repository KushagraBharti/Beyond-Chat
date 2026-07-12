# ADR 0003: Versioned Provider Rates and Unit Economics

- Status: Accepted
- Date: 2026-07-11

## Decision

Provider rates are versioned inputs with effective/verification dates and primary-source URLs. Credits reduce cash burn but do not reduce normalized per-run COGS. Product decisions optimize cost per accepted output and active seat, not token price alone.

## Consequences

- Historical usage is priced with the rate version effective at execution time.
- Pending contract rates block a complete commercial forecast.
- Scenario calculations include fixed platform costs, model/tool/sandbox costs, payment fees, acceptance rate, and gross margin.
- The `$30` seat price must be revised if expected or p95 provider COGS cannot stay within the approved guardrail without degrading output quality.

