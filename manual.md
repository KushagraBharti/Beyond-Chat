# Manual Setup Guide

This file covers setup tasks that must still be completed outside the repo.

## 1. Apply The Canonical Supabase SQL

Run the SQL files in `backend/sql-related-files/` in order.

Treat that directory as the live schema source of truth.

The current hosted Supabase project was intentionally wiped/rebuilt from this canonical SQL on May 4, 2026 because project data was disposable. The rebuilt schema was applied through linked Supabase SQL/MCP access because the Supabase CLI temp-login path hit a remote `cli_login_postgres` circuit breaker.

The hosted project has these applied migrations mirrored locally under `supabase/migrations/` with the remote-recorded versions:

- `20260226175054_initial_schema.sql`
- `20260226175754_artifacts_and_runs.sql`
- `20260402205948_000_workspace_membership_schema.sql`
- `20260402210012_001_users_workspaces_members.sql`
- `20260402210048_002_chat_tables.sql`
- `20260402210101_003_integrations_tables.sql`
- `20260402210116_004_artifacts_runs_steps_base.sql`
- `20260402210127_005_run_extensions.sql`
- `20260402210137_006_artifact_extensions.sql`
- `20260402210203_007_rls_policies.sql`
- `20260402211436_apply_008_storage_setup.sql`
- `20260402211606_apply_008_storage_setup.sql`
- `20260402213319_009_cleanup_and_fixes.sql`
- `20260504043106_20260504025126_allow_excel_artifact_uploads.sql`
- `20260504043124_20260504030340_profile_scoped_artifacts_runs.sql`
- `20260504043209_20260504030956_billing_rls_and_rpc_hardening.sql`
- `20260504043656_usage_events_policy_and_reminders_index.sql`
- `20260504063424_revoke_authenticated_security_definer_rpc.sql`
- `20260504071000_direct_membership_rls.sql`

Do not treat `supabase/migrations/` as the canonical current runtime schema without also checking `backend/sql-related-files/`.

## 2. Configure Supabase Auth

In the Supabase dashboard:

1. Add local and deployed frontend URLs
2. Confirm redirect URLs include your login/signup callback flow
3. Decide whether email confirmation is enabled for the environment

Required auth/runtime env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`

## 3. Configure Backend Environment

Copy `backend/env.example` to `backend/.env` and set:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`
- `OPENROUTER_API_KEY`
- `EXASEARCH_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## 4. Configure Frontend Environment

Copy `frontend/env.example` to `frontend/.env.local` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 5. Create The Storage Bucket

Create/verify the private `artifacts` and `user-uploads` buckets in Supabase Storage. The canonical SQL upserts both buckets and their storage policies.

Recommended path conventions:

- file uploads: `workspace_id/artifact_id/...`
- generated images: `workspace_id/images/run_id/...`

Then confirm:

1. the bucket names are `artifacts` and `user-uploads`
2. signed URLs work
3. workspace path isolation is enforced

## 6. Local Runtime Validation

Backend:

```powershell
cd backend
uv sync
uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

## 7. Google Calendar OAuth

If you want the Google Calendar flow to work:

1. enable the Google Calendar API
2. create OAuth credentials
3. add backend callback URLs
4. set:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

## 8. OpenRouter And Exa

Add:

- `OPENROUTER_API_KEY`
- `EXASEARCH_API_KEY`

Then verify:

- chat requests
- compare runs
- research runs
- finance runs

## 9. Production Checks

Before deployment:

1. verify Supabase JWT-protected backend access with a real user session
2. confirm workspace bootstrap creates or resolves membership correctly
3. confirm chat, artifacts, runs, reminders, and storage all persist in Supabase
4. confirm compare works from its shared panel entry points
5. confirm artifact export works behind auth
