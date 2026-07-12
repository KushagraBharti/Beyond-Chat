# Pilot and feature flags

Flags are server-authoritative, organization-scoped, auditable, default-off, and reversible. Required flags: `billing_v2_api`, `paid_checkout`, `billing_portal`, `seat_reconciliation_apply`, `organization_onboarding_v2`, and provider/agent kill switches. Client flags affect presentation only. Entitlement checks remain server-side even when a UI flag is on.

Pilot entry requires a named customer owner, support owner, data boundaries, enabled capabilities, budget, rollback trigger, and explicit acknowledgement of beta limitations. Expand cohorts only after review.

Pilot success metrics: ≥90% invited-user onboarding without engineering; ≥80% first reviewable output within one business day; ≥95% run acceptance without manual restart; ≥99% replay recovery; ≥70% output acceptance; zero cross-tenant access; zero duplicate consequential actions; 100% billing event reconciliation; support first response within the pilot target; and expected provider COGS ≤30% of recognized seat revenue. Targets are internal hypotheses until measured.

Stop expansion on any tenant isolation incident, entitlement without verified subscription, unbounded cost, unrecoverable data loss, repeated duplicate external action, or inability to roll back.
