# Beyond Chat Product Specification

## Overview

Beyond Chat is a modular AI workspace built for real work rather than endless prompt threads. Traditional chat interfaces are good at quick question-and-answer interactions, but they break down for multi-step workflows such as writing long documents, researching a topic, comparing model outputs, generating images, analyzing uploaded data, or building repeatable finance workflows. Beyond Chat replaces the single-thread model with dedicated studios, shared workspace structure, reusable artifacts, and provider-aware long-running workflows.

The product exists to solve a simple market gap: people increasingly rely on LLMs for meaningful work, but most interfaces still force that work into one scrolling transcript. That causes lost context, poor organization, weak exportability, and difficult collaboration. Beyond Chat treats outputs as artifacts, workflows as studios, and context as something reusable across the whole product.

## Product Goals

- Give users a studio-based workspace instead of one generic chat box.
- Persist useful outputs as searchable, reusable artifacts.
- Support multi-model evaluation without leaving the main workflow.
- Make research and finance flows explicit through step timelines and structured outputs.
- Stay useful even before every third-party integration is fully configured.
- Support a local-first development workflow while preserving a clear path to Supabase-backed production hardening.

## Core User Personas

- Individual power user who wants an AI workspace for writing, research, and organizing outputs.
- Student or analyst who needs repeatable structured outputs and saved artifacts.
- Small team that wants a shared workspace, artifact history, and multi-model comparison without enterprise complexity.
- Builder or startup operator who needs one product surface for prompting, drafting, research, export, and iteration.

## Product Positioning

Beyond Chat is not “just another AI chat app.” It is a workspace for structured AI-assisted production. The key differentiators are:

- Dedicated studios by workflow.
- Artifact-first persistence.
- Compare mode for model evaluation.
- Tool-runner visibility for long-running work.
- Graceful disconnected states so the product can keep functioning before full provider setup.

## Functional Scope

### 1. Authentication and Workspace Model

- Users authenticate with Supabase Auth.
- New users are bootstrapped into a default workspace.
- Workspace membership is modeled explicitly through `workspaces` and `workspace_members`.
- Protected backend routes accept validated JWT sessions in production.
- Local development can use a controlled bypass mode until production secrets are configured.

### 2. Home

- Workspace greeting and identity.
- Reminder/task cards.
- Google Calendar preview area.
- Integration/provider status cards.
- MCP-server-style shell cards for future server integrations.
- Quick links into the main studios.

### 3. Chat

- Project, group chat, and standalone chat organization.
- Persistent conversation threads.
- Model selector.
- Context Builder integration.
- Compare mode embedded in Chat instead of a separate destination.

### 4. Writing Studio

- Writing library view with prior documents.
- Rich-text editor view using TipTap.
- Formatting toolbar.
- `@assistant` workflows for selected text, whole document, or insertion.
- Saved writing artifacts with rich-text metadata.

### 5. Research Studio

- Prompt input.
- Context Builder.
- Long-running run/timeline UI.
- Structured markdown report output.
- Source visibility.
- Save-as-artifact support.

### 6. Image Studio

- Prompt rail.
- Model selector.
- Aspect ratio, style, and quality controls.
- Gallery/history area.
- Disconnected-safe rendering when the provider is not configured.

### 7. Data Studio

- File upload entry point.
- Dataset preview.
- Prompt-driven analysis shell.
- Results and step timeline.
- Artifact save flow for insights or transformed outputs.

### 8. Finance Studio

- Finance-oriented prompt flow.
- Timeline of steps.
- Structured report output.
- Reuses the research/timeline pattern but with finance-specific framing.

### 9. Artifact Library

- Search.
- Filters by studio/type/date/tags.
- Detail view.
- Export to Markdown and PDF.

### 10. Context Builder

- Search/browse existing artifacts.
- Attach context to studio or chat runs.
- Remove selected context.
- Show the current included-context list clearly before submission.

## User Experience Principles

