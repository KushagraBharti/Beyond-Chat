# Beyond Chat Agent Guide

## Product

Beyond Chat is an organization-first, general-purpose AI workspace: a ChatGPT Work-style product where users sign in, join organizations, select projects, run reusable agents, connect enterprise knowledge and apps, generate durable collaborative outputs, and configure automations.

The primary experience includes Home, Chat, Work, Projects, Agents, Knowledge & Apps, Automations, Settings/Admin, and Memory. Users can invoke slash commands, skills, tools, apps, MCPs, projects, sources, and named agents. Built-in General, Research, and Finance agents can create documents and other reviewable work. Organizations can create, publish, and deploy their own agents with scoped skills, tools, knowledge, and memory.

Billing targets $30/user/month, but live customer payments are deferred. Billing UI must truthfully show **Coming soon** until Stripe activation is explicitly authorized.

`plan.md` is the canonical product and execution plan. Reuse existing working features rather than rebuilding them.

## Architecture

- Frontend: React, TypeScript, Vite, React Router; hosted on Vercel.
- Backend: FastAPI/Python; hosted on Vercel and managed exclusively with `uv`.
- Data: Supabase Postgres, Storage, and Realtime with organization-scoped RLS.
- Identity: WorkOS AuthKit, organizations, invitations, memberships, and RBAC.
- Agent core: Pi wrapped by Beyond's runtime and app-server protocol.
- Execution: isolated Modal Sandboxes with durable runs, recovery, and generated files.
- Models: OpenRouter.
- Apps/connectors: Composio plus native knowledge integrations where needed.
- Billing: Stripe code exists, but live checkout and charging remain disabled.

The runtime supports durable run records, ordered events, leases, checkpoints, budgets, approvals, cancellation, suspension, recovery, reconciliation, SSE streaming/replay, internal gateway authentication, Modal worker execution, generated outputs, knowledge retrieval with citations, and scoped memory.

Production journey: WorkOS login → organization/project → agent invocation → Modal/Pi execution → durable streamed result → saved/versioned collaborative output.

## Repository

- `frontend/` — production React/Vite application.
- `backend/` — FastAPI API, runtime, persistence, provider adapters, and migrations.
- `backend/dexter/` — finance-agent implementation and tooling.
- `backend/sandbox-runner/` — hosted runner surface.
- `supabase/migrations/` — canonical database migrations.
- `frontend-mock/` — visual reference only unless explicitly requested.

## Tooling

- Use `npm` for frontend and JavaScript packages. Bun is allowed only where already supported.
- Use `uv` for all backend Python commands.
- Never use `yarn`, `pnpm`, or `pip`.
- Never hardcode, print, or commit credentials. Use environment variables.
- Use Chrome for authenticated browser work when requested; never use Computer.
- Composio is browser-managed on Windows because its CLI is unsupported there.
- Verify provider account, team, project, environment, and immutable resource IDs before mutation. Operate only on Beyond resources.

## Local Development

```powershell
# Backend
cd backend
uv sync
uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000

# Frontend
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

The frontend proxies `/api/*` to `127.0.0.1:8000`. Preserve `GET /api/health` locally and in production.

Useful validation:

```powershell
cd frontend
npm run build
npm run test

cd backend
uv run pytest

cd backend/sandbox-runner
npm run typecheck
```

Run targeted checks for changed behavior first; broaden only when warranted.

## Deployment

GitHub `main` is connected to three Vercel projects and automatically deploys them after a push. Do not create manual Vercel deployments unless explicitly requested.

- Frontend: https://beyond-chat-production.vercel.app
- Backend: https://beyond-chat-backend.vercel.app
- Runner: https://beyond-chat-sandbox-runner.vercel.app

## Engineering Preferences

- Make the smallest direct change that completes the requested user journey.
- Prefer working product behavior over speculative abstractions or scaffolding.
- Fix root causes, preserve existing conventions, and avoid unrelated refactors.
- Reuse existing contracts and implementations; do not duplicate working systems.
- Preserve unrelated user changes and keep secrets out of diffs and logs.
- Validate proportionally: targeted tests, required build, then the real local or production journey.
- Do not repeatedly retest unchanged behavior or fix unrelated issues.
- Commit and push only when requested or when the task explicitly includes deployment.
- Never claim a feature works without verification when verification is available.
