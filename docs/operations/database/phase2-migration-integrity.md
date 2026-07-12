# Phase 2 migration-integrity repair

## Scope and target proof

This repair is prepared for `Beyond Chat Production`, project ref
`vffndfwdykxqjlnntuuk`. The connected MCP reported the exact API origin
`https://vffndfwdykxqjlnntuuk.supabase.co` before the read-only audit.

No remote DDL or migration-history mutation was performed. The production
database and the pre-reset backup described in
`phase2-canonical-data-plane.md` were left untouched.

## Pre-apply audit

On 2026-07-11, read-only catalog queries reported:

- applied migrations: `20260711130000` and `20260711131500`;
- 15 public tables, all with RLS enabled and all empty;
- zero Supabase security-advisor findings;
- `app_private.jwt_issuer()` compared the issuer without removing a trailing
  slash;
- `app_private.is_organization_context(uuid)` allowed a missing organization
  claim to fall back to any target organization with a matching membership;
- `public.projects` policy `projects_insert` allowed Owner, Admin, and Builder,
  but not Member.

The local baseline already contains the desired definitions. Editing an
already-applied migration cannot safely update production, so migration
`20260711232043_reconcile_workos_rls_contract.sql` re-applies exactly those
three definitions:

1. normalize the WorkOS issuer by removing trailing `/` characters;
2. require a non-null selected organization claim before organization context
   can authorize access;
3. include Member in the project-create role matrix while retaining the
   `created_by = current_profile_id()` and selected-organization checks.

The function replacements and policy drop/create run in one transaction. The
function signatures, security modes, fixed search paths, ownership, grants,
table grants, and all unrelated policies remain unchanged. Reapplying the file
is safe because both functions use `create or replace` and the policy uses
`drop policy if exists` before recreation.

## Local generation note

Supabase CLI `2.109.0` was asked to create the migration with
`supabase migration new reconcile_workos_rls_contract`. In this OneDrive
checkout it failed before creating a file with `LegacyMigrationNewWriteError`
because it treated the existing `supabase/migrations` directory as an
`AlreadyExists` error. The timestamped file was therefore created manually in
the CLI's standard format.

## Validation and apply gate

Validation completed before handoff:

- PostgreSQL 17.10 parsed and replayed all three migrations twice from the
  compatibility bootstrap;
- the adversarial database suite passed twice, including the new definition
  assertions and issuer/missing-claim/Member behavior;
- final local inventory was 15 public tables, 15 RLS-enabled tables, zero
  public functions, four Storage policies, and seven Realtime tables;
- the additive migration was reapplied twice to the resulting schema and the
  adversarial suite passed again;
- `supabase db lint --linked --level warning --fail-on error` reported no
  schema errors after an exact linked-ref check;
- `supabase migration list` showed `20260711130000` and `20260711131500`
  matched locally/remotely, with only `20260711232043` local/pending;
- the final read-only MCP audit still showed only the two existing remote
  migrations, zero public rows, the three old definitions, and zero security
  advisor findings, proving this preparation did not mutate production.

Apply only after independently proving the linked ref is
`vffndfwdykxqjlnntuuk`. Use the normal reviewed migration workflow; do not edit
or repair the two applied history rows. After apply, repeat the catalog audit,
adversarial RLS suite, table/row inventory, and security advisor.

## Rollback

Preferred rollback is a new forward migration restoring the three definitions
captured in the pre-apply audit: exact issuer comparison, the missing-claim
membership fallback, and the Owner/Admin/Builder-only project insert policy.
Do not remove or rewrite an applied migration-history row. Because rollback of
the missing-claim fallback weakens tenant isolation, use it only for an
identified compatibility emergency and follow it immediately with a corrected
forward migration.
