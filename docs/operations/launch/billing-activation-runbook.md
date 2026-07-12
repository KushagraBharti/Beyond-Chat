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

## Implementation status (2026-07-12)

Everything code-side for gates 3–6 and 8 now exists and is contract-tested
(`backend/tests/test_billing_v2_activation.py`, 8 tests; plus the original
webhook/processor suite):

- Stripe checkout, portal, and seat-quantity adapters (`billing_v2/adapters.py`)
  call the installed SDK off-thread with per-call API keys and idempotency keys.
- Billable seats come only from active canonical memberships
  (`SupabaseMembershipCounter`); the client can never submit a quantity.
- Billing routes resolve the WorkOS principal through the canonical identity
  plane (`workos_principal_resolver`) — role and organization are re-read from
  the database on every request.
- Seat reconciliation (`billing_v2/reconciliation.py`) is one-directional
  (canonical members → Stripe quantity), idempotent
  (`seats:<subscription>:<quantity>` keys), never reconciles to zero, and never
  touches canceled/unpaid subscriptions.
- The v2 router IS now mounted (`main.py`), safe because every route fails
  closed on the activation flags, and the composition root **refuses to boot**
  with `BILLING_V2_ENABLED=true` outside dev/test until gate M1 lands.
- Frontend: `/settings` shows a server-truth billing panel (disabled, grace,
  enabled, failure, and permission-denied states; controls render only when
  the backend reports them available).
- Observability: `init_observability()` activates Sentry and OTel when the
  corresponding env vars are set and the SDKs are installed; disabled and
  truthfully reported otherwise. Neither SDK is a hard dependency.

## Gate M1 — required migration (central integration)

Durable billing persistence is the one missing code artifact, and migrations
are centrally owned. Required tables (service-role only, deny client access,
matching `BillingRepository`):

- `billing_events(id, provider, event_id unique, event_type, livemode,
  payload jsonb, state pending|processed|failed, failure_reason, created_at,
  processed_at)` — idempotent inbox semantics identical to `webhook_inbox`.
- `billing_subscriptions(organization_id pk/fk, customer_id, subscription_id,
  status, quantity, provider_event_created bigint, current_period_end,
  updated_at)` — newest-event-wins guarded by `provider_event_created`.
- `billing_entitlements(organization_id pk/fk, state enabled|grace|disabled,
  reason, source_subscription_id, updated_at)`.

After the migration: implement `SupabaseBillingRepository` against these
tables (the in-memory adapter in `billing_v2/adapters.py` is the executable
contract), swap it into `composition.py`, and delete the boot guard.

## Human-only launch checklist (no agent can perform these)

1. Stripe: complete business verification on the intended account
   (`acct_1TrlgVQ1UUFrv64i`); replace the wrong-account local key.
2. Stripe dashboard/CLI: create the live Beyond product + $30/user/month USD
   recurring price; store the price ID as `STRIPE_BILLING_V2_PRICE_ID` in
   Vercel (sensitive).
3. Register `https://beyond-chat-backend.vercel.app/api/v2/billing/webhooks/stripe`
   for `customer.subscription.*` events; store the signing secret as
   `STRIPE_BILLING_V2_WEBHOOK_SECRET`.
4. Controlled live charge + refund with a real card (gate 7); witness the
   webhook → entitlement path in production data.
5. Legal: finalize Terms/Privacy from the draft surfaces; verify every public
   connector/model claim against `docs/product/phase5-8-product-plane.md`.
6. Transactional email + domain/DNS; Sentry DSN + OTel endpoint provisioning.
7. Drills against production: backup/restore, incident, deployment rollback
   (runbooks exist under docs/operations; each needs a witnessed execution).
8. 500-seat load test against production (generators exist under
   scripts/load-testing) and unit-economics recalculation from the pilot's
   actual usage (scripts/cost) before confirming the $30 price.
9. Design-partner pilot with feature flags.
