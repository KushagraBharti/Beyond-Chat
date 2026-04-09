# Beyond Chat Backend

FastAPI backend for Beyond Chat.

## Canonical Runtime

- Auth: Supabase JWT-backed request context
- Database: Supabase Postgres
- Storage: Supabase Storage
- Model provider: OpenRouter
- Search provider: Tavily

Hosted runtime data covers:

- workspace lookup and bootstrap
- chat collections, threads, and messages
- artifacts
- runs and run steps
- reminders
- storage upload and signed URL flows

## Environment

Copy `env.example` to `.env`.

Required:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`
- `SUPABASE_STORAGE_BUCKET`

Optional providers:

- `OPENROUTER_API_KEY`
- `TAVILY_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

## Run Locally

```powershell
cd backend
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

## Schema Source

Use `backend/sql-related-files/` as the live schema source of truth.

## Validation

```powershell
uv run pytest
```

## Notes

- `src/runtime_store.py` is the hosted runtime data access layer
- `src/store.py` remains only as a legacy local test store
- `src/supabase_service.py` handles workspace bootstrap and storage helpers
