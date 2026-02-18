# Beyond Chat Backend

Minimal backend scaffold using **uv + FastAPI + Uvicorn**.

## Run locally

From this `backend` directory:

```powershell
uv sync
uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

`GET http://127.0.0.1:8000/api/health`
