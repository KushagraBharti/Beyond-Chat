# Beyond Chat Backend

FastAPI backend for Beyond Chat.

## Canonical Runtime

- Auth: Supabase JWT-backed request context
- Database: Supabase Postgres
- Storage: Supabase Storage
- Model provider: OpenRouter
- Search provider: Exa
- Finance agent runtime: `dexter/`
- Vercel Sandbox runner: `sandbox-runner/`
- Billing: Stripe-backed billing router
- Data parsing: CSV, XLSX, and XLS via pandas/openpyxl/xlrd

Hosted runtime data covers:

- workspace lookup and bootstrap
- chat collections, threads, and messages
- artifacts
- runs and run steps
- reminders
- billing status, usage events, checkout, and portal flows
- storage upload and signed URL flows

## Environment

Copy `env.example` to `.env`.

Required:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional providers:

- `OPENROUTER_API_KEY`
- `EXASEARCH_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FINANCIAL_DATASETS_API_KEY`
- `X_BEARER_TOKEN`
- `DEXTER_RUNNER_SHARED_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`

## Run Locally...

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
- `GET /api/billing/status`
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `GET /api/chat/threads`
- `POST /api/chat/threads`
- `GET /api/chat/threads/{thread_id}`
- `PATCH /api/chat/threads/{thread_id}`
- `DELETE /api/chat/threads/{thread_id}`
- `POST /api/chat/threads/{thread_id}/messages`
- `POST /api/chat/threads/{thread_id}/messages/stream`
- `POST /api/chat/compare`
- `POST /api/runs`
- `GET /api/runs/{run_id}`
- `GET /api/runs/{run_id}/steps`
- `POST /api/runs/{run_id}/artifact`
- `POST /api/artifact`
- `GET /api/artifact/search`
- `GET /api/artifacts`
- `GET /api/artifact/{artifact_id}`
- `PATCH /api/artifact/{artifact_id}`
- `DELETE /api/artifact/{artifact_id}`
- `POST /api/artifact/{artifact_id}/export`
- `POST /api/artifacts/export-bundle`
- `POST /api/storage/artifacts/upload`
- `POST /api/storage/artifacts/signed-url`
- `POST /api/data/preview`
- `POST /api/data/analyze`
- `POST /api/integrations/google-calendar/connect-start`
- `GET /api/integrations/google-calendar/status`
- `GET /api/integrations/google-calendar/events`

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
- `src/billing.py` owns billing status, Stripe checkout, and portal routes
- `src/workflows.py` owns run execution for Writing, Research, Image, Data, and Finance studios
