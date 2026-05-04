# Current Blockers

## External / Manual Blockers

- Future Supabase SQL migrations should use the checked-in `supabase/migrations/` history after the remote `cli_login_postgres` circuit breaker clears or after `SUPABASE_DB_PASSWORD` is set for direct CLI access.
- The linked Supabase app schema was intentionally wiped and rebuilt from the canonical SQL in `backend/sql-related-files/` on May 4, 2026 because project data was disposable.
- The previous missing-local migration drift was reconciled locally by adding migration files for the older remote-recorded versions. Remote migration history now also includes `20260504071000_direct_membership_rls`.
- Supabase CLI temporary login still hit a remote auth circuit breaker after repeated failed `cli_login_postgres` attempts; the CLI says to set `SUPABASE_DB_PASSWORD` for direct database connection until that path is healthy again.
- The storage MIME, profile-scoped artifacts/runs, billing/RPC hardening, reminders FK index, SECURITY DEFINER authenticated RPC hardening, and direct-membership RLS repair are applied to the linked project and mirrored locally.
- Supabase security advisor now reports only leaked-password protection disabled. This requires project-owner dashboard action.
- Supabase performance advisor now reports only unused indexes. Review unused indexes after representative production traffic exists rather than dropping them during low/no-data development.
- Google Calendar OAuth configuration requires Google Cloud Console access.
- OpenRouter and Exa credentials are required to verify live provider flows.
- Production JWT verification depends on either the real `SUPABASE_JWT_SECRET` or the project JWKS URL from the deployed Supabase project.
- Frontend `bun run lint`, `bun run test`, and `bun run build` pass locally after the final patch set.

## What Is Not Blocked In-Repo

- The code paths, SQL assets, route structure, and setup docs now exist in the repository.
- Local-first development can continue without waiting on all production credentials.
