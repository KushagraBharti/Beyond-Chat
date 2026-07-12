# Billing activation and failure runbook

## Safe defaults

- `BILLING_V2_ENABLED` is false unless explicitly set to `true`.
- `STRIPE_BILLING_V2_LIVEMODE` is false unless explicitly set to `true`; mode-mismatched events are retained as ignored evidence and never change subscription or entitlement state.
- `BILLING_V2_CHECKOUT_ACTIVATED` is false unless an operator has completed and witnessed the activation gates below. Enabling billing and configuring a price ID alone cannot enable checkout.
- The v2 router is not mounted by this phase.
- Price display is a target; only a server-verified subscription event can create entitlement.
- Browser query parameters, checkout redirects, client metadata, and portal state never grant access.
- Billable seats are active organization memberships under the approved seat policy. The client cannot submit quantity.

## Activation gates

1. Owner verifies the Stripe account can accept payments and documents immutable account identity.
2. Authorized operator creates exactly one Beyond product and recurring USD monthly price at $30 per user. Record IDs in secret/config stores, never docs.
3. Configure a dedicated webhook endpoint/secret and subscribe only to required subscription/invoice events.
4. Implement persistent billing-event, subscription, entitlement, and seat-snapshot adapters with tenant tests.
5. Replay fixture events, duplicates, test/live mode mismatches, stale ordering, invalid signatures, expired timestamps, processor failures, subscription deletion, `past_due`, and `unpaid`.
6. Mount behind `billing_v2_api` and `paid_checkout` flags. Enable internal organization only. Set `BILLING_V2_CHECKOUT_ACTIVATED=true` only after the preceding gates pass, and unset it immediately to stop new checkout sessions.
7. Execute a controlled live checkout, invoice, portal visit, payment failure, cancellation, charge, and refund. Compare Stripe state to the internal ledger.
8. Witness seat reconciliation in dry-run, then enable apply mode with idempotency and alerts.

## Failure handling

Signature failures return 400 without persistence. Processor failures retain a retryable failed-event record and alert; they must not acknowledge success. Duplicate event IDs are inert. Older provider events cannot overwrite newer state. `unpaid`, `canceled`, `paused`, incomplete, missing, or unverifiable subscriptions disable access. Decide and document a time-bounded `past_due` grace policy before enabling it; the foundation grants none.

If reconciliation differs, stop automatic quantity writes, preserve both counts, identify membership/provider lag, repair the authoritative source, replay using a stable idempotency key, and compare the next invoice. Never delete evidence to force a match.
