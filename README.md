# Beyond Chat

Beyond Chat is a modular AI workspace built for real work, not endless chat threads. Instead of forcing every workflow into one scrolling conversation, the product organizes work into purpose-built studios such as writing, research, image, data, finance, and chat, then stores outputs as reusable artifacts.

This repository contains the current full-stack product surface:

- `frontend/` React + TypeScript + Vite product app
- `backend/` FastAPI API and workflow orchestration
- `backend/sql-related-files/` canonical Supabase/Postgres schema handoff

The hosted runtime path now uses Supabase for auth, Postgres persistence, and storage. The old SQLite store remains in the repo only as a development fallback for local bypass sessions and tests.

## Core Principles

- Work should be structured by intent, not buried in long chats.
- Outputs should be saved as artifacts that can be searched, reused, and exported.
- The app should support fast model iteration, including compare flows.

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI + Uvicorn
- Python tooling: uv
- JavaScript tooling: Bun
- Hosted runtime: Supabase Auth + Postgres + Storage
- AI provider: OpenRouter
- Search provider: Tavily

## Repository Structure

- `frontend/` production frontend
- `frontend-mock/` design playground / visual variants
- `backend/` production backend
- `backend/sql-related-files/` canonical SQL for workspace, chat, artifacts, runs, reminders, RLS, and storage
- `docs/` architecture and API notes
- `manual.md` manual setup steps for Supabase, env, storage, and providers

Important project docs:

- `spec.md`
- `manual.md`
- `completed.md`
- `blocker.md`
- `docs/api-spec.md`
- `docs/system-architecture.md`

## Prerequisites

Install these before running the repo:

- Git
- Bun
- Python 3.11+
- uv

Confirm on Windows:

```powershell
git --version
bun --version
python --version
uv --version
```

## First-Time Setup

Create local env files first:

- `backend/.env` from `backend/env.example`
- `frontend/.env.local` from `frontend/env.example`

Clone the repo:

```powershell
git clone https://github.com/KushagraBharti/Beyond-Chat
cd Beyond-Chat
```

Backend:

```powershell
cd backend
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
uv sync
uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
bun install
bun run dev --host 127.0.0.1 --port 5173
```

Do not install frontend dependencies with `npm`, `yarn`, or `pnpm`.
Do not install backend dependencies with `pip`.

## Frontend to Backend Communication

The frontend uses the Vite dev proxy for `/api/*` and expects the backend on `127.0.0.1:8000`.

Local URLs:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`
- Health: `http://127.0.0.1:8000/api/health`

## Available Commands

Frontend:

- `bun install`
- `bun run dev --host 127.0.0.1 --port 5173`
- `bun run build`
- `bun run test`

Backend:

- `uv sync`
- `uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000`
- `uv run pytest`

## Runtime Persistence

Hosted runtime data now lives in Supabase/Postgres for:

- workspace lookup and membership-backed workspace resolution
- chat collections, threads, and messages
- artifacts
- runs and run steps
- reminders

Supabase Storage is used for uploaded artifact files and generated image outputs.

The SQLite store in `backend/src/store.py` is now a legacy development fallback used only for local bypass and test-style flows. It is not the intended hosted source of truth.

## Canonical Supabase SQL

Use the SQL files in `backend/sql-related-files/` as the source of truth for the live schema. Apply them in order as documented in `manual.md`.

Important: `backend/supabase/migrations/` is older and should not be treated as the canonical schema for the current hosted runtime.

## Required Environment Variables

Backend runtime:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`
- `SUPABASE_STORAGE_BUCKET`

Frontend runtime:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` if not using the default local proxy

Optional providers:

- `OPENROUTER_API_KEY`
- `TAVILY_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Development-only bypass:

- `ALLOW_LOCAL_AUTH_BYPASS=true`
- `VITE_ENABLE_MVP_BYPASS=true`

## Deployment Notes

For deployment, configure the app around Supabase Auth, Postgres, and Storage. The backend should not depend on a local SQLite file in hosted environments.

Before deployment:

1. Apply the Supabase SQL in `backend/sql-related-files/` in order.
2. Set the backend and frontend Supabase environment variables.
3. Configure the `artifacts` storage bucket and policies.
4. Disable local bypass in production.
5. Verify login, workspace bootstrap, chat, runs, artifact save/load, and export flows.

## Summary

Beyond Chat is a studio-based AI workspace with artifact-first workflows. The repo now aligns its hosted runtime with Supabase/Postgres while keeping a clearly isolated local fallback path for development.
