# Current Blockers

## External / Manual Blockers

- Future Supabase SQL migrations should not rely on CLI push until the older remote/local migration-history drift is repaired.
- Supabase CLI migration history is still drifted for the older remote baseline. `npx supabase db push --dry-run` still refuses because remote has `20260226175054`, `20260226175754`, and `20260402205948` through `20260402213319` that are not represented in the local migration directory; reconcile with `supabase migration repair` plus `supabase db pull` before relying on future CLI pushes.
- Supabase CLI temporary login also hit a remote auth circuit breaker after repeated failed `cli_login_postgres` attempts; the CLI says to set `SUPABASE_DB_PASSWORD` for direct database connection until that path is healthy again.
- The pending storage MIME, profile-scoped artifacts/runs, billing/RPC hardening, and reminders FK index migrations have been applied to the linked project through Supabase MCP and mirrored locally under the remote-recorded migration versions.
- Supabase security advisor still reports authenticated SECURITY DEFINER execution on workspace helper functions and leaked-password protection disabled. Authenticated helper execution is currently required by workspace bootstrap/RLS helper paths; leaked-password protection requires project-owner dashboard action.
- Supabase performance advisor now reports only unused indexes. Review unused indexes after representative production traffic exists rather than dropping them during low/no-data development.
- Google Calendar OAuth configuration requires Google Cloud Console access.
- OpenRouter and Exa credentials are required to verify live provider flows.
- Production JWT verification depends on either the real `SUPABASE_JWT_SECRET` or the project JWKS URL from the deployed Supabase project.
- A fresh Bun reinstall on this OneDrive-backed workspace produced incomplete local package entry files, so frontend `bun run build` and `bun run test` could not be rerun after the final patch set even though the previously built frontend bundle remained available for browser QA.

## What Is Not Blocked In-Repo

- The code paths, SQL assets, route structure, and setup docs now exist in the repository.
- Local-first development can continue without waiting on all production credentials.
