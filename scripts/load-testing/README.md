# Phase 12 synthetic load tools

These scripts generate local, inert fixtures; they do not send traffic. Run with Node 24:

```powershell
node scripts/load-testing/generate-500-seat-load.mjs
node scripts/load-testing/calculate-unit-economics.mjs
node scripts/load-testing/evaluate-acceptance.mjs path/to/measured-report.json
```

The acceptance report must contain `error_rate`, `p95_accept_ms`, `p95_replay_ms`, `duplicate_effects`, and `cross_tenant_reads`. Passing synthetic math is not a production load-test gate.
