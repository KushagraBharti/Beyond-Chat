# Phase 12 launch foundation

**Status: foundation only; commercial launch is blocked.** This directory documents contracts, ownership, and drills without claiming that Stripe, WorkOS, email, DNS, Sentry, OpenTelemetry, backups, or a production deployment is active.

## Gate matrix

| Gate | Repository evidence | Current state | External completion required |
|---|---|---|---|
| Server-verified billing | `packages/billing-entitlements`, `backend/src/billing_v2` | Contract/tests; router unmounted; disabled by default | Activate Stripe account, create/verify product and $30 price, configure secrets, persist records, controlled live charge/refund |
| Seat reconciliation | Dry-run-first reconciliation contract | Contract only | Canonical membership repository, scheduled reconciliation, invoice comparison |
| Billing UI | `frontend/src/features/billing`, `components/billing` | Truthful unmounted component | Mount after API/persistence/auth integration |
| Legal and claims | `legal-and-claims-audit.md` | Draft audit | Counsel approval, controller/business/contact details, jurisdiction/retention decisions |
| Observability | `observability.md` and telemetry port | Redacted abstraction | Configure Sentry/OTel destination, alerts, owners, dashboard evidence |
| 500-seat scale | `scripts/load-testing`, synthetic fixtures | Generator/budgets only | Run against production-shaped preview, capture measurements, remediate |
| Economics | sensitivity fixture/model | Planning scenarios only | Pilot usage, invoices/dashboard reconciliation, support cost, commercial approval |
| Recovery | incident/backup/rollback runbooks | Draft procedures | Timed restore, incident, provider-outage, and rollback drills with evidence |
| Pilot | `pilot-and-feature-flags.md` | Metrics/flag contract | Named design partners, consent, support owner, go/no-go review |

No checkbox in this repository substitutes for an external gate or a witnessed drill.
