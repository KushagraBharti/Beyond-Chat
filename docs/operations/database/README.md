# Database operations

The Supabase database is an empty-production canonical build, not an evolved
prototype database. Start with:

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
