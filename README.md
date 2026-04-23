# Beyond Chat

Beyond Chat is a studio-based AI workspace built around reusable artifacts instead of long chat transcripts. The product organizes work into dedicated studios and keeps outputs searchable, saveable, and exportable.

## Canonical Product Direction

- Studios: Home, Chat, Writing, Research, Image, Data, Finance, Artifacts, Settings
- Compare is a shared panel capability, not a standalone route
- Hosted runtime is Supabase-only for auth, database, and storage
- `frontend-mock/` is archived reference material, not an active product surface

## Canonical Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: FastAPI
- Auth: Supabase Auth
- Persistence: Supabase Postgres
- Storage: Supabase Storage
- Model provider: OpenRouter
- Research search: Exa
- Deployment target: Vercel
- Frontend tooling: npm or Bun for JS surfaces; npm is the default for cloud/sandbox scripts
- Backend tooling: uv only

## Repository Map

- `frontend/` production frontend
- `backend/dexter/` Dexter finance agent runtime used by Finance Studio
- `backend/sandbox-runner/` Vercel Sandbox runner for cloud Dexter execution
- `frontend-mock/` archived visual sandbox and reference-only variants
- `backend/` production API and workflow runtime
- `backend/sql-related-files/` canonical live schema for Supabase/Postgres
- `docs/api-spec.md` canonical runtime/API contract
- `docs/system-architecture.md` canonical architecture summary
- `spec.md` canonical product scope and UX contract
- `manual.md` required external setup steps

## Local Setup

Create env files first:

- `backend/.env` from `backend/env.example`
- `frontend/.env.local` from `frontend/env.example`

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

Dexter finance agent:

```powershell
cd backend/dexter
npm install
npm run dexter:run -- --prompt "Analyze AAPL revenue and margins" --model openai/gpt-5.4-nano --json
```

Sandbox runner:

```powershell
cd backend/sandbox-runner
npm install
npm run typecheck
```

Use npm by default for frontend, Dexter, and the sandbox runner commands. Bun is supported best-effort for JS surfaces when it works better locally. Do not use `yarn` or `pnpm`.
Do not use `pip`.

## Local Integration Baseline

- Frontend dev server: `http://127.0.0.1:5173`
- Backend dev server: `http://127.0.0.1:8000`
- Backend health check: `GET /api/health`
- Frontend dev proxy forwards `/api/*` to the backend

## Validation

Frontend:

```powershell
cd frontend
npm run build
```

Backend:

```powershell
cd backend
uv run pytest
```

## Deploy To Vercel

Deploy as three Vercel projects from the same repository.

1. Backend project

- Import this repository in Vercel.
- Set Root Directory to `backend`.
- Framework Preset: `Other`.
- Use [backend/vercel.json](backend/vercel.json) and [backend/api/index.py](backend/api/index.py) as-is.
- Add backend env vars from [backend/env.example](backend/env.example).

Required backend credentials on Vercel:

- `OPENROUTER_API_KEY`
- `EXASEARCH_API_KEY`
- `FINANCIAL_DATASETS_API_KEY`
- `X_BEARER_TOKEN` if X search should be enabled
- `DEXTER_RUNNER_SHARED_SECRET`
- Supabase credentials from [backend/env.example](backend/env.example)

2. Sandbox runner project

- Import this repository in Vercel.
- Set Root Directory to `backend/sandbox-runner`.
- Framework Preset: `Other`.
- Add the runner credentials listed in [backend/env.example](backend/env.example).
- Required: `DEXTER_RUNNER_SHARED_SECRET`, `OPENROUTER_API_KEY`, `FINANCIAL_DATASETS_API_KEY`.

3. Frontend project

- Import this repository in Vercel.
- Set Root Directory to `frontend`.
- Framework Preset: `Vite`.
- Keep [frontend/vercel.json](frontend/vercel.json) for SPA routing.
- Add frontend env vars from [frontend/env.example](frontend/env.example).

Required frontend env on Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

4. Verify deployed integration

- Open `https://<your-backend-domain>.vercel.app/api/health`
- Open `https://<your-sandbox-runner-domain>.vercel.app/api/run` and confirm non-POST requests return 405.
- Open frontend and confirm auth + API-backed pages load without CORS errors.

## Runtime Rules

- Hosted requests must use a valid Supabase-authenticated session
- SQLite and local auth bypass are not part of the product architecture
- `backend/src/store.py` remains only as a legacy local test store
- `backend/sql-related-files/` is the source of truth for the live schema

## Notes

- If documentation elsewhere conflicts with this file, `spec.md`, or `docs/api-spec.md`, treat those older notes as stale.
- The attached proposal PDF is background context only. The repo docs are the implementation contract.
