# Manual Setup Guide

This file lists the human-run tasks that cannot be completed entirely from the repository.

## 1. Supabase SQL Execution

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

Why this order:

- workspace tables must exist before workspace-scoped tables and policies
- the workspace bootstrap function and auth trigger must run immediately after the base workspace schema
- artifacts and runs must exist before the extension and policy layers
- storage policies should run only after the workspace RLS helpers exist

## 2. Supabase Auth Configuration

In the Supabase dashboard:

1. Open `Authentication -> URL Configuration`.
2. Add the production site URL and local URL.
3. Confirm redirect URLs include:
   - `http://127.0.0.1:5173`
   - deployed frontend URL
4. Decide whether email confirmation should be enabled.

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_JWKS_URL`

## 3. Backend Environment Setup

Copy `backend/env.example` to `backend/.env` and fill:

- `ALLOW_LOCAL_AUTH_BYPASS=true` for local-first work
- `ALLOW_LOCAL_AUTH_BYPASS=false` for hardened environments
- `OPENROUTER_API_KEY`
- `TAVILY_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- Supabase variables listed above

## 4. Frontend Environment Setup

Copy `frontend/env.example` to `frontend/.env` and fill:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` if frontend and backend are not using the default local proxy path
- `VITE_ENABLE_MVP_BYPASS=false` when you want full auth enforcement

## 5. Supabase Storage Bucket

Create the `artifacts` bucket manually in Supabase Storage.

Suggested configuration:

- Bucket name: `artifacts`
- Access: private
- Upload path convention: `workspace_id/artifact_id/...`

Recommended follow-up:

- Execute `backend/sql-related-files/008_storage_setup.sql`.
- Confirm storage object paths follow `workspace_id/artifact_id/file-name.ext`.
- Add storage RLS/policies so only workspace members can access their own files.
- Confirm the backend `SUPABASE_STORAGE_BUCKET` value matches the bucket name.

## 5.5. Backend Runtime for Validation

Use Python 3.11 for local backend validation to match the dependency graph used by the repo:

```powershell
cd backend
$env:UV_PROJECT_ENVIRONMENT=".uv311-test-env"
uv sync --python 3.11 --link-mode copy
uv run --python 3.11 uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

## 6. Google Calendar OAuth

In Google Cloud Console:

1. Create a project or use an existing one.
2. Enable the Google Calendar API.
3. Create OAuth credentials.
4. Add the backend redirect URI:
   - `http://127.0.0.1:8000/api/integrations/google-calendar/callback`
   - production backend callback if applicable
5. Copy:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

## 7. OpenRouter and Tavily

Generate and add:

- `OPENROUTER_API_KEY`
- `TAVILY_API_KEY`

Verify by:

- testing chat/compare against OpenRouter
- testing research/finance search against Tavily

## 8. Production Deployment Checks

Before production:

1. Disable local auth bypass on frontend and backend.
2. Verify JWT-protected backend routes with a real Supabase session.
3. Confirm `public.ensure_workspace_for_user(...)` and the `auth.users` trigger insert rows into:
   - `user_profiles`
   - `workspaces`
   - `workspace_members`
4. Confirm artifact export works behind auth.
5. Confirm storage uploads work against the created bucket.

## 9. Recommended Verification Flow

After manual setup is complete:

1. Sign up a new user.
2. Confirm a workspace and workspace member row are created.
3. Log in again and verify session persistence.
4. Save an artifact and confirm it appears in the library.
5. Export the artifact as Markdown and PDF.
6. Upload a file and confirm it lands under `workspace_id/artifact_id/...`.
7. Run compare mode with real model credentials.
8. Run research and finance with Tavily enabled.
9. Verify Google Calendar connect flow opens correctly.
