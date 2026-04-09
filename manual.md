# Manual Setup Guide

This file lists the human-run setup tasks that are still required outside the codebase.

## 1. Apply the Canonical Supabase SQL

Run these files in the Supabase SQL editor in this order:

1. `backend/sql-related-files/000_workspace_membership_schema.sql`
2. `backend/sql-related-files/001_users_workspaces_members.sql`
3. `backend/sql-related-files/002_chat_tables.sql`
4. `backend/sql-related-files/003_integrations_tables.sql`
5. `backend/sql-related-files/004_artifacts_runs_steps_base.sql`
6. `backend/sql-related-files/005_run_extensions.sql`
7. `backend/sql-related-files/006_artifact_extensions.sql`
8. `backend/sql-related-files/007_rls_policies.sql`
9. `backend/sql-related-files/008_storage_setup.sql`
10. `backend/sql-related-files/009_cleanup_and_fixes.sql`
11. `backend/sql-related-files/010_reminders_runtime.sql`

Why this order matters:

- workspace and membership tables must exist before workspace-scoped tables and policies
- the workspace bootstrap function and auth trigger must exist before real users sign in
- chat, artifacts, runs, and run_steps must exist before extension columns and RLS
- storage policies rely on workspace helper functions
- reminders are now a workspace-scoped hosted table and must be created before the dashboard uses them

Important:

- Treat `backend/sql-related-files/` as the canonical schema source for the hosted runtime
- Do not rely on `backend/supabase/migrations/` as the source of truth for the current app state

## 2. Supabase Auth Configuration

In the Supabase dashboard:

1. Open `Authentication -> URL Configuration`
2. Add your local frontend URL and deployed frontend URL
3. Confirm redirect URLs include:
   - `http://127.0.0.1:5173`
   - your deployed frontend URL
4. Decide whether email confirmation should be enabled for your environment

Required auth/runtime env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_JWKS_URL`

## 3. Backend Environment Setup

Copy `backend/env.example` to `backend/.env` and fill:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`
- `SUPABASE_STORAGE_BUCKET`
- `OPENROUTER_API_KEY`
- `TAVILY_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Development-only settings:

- `ALLOW_LOCAL_AUTH_BYPASS=true` for local bypass work
- `ALLOW_LOCAL_AUTH_BYPASS=false` for hardened or hosted environments

Hosted runtime note:

- The backend now expects Supabase/Postgres to be the live persistence path for workspaces, chat, artifacts, runs, run steps, and reminders
- SQLite is no longer the intended hosted data store

## 4. Frontend Environment Setup

Copy `frontend/env.example` to `frontend/.env.local` and fill:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` if frontend and backend are not on the default local proxy path

Development-only:

- `VITE_ENABLE_MVP_BYPASS=true` when you want bypass mode locally
- `VITE_ENABLE_MVP_BYPASS=false` when you want full auth enforcement

## 5. Supabase Storage Bucket

Create the `artifacts` bucket in Supabase Storage or confirm that it already exists.

Recommended configuration:

- Bucket name: `artifacts`
- Access: private
- Upload path convention for files: `workspace_id/artifact_id/...`
- Upload path convention for generated images: `workspace_id/images/run_id/...`

Then:

1. Execute `backend/sql-related-files/008_storage_setup.sql`
2. Confirm the bucket name matches `SUPABASE_STORAGE_BUCKET`
3. Confirm signed URL generation works for paths inside the active workspace

## 6. Local Runtime Validation

Backend:

```powershell
cd backend
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
uv sync
uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
bun install
bun run dev --host 127.0.0.1 --port 5173
```

## 7. Google Calendar OAuth

This integration is still partial, but if you want the connect flow to open correctly you still need Google OAuth credentials.

In Google Cloud Console:

1. Create or choose a project
2. Enable the Google Calendar API
3. Create OAuth credentials
4. Add backend redirect URIs:
   - `http://127.0.0.1:8000/api/integrations/google-calendar/callback`
   - your deployed backend callback URL
5. Copy:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

## 8. OpenRouter and Tavily

Generate and add:

- `OPENROUTER_API_KEY`
- `TAVILY_API_KEY`

Verify by:

- testing chat or compare against OpenRouter
- testing research/finance runs with Tavily enabled

## 9. Production Deployment Checks

Before production:

1. Disable local bypass on frontend and backend
2. Verify JWT-protected backend routes with a real Supabase session
3. Confirm `public.ensure_workspace_for_user(...)` and the `auth.users` trigger create rows in:
   - `user_profiles`
   - `workspaces`
   - `workspace_members`
4. Confirm new authenticated users can enter the dashboard with an empty workspace
5. Confirm chat, artifacts, runs, and reminders are persisting in Supabase/Postgres
6. Confirm artifact export works behind auth
7. Confirm storage uploads work against the `artifacts` bucket

## 10. Recommended Verification Flow

After setup is complete:

1. Sign up a new user
2. Confirm a workspace and workspace member row are created
3. Log in again and verify session persistence
4. Create a chat thread and send a message
5. Create a writing document, save it, reopen it, and confirm rich content loads back
6. Run research or finance and save the output as an artifact
7. Run compare mode and save one result as an artifact
8. Export an artifact as Markdown and PDF
9. Generate an image if provider/storage credentials are configured
