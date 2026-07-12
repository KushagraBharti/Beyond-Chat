# Billing and launch observability contract

Sentry and OpenTelemetry are not installed or configured by this foundation. `TelemetryPort` keeps application code vendor-neutral; the current structured logger must contain identifiers and classifications only, never webhook bodies, signatures, prompts, documents, card data, or secrets.

Required spans: `billing.webhook.verify`, `billing.webhook.process`, `billing.entitlement.derive`, `billing.seats.reconcile`, `billing.checkout.create`, `billing.portal.create`, `run.accept`, `event.replay`, and `output.publish`. Propagate correlation ID, organization ID (internal), event type, deployment version, and outcome. Hash or omit provider/customer IDs.

Required metrics include webhook invalid/duplicate/stale/failure counts; entitlement states; seat mismatch age/count; checkout/portal failure rate; API error/latency; run acceptance/replay latency; queue age; completion/cancellation/stall rates; accepted-output rate; and cost per run/output/active seat/org.

Before pilot, assign an owner and paging destination, set measured alert thresholds, verify source maps/release labels, test redaction with synthetic secrets, verify trace continuity, and capture dashboard links. No public availability or SLA commitment exists until measured objectives are approved.
