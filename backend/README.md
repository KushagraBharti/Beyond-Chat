# Beyond Chat Backend

Minimal backend scaffold using **uv + FastAPI + Uvicorn**.

## Environment setup

Copy `backend/env.example` to `backend/.env` and fill at least:

- `OPENROUTER_API_KEY` for `/api/openrouter/chat`

Optional:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Run locally

From this `backend` directory:

```powershell
uv sync
uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

`GET http://127.0.0.1:8000/api/health`

OpenRouter chat proxy:

`POST http://127.0.0.1:8000/api/openrouter/chat`
