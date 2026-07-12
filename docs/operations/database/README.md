# Database operations

The Supabase database is a canonical production build, not an evolved prototype
database. Its controlled WorkOS bootstrap records mean it is no longer empty.
Start with:

- [Phase 2 canonical data plane](phase2-canonical-data-plane.md)
- [Rollback and recovery](rollback-and-recovery.md)
- [Service-table advisor cleanup](advisor-service-table-policies.md)

Source of truth:

- `supabase/migrations/*.sql`, ordered by timestamp
- `supabase/tests/database/phase2_security.sql`
- `scripts/database/Test-CanonicalDatabase.ps1`
- `packages/database-types/src/database.types.ts`

Never replay SQL from `old-docs/` or from historical commits directly against
the linked project.

Current read-only evidence (2026-07-12): project
`vffndfwdykxqjlnntuuk` has seven applied migrations through
`20260712004658_cover_product_record_scope_foreign_keys`, 26 public tables, RLS
enabled on all 26, and no security-advisor findings. Production authentication
has since created one controlled profile, organization, and Owner membership,
so the earlier all-empty row snapshot is no longer current. The local
Supabase CLI session is unauthorized; MCP and the PostgreSQL 17 replay provide
current evidence, but the CLI/MCP agreement gate remains open.
