# Manual Setup Guide

This file covers setup tasks that must still be completed outside the repo.

## 1. Apply The Canonical Supabase SQL

Run the SQL files in `backend/sql-related-files/` in order.

Treat that directory as the live schema source of truth.

Do not treat `backend/supabase/migrations/` as canonical for the current runtime.

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

Create the private `artifacts` bucket in Supabase Storage.

Recommended path conventions:

- file uploads: `workspace_id/artifact_id/...`
- generated images: `workspace_id/images/run_id/...`

Then confirm:

1. the bucket name is `artifacts`
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
