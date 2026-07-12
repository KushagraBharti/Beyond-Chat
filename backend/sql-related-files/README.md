# Database schema source of truth

The historical SQL snapshots in this directory were transitional prototype
artifacts and have been removed. They must not be replayed.

The only canonical database history is:

- `supabase/migrations/20260711130000_canonical_identity_and_multitenancy.sql`
- `supabase/migrations/20260711131500_advisor_hardening.sql`
- `supabase/migrations/20260711232043_reconcile_workos_rls_contract.sql`

Create every future schema change as a new timestamped file under
`supabase/migrations/`. Do not mirror migrations into this directory.

The reconciliation migration is additive and idempotent. It preserves the
already-applied baseline migration while converging production and clean replay
on the canonical WorkOS issuer, organization-claim, and Member project-creation
RLS behavior.
