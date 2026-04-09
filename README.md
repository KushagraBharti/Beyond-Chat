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
- Research search: Tavily
- Deployment target: Vercel
- Frontend tooling: npm
- Backend tooling: uv only

## Repository Map

- `frontend/` production frontend
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

Do not use `bun`, `yarn`, or `pnpm`.
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

## Runtime Rules

- Hosted requests must use a valid Supabase-authenticated session
- SQLite and local auth bypass are not part of the product architecture
- `backend/src/store.py` remains only as a legacy local test store
- `backend/sql-related-files/` is the source of truth for the live schema

## Notes

- If documentation elsewhere conflicts with this file, `spec.md`, or `docs/api-spec.md`, treat those older notes as stale.
- The attached proposal PDF is background context only. The repo docs are the implementation contract.
