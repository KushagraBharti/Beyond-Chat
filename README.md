# Beyond Chat

Beyond Chat is a production-style AI workspace that turns conversations into durable artifacts. Instead of treating every task as a disposable transcript, the app organizes work into dedicated studios for chat, writing, research, image, data, finance, artifacts, and settings, with saved outputs that can be searched, reused, exported, and compared.

The strongest proof point is Finance Studio: Dexter, a sandboxed finance agent with a 12-tool research surface, live tool traces, and final memo output. Dexter streams NDJSON from the runner into persisted `run_steps`, so the UI can show tool starts, progress, completions, errors, sources, and the final answer as the agent works. The deployed architecture moved away from Railway and now targets three Vercel projects plus a Daytona-backed sandbox path.

Project inventory:

- 14 Supabase/Postgres tables in the canonical SQL files.
- 39 API paths across the backend product surface.
- 14 core backend request/response models.
- 42 curated tests across backend, frontend, Dexter, and sandbox-runner surfaces.
- Three Vercel deployment roots: frontend, backend, and Dexter sandbox runner.

## Technical Architecture

Beyond Chat is a full-stack React/FastAPI product with Supabase as the hosted system of record.

Core stack:

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router.
- Backend: FastAPI on Python `3.11+`, run with `uv`.
- Auth: Supabase Auth.
- Persistence: Supabase Postgres.
- Storage: Supabase Storage for uploaded artifacts and data files.
- Model access: OpenRouter.
- Research search: Exa.
- Billing: Stripe checkout, portal, webhook, and plan status endpoints.
- Deployment: three Vercel projects, with Vercel Sandbox/Daytona for cloud Dexter execution.

The product surface is split into public routes and authenticated studios. Public routes cover landing, pricing, login, signup, auth callback, password reset, and billing result pages. Protected routes include Dashboard, Chat, Writing, Research, Image, Data, Finance, Artifacts, and Settings. Compare is implemented as a shared panel capability rather than a standalone route.

### Runtime Flow

The frontend sends authenticated API requests with the Supabase access token and an internal workspace header. FastAPI validates the request, writes runs/artifacts through Supabase-aware stores, and calls provider adapters for model, search, billing, data, and Dexter workflows. Profile-scoped ownership is the product-facing model; workspace IDs remain internal routing/bootstrap plumbing where the schema still requires them.

Finance Studio uses Dexter through two execution paths:

- Local development: backend launches the local Dexter TypeScript runtime and parses JSONL output.
- Hosted execution: backend calls the sandbox runner, which streams NDJSON from Dexter and returns the same event shape.

Both paths persist live events into `run_steps`, giving the UI a durable audit trail instead of only a final blob of text.

### Data Model

The canonical schema lives in `backend/sql-related-files/` and covers:

- profiles, workspaces, and membership
- chat collections, threads, and messages
- integration connections and sync logs
- artifacts, runs, and run steps
- reminders, billing plans, and usage events
- storage setup and row-level security policies

`backend/sql-related-files/` is the source of truth for the live Supabase schema. Older proposal and weekly-update docs are useful context but should not override the root README, `spec.md`, or API docs.

### Repository Map

```text
Beyond-Chat/
├── frontend/                 # production React/Vite frontend
├── backend/                  # FastAPI API, Supabase stores, provider adapters
├── backend/dexter/           # Dexter finance agent runtime
├── backend/sandbox-runner/   # Vercel Sandbox runner for cloud Dexter execution
├── backend/sql-related-files/# canonical Supabase/Postgres schema
├── supabase/migrations/      # Supabase migration history
├── demo-data/                # demo workspace content
├── final-submission/         # final report materials
└── frontend-mock/            # archived visual reference only
```

## Setup And Run

Create env files first:

- `backend/.env` from `backend/env.example`
- `frontend/.env.local` from `frontend/env.example`

Backend:

```powershell
cd Beyond-Chat\backend
uv sync
uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd Beyond-Chat\frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Dexter finance agent:

```powershell
cd Beyond-Chat\backend\dexter
npm install
npm run dexter:run -- --prompt "Analyze AAPL revenue and margins" --model openai/gpt-5.4-nano --json
```

Sandbox runner:

```powershell
cd Beyond-Chat\backend\sandbox-runner
npm install
npm run typecheck
```

Local integration baseline:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`
- Health check: `GET /api/health`
- Frontend dev proxy forwards `/api/*` to the backend.
- Protected API calls require a Supabase access token except `GET /api/health` and provider status.

Validation:

```powershell
cd Beyond-Chat\frontend
npm run build
npm run test
```

```powershell
cd Beyond-Chat\backend
uv run pytest
```

```powershell
cd Beyond-Chat\backend\sandbox-runner
npm run typecheck
```

Use npm for frontend, Dexter, and sandbox-runner commands. Use `uv` for the backend. Do not use `pip`, `yarn`, or `pnpm` for the active product surfaces.

## Deploy

Deploy from the same repository as three Vercel projects:

1. Backend
   - Root Directory: `backend`
   - Framework Preset: `Other`
   - Uses `backend/vercel.json` and `backend/api/index.py`
   - Required credentials include Supabase vars, `OPENROUTER_API_KEY`, `EXASEARCH_API_KEY`, `FINANCIAL_DATASETS_API_KEY`, `DEXTER_RUNNER_SHARED_SECRET`, and Stripe keys.

2. Sandbox runner
   - Root Directory: `backend/sandbox-runner`
   - Framework Preset: `Other`
   - Required credentials include `DEXTER_RUNNER_SHARED_SECRET`, `OPENROUTER_API_KEY`, and `FINANCIAL_DATASETS_API_KEY`.

3. Frontend
   - Root Directory: `frontend`
   - Framework Preset: `Vite`
   - Uses `frontend/vercel.json` for SPA routing
   - Required credentials: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Verify deployment with:

- `https://<backend-domain>.vercel.app/api/health`
- `https://<sandbox-runner-domain>.vercel.app/api/run` returning `405` for non-POST requests
- frontend auth and API-backed pages loading without CORS errors

## Status Notes

- Hosted runtime is Supabase-only for auth, database, and storage.
- SQLite and local auth bypass are legacy/testing concerns, not product architecture.
- `backend/src/store.py` remains only as a legacy local test store.
- `frontend-mock/` is archived reference material, not an active product surface.
- Usage tracking and billing state support plan-aware limits; verify middleware before claiming fully enforced application-level quotas.
