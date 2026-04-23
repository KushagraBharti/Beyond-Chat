# Current Blockers

## External / Manual Blockers

- Supabase SQL migrations have to be executed manually in the target project.
- Supabase Storage bucket creation and policy setup are manual dashboard tasks.
- Google Calendar OAuth configuration requires Google Cloud Console access.
- OpenRouter and Exa credentials are required to verify live provider flows.
- Production JWT verification depends on either the real `SUPABASE_JWT_SECRET` or the project JWKS URL from the deployed Supabase project.
- A fresh Bun reinstall on this OneDrive-backed workspace produced incomplete local package entry files, so frontend `bun run build` and `bun run test` could not be rerun after the final patch set even though the previously built frontend bundle remained available for browser QA.

## What Is Not Blocked In-Repo

- The code paths, SQL assets, route structure, and setup docs now exist in the repository.
- Local-first development can continue without waiting on all production credentials.
