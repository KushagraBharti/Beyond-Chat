# Current Blockers

## External / Manual Blockers

- Full application-level rate-limit enforcement still needs a final backend middleware pass if the project wants hard quota blocking by plan. The database has usage-event storage and billing status groundwork, and providers expose rate-limit errors, but enforcement should not be overstated unless middleware is enabled.
- There is no custom load balancer in the repository. Production scalability relies on Vercel-managed routing/serverless concurrency and Supabase-managed database/storage capacity.
- Future Supabase SQL migrations should use the checked-in `supabase/migrations/` history after the remote `cli_login_postgres` circuit breaker clears or after `SUPABASE_DB_PASSWORD` is set for direct CLI access.
- The linked Supabase app schema was intentionally wiped and rebuilt from the canonical SQL in `backend/sql-related-files/` on May 4, 2026 because project data was disposable.
- The previous missing-local migration drift was reconciled locally by adding migration files for the older remote-recorded versions. Remote migration history now also includes `20260504071000_direct_membership_rls`.
- Supabase CLI temporary login still hit a remote auth circuit breaker after repeated failed `cli_login_postgres` attempts; the CLI says to set `SUPABASE_DB_PASSWORD` for direct database connection until that path is healthy again.
- The storage MIME, profile-scoped artifacts/runs, billing/RPC hardening, reminders FK index, SECURITY DEFINER authenticated RPC hardening, and direct-membership RLS repair are applied to the linked project and mirrored locally.
- Supabase security advisor now reports only leaked-password protection disabled. This requires project-owner dashboard action.
- Supabase performance advisor now reports only unused indexes. Review unused indexes after representative production traffic exists rather than dropping them during low/no-data development.
- Google Calendar OAuth configuration requires Google Cloud Console access.
- OpenRouter, Exa, Financial Datasets, and optional X credentials are required to verify every live provider path.
- Stripe credentials and webhook configuration are required to verify live checkout, portal, and subscription persistence.
- Production JWT verification depends on either the real `SUPABASE_JWT_SECRET` or the project JWKS URL from the deployed Supabase project.
- Frontend validation should use npm by default: `npm run lint`, `npm run test`, and `npm run build`.
- Data Studio live analysis requires both Supabase Storage and OpenRouter credentials; upload preview can be validated with storage alone.
- Sandbox runner production validation requires `DEXTER_RUNNER_SHARED_SECRET`, OpenRouter, and Financial Datasets credentials.

## What Is Not Blocked In-Repo

- The code paths, SQL assets, route structure, and setup docs now exist in the repository.
- Local-first development can continue without waiting on all production credentials.
- Provider-disconnected UI states can be validated without live provider credentials.
