# Beyond Chat

Beyond Chat is a modular AI workspace built for real work, not endless chat threads. Instead of forcing every workflow into one scrolling conversation, the product organizes tasks into purpose-built studios (writing, research, image, data, finance) and stores outputs as reusable artifacts. The goal is to help users iterate faster, stay organized, and collaborate around saved results.

This repository currently contains the initial full-stack foundation: a React frontend, a FastAPI backend, and a strict development policy around tooling. If you are joining the project, this README is the single source of truth for local setup and day-to-day commands.

## Core Principles

Beyond Chat is designed around three practical principles:

- Work should be structured by intent (studio-based), not buried in long chats.
- Outputs should be saved as artifacts that can be searched, reused, and exported.
- The platform should support fast model iteration, including side-by-side compare.

## Tech Stack

The project uses the following baseline technologies:

- Frontend: React + TypeScript + Vite
- Backend: FastAPI + Uvicorn
- Python environment/dependency manager: uv
- JavaScript package manager/runtime: Bun

Planned integrations (as the project grows): Supabase (Auth/DB/Storage), OpenRouter (multi-model), Vercel (deployment).

## Repository Structure

The workspace is organized by role:

- `frontend/` is the actual product frontend.
- `frontend-mock/` is a design playground for visual variants and experiments.
- `backend/` is the product backend API.
- `backend/sql-related-files/` is reserved for schema and SQL artifacts.

If you are building product features, work in `frontend/` and `backend/`. Keep visual prototyping in `frontend-mock/`.

## Prerequisites

Install these tools before cloning/running the project:

- Git
- Bun (latest stable)
- Python 3.11+ (3.12+ recommended)
- uv (latest stable)

On Windows, confirm installation with:

```powershell
git --version
bun --version
python --version
uv --version
```

## First-Time Setup (Fresh Clone)

After cloning, set up backend first, then frontend.

### 1) Clone the repository

```powershell
git clone https://github.com/KushagraBharti/Beyond-Chat
cd Beyond-Chat
```

### Terminal A: backend

```powershell
cd backend
uv venv BeyondChat
.\BeyondChat\Scripts\Activate.ps1
uv sync --active
uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

`uv sync` creates/updates a local virtual environment from `pyproject.toml` and `uv.lock`. Do not install backend dependencies with `pip`.

### Terminal B: frontend

```powershell
cd frontend
bun install
bun run dev
```

## Frontend ↔ Backend Communication

The connection path is intentionally simple. The frontend requests `GET /api/health`, and Vite proxies `/api/*` traffic from port `5173` to backend port `8000`.

Local URLs (to ensure everything works):

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Backend health: `http://localhost:8000/api/health`

## Available Commands

### Frontend (`frontend/`)

- `bun install` → install/update dependencies
- `bun run dev` → start local dev server
- `bun run build` → production build check
- `bun run lint` → lint source files

### Backend (`backend/`)

- `uv sync --active` → sync dependencies from lock/config for the open virtual environment
- `uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000` → run API locally

## Summary

Beyond Chat is built to become a practical AI work platform with studio-based UX and artifact-first workflows. The repo is now initialized with a functioning frontend-backend link and strict Bun/uv standards.