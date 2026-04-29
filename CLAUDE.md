# CLAUDE.md

This file provides Claude-specific instructions for working in the Beyond Chat repository.

`AGENTS.md` is the global source of truth for all agents. This file adds Claude-focused execution guidance while preserving the same hard rules.

## Claude Operating Objective

Execute requested coding tasks with high precision, minimal blast radius, and strict adherence to repository policy.

## Critical Policy Alignment

You must always enforce:

- **Frontend: Bun only** (`bun install`, `bun run ...`)
- **Backend: uv only** (`uv sync`, `uv run ...`)
- Never use `npm`, `yarn`, `pnpm`, or `pip` for dependency workflows in this repo.

If a user asks for a conflicting command, comply with intent but convert implementation to the approved toolchain.

## Required Session Bootstrap

Before doing substantial work:

1. Read `README.md`, `AGENTS.md`, and this file.
2. Import/load **ALL available skills** in the local agent skill system.
3. Inspect only files relevant to the task.
4. Build a minimal plan for multi-step tasks.

### Skill import directive

Claude must attempt to load all available skills every session to ensure latest instructions are active.

- Use the environment’s equivalent of `import all skills`.
- If explicit import is unavailable, manually read each available skill source.
- If no skills are discoverable, continue and note the limitation.

## Repository-Aware Guidance

- `frontend/`: production React + TS + Vite app
- `frontend-mock/`: mock variants only (do not treat as production path unless user asks)
- `backend/`: FastAPI service

Default behavior: product work belongs in `frontend/` + `backend/`.

## Coding Style and Change Strategy

- Keep edits surgical and task-scoped.
- Favor readability and explicitness over cleverness.
- Preserve existing architecture and naming unless change is required.
- Avoid broad formatting churn.

## Validation Protocol

Run the smallest meaningful validations first, then broaden if needed.

- Frontend edits: `bun run build`
- Backend edits: run API with uv and verify affected endpoints
- Integration edits: confirm frontend/backend path, including `/api/health`

Never claim success without verification when verification is possible.

## Communication Expectations

- Be concise, direct, and implementation-focused.
- State assumptions when context is ambiguous.
- Report exactly what changed and where.
- Call out blockers with a concrete next best action.

## Safety and Secrets

- Never commit credentials or tokens.
- Prefer `.env`-based configuration.
- Minimize data exposure in logs and debug output.

## Fast Start Commands

### Backend

```powershell
cd backend
uv sync
uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```powershell
cd frontend
bun install
bun run dev --host 127.0.0.1 --port 5173
```

### Build check

```powershell
cd frontend
bun run build
```

## Completion Checklist (Claude)

Before finishing any task, confirm:

- Request is fully implemented.
- Bun/uv policy remained intact.
- Relevant validations passed.
- Docs were updated if setup/behavior changed.
- Response includes concise next-step options when helpful.
