# Beyond Chat Backend

FastAPI backend for Beyond Chat.

The backend now has two persistence modes:

- hosted/runtime mode: Supabase Auth + Postgres + Storage
- development fallback mode: local SQLite only for local bypass and test-style sessions

The hosted runtime path is the intended production path for:

- workspace lookup/bootstrap
- chat collections, threads, and messages
- artifacts
- runs and run steps
- reminders

## Environment Setup

Copy `backend/env.example` to `backend/.env`.

### Required for hosted/runtime mode

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`
- `SUPABASE_STORAGE_BUCKET`

### Optional providers

- `OPENROUTER_API_KEY`
- `TAVILY_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

### Development-only fallback

- `ALLOW_LOCAL_AUTH_BYPASS=true`
- `LOCAL_WORKSPACE_ID`
- `LOCAL_WORKSPACE_NAME`

When a request is authenticated with a Supabase JWT, the backend uses the Supabase/Postgres runtime path.
When a request is using local bypass, the backend can still fall back to the legacy local SQLite store for local-only work.

## Run Locally

```powershell
cd backend
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
uv sync
uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

## Primary Routes

- `GET /api/health`
- `POST /api/auth/bootstrap`
- `GET /api/workspace`
- `GET /api/reminders`
- `GET /api/status/providers`
- `GET /api/chat/threads`
- `POST /api/chat/threads`
- `GET /api/chat/threads/{thread_id}`
- `POST /api/chat/threads/{thread_id}/messages`
- `POST /api/chat/compare`
- `POST /api/runs`
- `GET /api/runs/{run_id}`
- `GET /api/runs/{run_id}/steps`
- `POST /api/runs/{run_id}/artifact`
- `POST /api/artifact`
- `GET /api/artifact/search`
- `GET /api/artifact/{artifact_id}`
- `POST /api/artifact/{artifact_id}/export`
- `POST /api/storage/artifacts/upload`
- `POST /api/storage/artifacts/signed-url`

## Canonical Schema

Use the SQL files in `backend/sql-related-files/` as the source of truth for the hosted runtime schema.

Current hosted runtime coverage:

- workspaces and memberships
- chat tables
- integration tables
- artifacts, runs, run steps
- reminders
- RLS and storage policies

## Validation

- Health: `GET http://127.0.0.1:8000/api/health`
- Tests: `uv run pytest`

## Notes

- `src/runtime_store.py` selects the active persistence layer
- `src/store.py` is now a legacy fallback for local bypass only
- `src/supabase_service.py` handles workspace bootstrap and storage helpers
