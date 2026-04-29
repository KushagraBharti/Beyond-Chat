# Completed Work

## Code and Product Implementation

- Added authenticated and local-first backend contract coverage for health, auth bootstrap, workspace data, chat, compare, runs, artifacts, export, and integration status.
- Added middleware-backed request context resolution plus JWT verification support with a controlled local bypass mode.
- Added Supabase-aware workspace bootstrap logic for signup/login flows.
- Added local workspace scoping to chat, artifacts, reminders, and runs in the SQLite-backed store.
- Added singular artifact endpoints and search/export contract support.
- Added storage upload and signed URL backend contracts for the `artifacts` bucket.
- Added OpenRouter retry handling and parallel compare execution.
- Added frontend auth bootstrap wiring after sign-in/sign-up and during restored sessions.
- Added Supabase-aware API client headers and workspace-id persistence in the frontend.
- Added frontend Vitest setup and smoke tests.
- Added SQL deliverables for:
  - user/workspace/member schema
  - chat tables
  - integration tables
  - artifact extensions
  - run extensions
  - RLS skeleton

## Documentation Deliverables

- Added `spec.md` for the full project specification.
- Added `manual.md` for all human-run setup tasks.
- Added `blocker.md` for remaining external blockers.
- Added architecture, API contracts, API spec, and sprint-planning docs under `docs/`.

## Validation Completed

- Backend health route verified at `GET /api/health`.
- Backend pytest suite passes with Python 3.11 via `uv run --python 3.11 pytest`.
- Browser QA completed locally against the backend-served frontend build for:
  - login bypass
  - dashboard rendering
  - chat compare mode
  - writing library and editor navigation
  - research error-state timeline
  - artifact export
  - settings/provider status rendering

## Ticket Coverage

- `BEY-7` Create system architecture diagram
- `BEY-8` Draft initial API contracts document
- `BEY-10` Configure client-side routing with React Router
- `BEY-14` Set up Supabase client in frontend
- `BEY-16` Create `GET /api/health`
- `BEY-18` Design and migrate core DB schema for users, workspaces, members
- `BEY-19` Design and migrate core DB schema for artifacts, runs, run_steps
- `BEY-20` Set up backend environment configuration
- `BEY-21` Initial Supabase RLS policy skeleton
- `BEY-25` Login and session management implementation
- `BEY-26` Signup and workspace bootstrap flow
- `BEY-30` JWT auth middleware in FastAPI
- `BEY-31` Artifact CRUD endpoint implementation
- `BEY-33` Finalized API specification document
- `BEY-34` Testing framework setup
- `BEY-35` Sprint planning documentation for Phase 3

## Partially Code-Ready, Pending External Setup

- `BEY-32` Supabase Storage support is implemented in code and SQL, but bucket creation, SQL execution, and live credential verification are still manual.
