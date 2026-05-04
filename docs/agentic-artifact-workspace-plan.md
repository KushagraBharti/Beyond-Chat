# Agentic Artifact Workspace Plan

This document captures the target architecture for the autonomous goal run. It overrides older demo-only planning where there is conflict.

## Product North Star

Beyond Chat should be a live, agentic-first, artifact-first AI workspace.

The goal is product completeness, not a hardcoded investor demo. The Starbucks Cinder Orange workflow remains a useful acceptance story because it exercises the whole product, but the implementation must use live providers and general product flows.

Do not add deterministic demo fallbacks, fake provider outputs, seeded Supabase demo artifacts, or hardcoded Starbucks-only logic.

## Canonical Reference Pattern

Finance/Dexter is the canonical reference for agentic behavior.

Before implementing other studios, the goal agent should audit Finance/Dexter and identify:

- agent loop structure
- tool calling pattern
- model/provider abstraction
- run and step persistence behavior
- streaming/progress rendering
- error handling
- artifact save behavior
- frontend display patterns

Research, Data, Writing, Chat, Image, and Compare should reuse or adapt this architecture rather than inventing unrelated studio-specific runtimes.

## Required Studios

All studios are in scope for the goal:

- Home/Dashboard
- Chat
- Research
- Data
- Finance/Dexter
- Writing
- Image
- Compare
- Artifacts
- Settings

Data is the highest-priority studio after Finance/Dexter because it should become a real data agent, not a thin CSV summarizer.

## Live Provider Rule

Use live providers only:

- OpenRouter for LLM/model calls.
- Exa for research.
- Existing image provider path for Image Studio.
- Supabase for auth, database, storage, and user data.

No deterministic fallback outputs. If a provider fails, the app should show a real error/status and preserve the run state.

## User Profile Scope

Artifacts should be scoped to the user profile, not workspace collaboration.

The current codebase may contain workspace tables or bootstrap behavior. Do not expand workspace/team collaboration as part of this goal. Remove or avoid workspace UX where practical. If existing workspace tables are needed as internal legacy plumbing during migration, keep that hidden from the product surface. For product behavior, artifacts, runs, files, and saved outputs should belong to the authenticated user profile.

Minimum ownership fields should make it clear:

- creator user id
- owning user profile id where applicable
- source studio
- source run id
- provider/model metadata
- created/updated timestamps

## Artifact Behavior

Every meaningful generated output should be savable as an artifact.

Studios should expose a clear `Save to artifact` action for outputs such as:

- research reports
- source-backed competitor matrices
- data analyses
- charts
- tables
- finance memos
- sensitivity tables
- writing drafts
- edited document sections
- image generations
- compare results

Artifacts should preserve enough provenance to answer:

- which studio created it
- which model/provider created it
- which prompt/context was used
- which source files/artifacts were attached
- which run and run steps produced it

## Cross-Studio Context

Drag/drop and handoff should pass full artifact contents where practical, not just titles or IDs.

The system may still store and pass artifact IDs internally, but the receiving studio must receive enough actual content to ground the next model call without forcing the user to manually copy/paste.

Expected handoffs:

- Chat to Research
- Research to Data
- Research/Data/Finance to Writing
- Writing to Image where useful
- Any studio to Compare
- Any studio to Artifacts

## Research Studio

Research must use Exa live.

Expected behavior:

- visible agent/tool steps
- Exa-backed source discovery
- source cards
- cited synthesis
- competitor matrix generation where relevant
- opportunity/risk matrix where relevant
- `Save to artifact` for reports, matrices, and useful intermediate outputs

## Data Studio

Data must support uploaded CSV and Excel drag/drop.

Expected behavior:

- file upload and dataset preview
- data profiling
- agentic analysis plan
- chart/table generation
- insight/risk/recommendation generation
- saved chart/table/analysis artifacts
- clean handoff into Finance, Writing, Compare, and Artifacts

The Data agent should follow the Finance/Dexter style of tool calling where possible.

## Writing Studio

Writing should be agentic and tool-capable.

Important editing behavior:

- The agent should be able to edit a specific section/range of a long document without rewriting the entire document.
- For example, if the user wants to update a subsection around lines 500-515 of a long document, the tool path should produce a targeted edit rather than regenerating all 1000 lines.
- Writing should support artifact context, document section selection, revision proposals, and saving outputs as artifacts.

## Compare

Compare is a model-output comparison layer, not artifact comparison.

Expected behavior:

- Compare can be opened from Chat, Research, Writing, and other studios.
- The user can enable compare mode, choose multiple OpenRouter models, and send the same prompt/context to those models.
- Default compare models should be inferred from existing OpenRouter configuration where possible. If defaults are missing, use a practical set that includes the configured default model, one GPT-5-class model, one Claude model, and one additional strong OpenRouter model available to the app.
- Compare outputs should preserve tool-calling ability where supported by the selected model path.
- The user can choose/use one result in the originating studio.
- The user can save a selected compare result as an artifact.

Compare should compare model responses and decisions, not primarily compare saved artifacts against each other.

## Supabase Work

The goal agent may apply Supabase schema/storage/policy changes directly.

Use the repo-local `supabase-postgres-best-practices` skill before Supabase/Postgres work.

Preferred workflow:

- Use Supabase CLI for migration-file-first workflows when the change should live in version control.
- Use Supabase MCP for live inspection, advisors, logs, generated types, and small direct fixes where it is safer/faster.
- Keep canonical SQL/migration files updated in the repo when schema changes are made.
- Fix relevant Supabase security advisor warnings when they affect auth, artifacts, runs, storage, or profile ownership.

The local CLI currently works through `npx supabase` and the repo is linked to project ref `bipcgzvdyrbedhvshyqr`.

## Frontend Implementation Rule

- Use these skills for all frontend work:
  - `high-end-visual-design`
  - `gpt-taste`
  - `design-taste-frontend`
  - `frontend-design`
- Frontend changes must extend the existing Beyond Chat theme, studio layout system, components, and routing architecture.
- Do not rebuild the frontend from scratch.
- Do not introduce a disconnected visual system.
- New agentic surfaces, artifact flows, Compare controls, Data UI, Writing UI, Research UI, and settings/billing UI should feel native to the current product.

## Auth, Profiles, Billing

Authentication and account creation must not be blocked by Stripe.

Expected flow:

- User signs up/logs in.
- User profile is created.
- User starts on a free plan.
- Settings can show plan/billing state.
- User can upgrade through Stripe from settings.

Stripe should work for upgrades, but failed/missing billing configuration must not prevent login, profile creation, or free-plan usage.

## Deployment Scope

Local correctness comes first.

The app may already be deployed on Vercel, but this goal should first make local frontend/backend/Supabase behavior work. Vercel deployment can be handled after local behavior is complete unless a deployment-specific issue blocks verification.

## Documentation Duty

The goal agent should update docs as it works.

At minimum, keep these current:

- `docs/agentic-artifact-workspace-plan.md`
- `docs/system-architecture.md`
- `docs/api-contracts.md`
- `docs/api-spec.md`
- `docs/demo-launch-plan.md`
- `completed.md`
- `blocker.md`

Docs should record implemented behavior, live-provider assumptions, Supabase setup, remaining external blockers, and exact manual steps if any.

## Quality Bar

- Prioritize completing the product behavior over broad test-suite expansion.
- Use minimal high-signal verification: backend smoke checks, frontend build, targeted local flow checks, provider status checks, Supabase schema/storage checks.
- Do not hardcode demo data or fake successful provider outputs.
- Do not mark complete until local flows work end-to-end or remaining blockers are clearly external/manual.