- The product should feel like one coherent workspace, not a collection of disconnected prototypes.
- Protected pages should inherit the visual language established by the landing, pricing, and login surfaces.
- Every provider-backed surface must handle `connected`, `disconnected`, `not_configured`, and `error` states explicitly.
- The interface should remain useful even when providers are not live.
- Routing and navigation must be stable and predictable.

## Frontend Architecture

- React + TypeScript + Vite.
- React Router controls public and protected route separation.
- Shared protected UI primitives provide buttons, cards, inputs, empty states, status badges, and page-section framing.
- Supabase client lives in the frontend for auth/session handling.
- The API client attaches the Supabase access token automatically when available and falls back cleanly to local preview mode.

## Backend Architecture

- FastAPI backend with route groups for health, auth bootstrap, provider status, workspace data, chat, compare, runs, artifacts, export, and Google Calendar scaffolding.
- Local SQLite store supports a local-first developer workflow.
- Backend request context supports:
  - validated Supabase JWTs when configured
  - local auth bypass when explicitly enabled
- Provider abstraction layer covers:
  - OpenRouter for LLM calls
  - Tavily for research search
  - Google Calendar connection scaffolding
  - image-provider and storage status scaffolding

## Data Model

### Auth and Workspace

- `auth.users` is managed by Supabase.
- `public.user_profiles` stores application-facing user metadata.
- `public.workspaces` stores workspace identity.
- `public.workspace_members` stores membership and role.

### AI Workflows

- `artifacts` stores reusable outputs.
- `runs` stores long-running workflow executions.
- `run_steps` stores timeline and tool-step visibility.
- `chat_collections`, `chat_threads`, and `chat_messages` support persistent conversational organization.
- `integration_connections` and `integration_sync_logs` support external integration state and syncing metadata.

## API Design Principles

- `GET /api/health` remains the simplest baseline integration path.
- Protected routes should require authenticated context in production.
- New artifact contract supports:
  - `POST /api/artifact`
  - `GET /api/artifact/search`
  - `GET /api/artifact/{id}`
  - `POST /api/artifact/{id}/export`
- Existing plural routes can remain as compatibility shims where needed.
- Runs use a shared lifecycle:
  - create run
  - inspect run
  - inspect run steps
- Auth bootstrap is responsible for ensuring workspace membership exists after login/signup.

## Integrations

### Supabase

- Auth for user sessions.
- Postgres for production persistence.
- RLS for workspace-scoped access.
- Storage bucket for file/image uploads.

### OpenRouter

- Shared LLM provider for writing, compare, and synthesis workflows.

### Tavily

- External search provider for research and finance.

### Google Calendar

- Read-only agenda integration.
- OAuth configured outside the repo but supported in code and UI.

## Environment Strategy

### Local-first mode

- Local SQLite persistence.
- Optional MVP/local auth bypass.
- Disconnected-safe provider states.
- Fast iteration without waiting on full provider setup.

### Production mode

- Supabase JWT verification enabled.
- SQL migrations executed in Supabase.
- RLS active on workspace-scoped tables.
- Storage bucket created and policy-configured.
- OAuth/provider credentials configured through environment variables.

## Quality and Validation

- Frontend build via `bun run build`.
- Frontend tests via `bun run test` using Vitest.
- Backend tests via `uv run pytest`.
- Browser QA via Playwright-driven manual verification.
- Health endpoint must stay stable across all implementation changes.

## Risks and Constraints

- Provider-dependent features cannot be fully production-verified without real credentials and Supabase dashboard configuration.
- Image generation remains partially scaffolded until storage and provider configuration are completed.
- Local bypass improves development speed but must be disabled in hardened environments.
- RLS and workspace bootstrapping must be executed correctly in Supabase before production use.

## Success Criteria

- User can authenticate, enter a workspace, and navigate all protected routes.
- Artifact save/search/read/export flows function in the implemented app.
- Compare mode and studio pages render and communicate with backend contracts.
- The repo contains the SQL, docs, manual setup steps, and validation paths needed to take the project from local-first to production-ready.
