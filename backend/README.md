# Beyond Chat Backend

FastAPI backend for Beyond Chat, built around a hybrid local-first workflow:

- local SQLite-backed persistence for rapid development
- Supabase-aware environment and JWT wiring for production hardening
- provider abstractions for OpenRouter, Tavily, Google Calendar, and storage-oriented setup

## Environment setup

Copy `backend/env.example` to `backend/.env`.

### Minimum local-first configuration

- `ALLOW_LOCAL_AUTH_BYPASS=true`
- `LOCAL_WORKSPACE_ID`
- `LOCAL_WORKSPACE_NAME`

This keeps the protected app usable before Supabase, storage, and provider credentials are fully wired.

### Provider / production configuration

- `OPENROUTER_API_KEY`
- `TAVILY_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_JWKS_URL`
- `SUPABASE_STORAGE_BUCKET`

## Run locally

From this `backend` directory:

```powershell
uv sync
uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

## Primary routes

- `GET /api/health`
- `POST /api/auth/bootstrap`
- `GET /api/workspace`
- `GET /api/status/providers`
- `GET /api/chat/threads`
- `POST /api/chat/threads`
- `POST /api/chat/threads/{thread_id}/messages`
- `POST /api/chat/compare`
- `POST /api/runs`
- `GET /api/runs/{run_id}`
- `GET /api/runs/{run_id}/steps`
- `POST /api/artifact`
- `GET /api/artifact/search`
- `GET /api/artifact/{artifact_id}`
- `POST /api/artifact/{artifact_id}/export`
- `POST /api/storage/artifacts/upload`
- `POST /api/storage/artifacts/signed-url`

## Validation

- Health: `GET http://127.0.0.1:8000/api/health`
- Tests: `uv run pytest`
