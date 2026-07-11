# KUSHAGRA BHARTI

## Documentation Refresh - May 4, 2026

This weekly note is retained as historical project evidence. Current setup, architecture, API, blocker, and completion state now live in `README.md`, `spec.md`, `manual.md`, `docs/api-spec.md`, `docs/system-architecture.md`, `blocker.md`, and `completed.md`.

## Weekly Summary
- Week 11 was the biggest production-readiness push for Beyond Chat so far, covering both product implementation and infrastructure hardening across the full app.
- The work started as a broad "finish everything" implementation sprint across the studio system: Data, Writing, Image, Chat, Compare, Research, Finance/Dexter, Artifacts, Dashboard, Context Builder, billing, auth, and shared API contracts.
- The second half of the work focused on hardening the Supabase production architecture: profile-scoped artifacts/runs, storage policies, RLS cleanup, security advisor fixes, migration drift repair, and a full disposable Supabase rebuild.
- The final pass was a real local/browser E2E and live-provider verification sweep using Supabase Auth, OpenRouter, Exa, Stripe, Dexter/Financial Datasets, OpenRouter image generation, Supabase Storage, and the frontend app.
- By the end of the week, Beyond Chat had moved much closer to a real artifact-first AI workspace instead of a set of disconnected studios or mock/demo screens.

## Work Completed
- Completed a broad codebase audit of remaining blockers across frontend, backend, Supabase, storage, billing, live providers, and studio workflows.
- Converted the remaining product direction into an agentic artifact workspace plan and documented it in `docs/agentic-artifact-workspace-plan.md`.
- Updated `docs/api-contracts.md`, `docs/api-spec.md`, `docs/system-architecture.md`, and `docs/demo-launch-plan.md` to reflect the current app architecture and cross-studio workflow model.
- Maintained `blocker.md`, `completed.md`, and `manual.md` as the running source of truth for what was done, what remained manual, and what was externally blocked.
- Updated `.gitignore` so local credentials and generated/private files stay out of source control.

## Data Studio
- Implemented the Data Studio CSV/Excel ingestion path end-to-end.
- Added backend support for secure Supabase Storage upload, user-scoped storage downloads, file preview, and dataset profile generation.
- Added XLS/XLSX support by adding `openpyxl` and `xlrd` to the backend dependencies and updating `backend/uv.lock`.
- Added SQL and migration updates so CSV, XLS, and XLSX uploads are allowed in the artifact storage bucket.
- Reworked Data Studio analysis so the backend sends real dataset content to OpenRouter instead of only a shallow filename/row-count summary.
- Expanded Data Studio model output to include insight text, decision metrics, risks/anomalies, recommendations, chart data, and table data.
- Added chart rendering for bar, line, pie, and scatter-style responses.
- Added first-class save actions for combined analysis reports, standalone chart artifacts, and standalone table artifacts.
- Added Data Studio handoff actions so an analysis can continue into Finance, Writing, and Compare with the full structured result carried forward.
- Updated `frontend/src/pages/protected/DataPage.tsx`, `frontend/src/lib/api.ts`, and `frontend/src/lib/artifactDrafts.ts` to support upload, preview, analyze, render, save, and handoff flows.

## Writing Studio
- Added Writing Studio targeted edit mode for scoped document edits.
- Sent selected text plus bounded before/after context to the backend for targeted edit runs.
- Updated the backend writing workflow so targeted edits return only replacement text and do not rewrite or include the surrounding document.
- Updated the editor so scoped replacements apply only to the selected range.
- Added Save actions for Writing Studio assistant suggestions and targeted-edit outputs so they become provenance-linked writing artifacts.
- Added Writing Studio Context Builder wiring so selected artifacts are preserved through assistant runs, Compare drafts, handoffs, and saved writing outputs.
- Added launch templates for executive brief, retail pilot summary, landing page copy, and launch email.
- Added multi-output launch kit generation so one live writing run can produce several artifact-ready documents and save each output separately.
- Updated `frontend/src/pages/protected/WritingEditorPage.tsx`, `frontend/src/pages/protected/WritingHomePage.tsx`, `backend/src/workflows.py`, and artifact draft helpers for the new writing flows.

## Image Studio
- Wired Image Studio into the shared Context Builder and handoff system.
- Preserved selected artifact context in Image Studio prompt enhancement and saved image artifact metadata.
- Added Image Studio prompt presets for product mockup, commuter ad, and retail shelf creative.
- Updated image artifact handling so generated images can be saved and reused as artifacts.
- Verified the live image path end-to-end: prompt enhancement through OpenRouter, image generation through OpenRouter image models, upload to Supabase Storage, signed URL return, and persisted storage paths.
- Confirmed generated images are not only returned as base64/data URLs when Supabase Storage is available.
- Updated `frontend/src/pages/protected/ImagePage.tsx`, `backend/src/workflows.py`, and Supabase upload helpers around the image flow.

## Compare
- Refactored Compare into a shared model-output comparison panel rather than a standalone product route.
- Removed the product-facing standalone Compare route/navigation path by deleting the old `ComparePage` surface and keeping Compare embedded in studios.
- Added shared Compare Panel "Use Result" callbacks for Chat, Research, Finance, and Writing.
- Preserved "Save Result" behavior so chosen model outputs can still become artifacts.
- Added OpenRouter compare execution with parallel model calls and retry/error handling.
- Added tool-call preservation for Compare responses so supported models can return and expose tool calls in the panel.
- Updated `frontend/src/features/compare/ComparePanelProvider.tsx`, `frontend/src/components/RunStudioWorkspace.tsx`, `frontend/src/app/AppShell.tsx`, and backend provider logic for the shared Compare contract.

## Chat
- Added Chat Context Builder wiring so selected artifacts are merged into streamed and non-streamed chat provider prompts.
- Carried selected context into Chat Compare requests.
- Added direct Save actions for assistant chat outputs, preserving message/thread provenance as `chat_response` artifacts.
- Added Chat quick actions and assistant-output handoffs into Research, Writing, and Compare using the assistant response content.
- Updated `frontend/src/pages/protected/ChatPage.tsx`, backend chat context handling, API contracts, and artifact draft helpers.

## Research Studio
- Tightened Research Studio so it requires live Exa search and fails clearly when Exa is missing instead of producing deterministic fake/demo research.
- Improved Research synthesis prompts to request source-backed competitor/landscape matrices and opportunity/risk matrices.
- Added explicit source-limit handling for live-source reports.
- Added Research prompt presets for the launch workflow.
- Added Research output handoff actions so completed research can continue into Data, Finance, Writing, or Compare.
- Verified live Research E2E with Exa and OpenRouter.

## Finance / Dexter
- Kept Finance Studio routed through Dexter as the canonical agentic studio pattern.
- Added Finance prompt presets for SBUX/public-peer analysis and launch-decision workflows.
- Added Finance output handoff actions into Data, Writing, and Compare.
- Verified a live local Dexter run using finance data and recorded tool steps.
- Preserved the local direct Dexter execution path for development while keeping the remote Vercel Sandbox runner path as the production direction.
- Fixed provider status so Dexter reports `connected` when the local Dexter runtime is available and live finance provider keys are configured, not only when `DEXTER_RUNNER_URL` exists.
- Added `local_dexter_runtime_available()` in `backend/src/dexter_client.py`.
- Updated `backend/src/providers.py` so the provider status endpoint understands both remote sandbox and local Dexter runtime availability.
- Added a backend test confirming local Dexter availability is reflected in provider status.
- Installed the correct Playwright Chromium binary for the local Dexter Playwright package so browser E2E could run.
- Cleaned up E2E-generated Dexter scratchpad/cache artifacts without touching unrelated worktree changes.

## Dashboard / Context Builder / Artifacts
- Removed fake dashboard provider tiles and deterministic Google Calendar preview events.
- Updated Dashboard provider status tiles to surface real normalized statuses plus explicit `not_configured` states for Notion, Drive, Slack, and other unavailable connectors.
- Added a real Dashboard artifact activity panel showing recent saved user artifacts and per-studio saved-output counts.
- Added Context Builder source tabs for Artifacts, Notion, Files, Calendar, and Slack.
- Added explicit unavailable states for connectors that do not yet have live data paths.
- Added artifact launch-kit matching, multi-artifact selection, and Markdown bundle export for saved artifact collections.
- Added artifact detail handoff actions so saved artifacts can continue into Chat, Research, Finance, Writing, or Compare with artifact context preserved.
- Added singular artifact endpoints and artifact search/export contract support.
- Updated `frontend/src/pages/protected/HomePage.tsx`, `frontend/src/components/ContextBuilder.tsx`, `frontend/src/pages/protected/ArtifactsPage.tsx`, `frontend/src/index.css`, and shared artifact helpers.

## Auth, API, Billing, and Frontend Shell
- Added frontend auth bootstrap wiring after sign-in, sign-up, and restored Supabase sessions.
- Added Supabase-aware API client headers so frontend requests carry the Supabase access token and active workspace context.
- Added workspace-id persistence and UUID cleanup for frontend API calls.
- Reduced product-facing workspace language in the protected frontend so the app UX better matches profile-scoped artifact ownership.
- Added middleware-backed backend request context resolution with Supabase JWT verification and controlled local bypass support.
- Added Supabase-aware workspace bootstrap logic for signup/login flows.
- Added authenticated and local-first backend contract coverage for health, auth bootstrap, workspace data, chat, compare, runs, artifacts, export, reminders, storage, and integration status.
- Added local workspace scoping to chat, artifacts, reminders, and runs in the SQLite-backed store for local/test continuity.
- Added storage upload and signed URL backend contracts for the `artifacts` bucket.
- Added billing status resilience so Settings still loads a free-plan account state when billing storage is unavailable.
- Disabled upgrade/manage actions when Stripe is not configured instead of breaking account usage.
- Verified Stripe checkout creation without blocking login, account creation, or free-plan usage.
- Updated Pricing, Settings, AuthContext, AppShell, DashboardLayout, and frontend styling for the latest auth/billing/product behavior.

## Supabase Schema, RLS, Storage, and Migrations
- Added profile-scoped artifact/run ownership with `owner_profile_id`, runtime filtering, RLS policy updates, and matching Supabase migrations while retaining workspace IDs as hidden legacy routing.
- Fixed the `SupabaseDataStore.get_artifact()` and `SupabaseDataStore.get_run()` bug in `backend/src/runtime_store.py` where the query builder was assigned to `response` but later referenced as an undefined `statement`.
- Updated Supabase artifact/run reads so they are scoped by `owner_profile_id` / `created_by` in addition to workspace filtering.
- Added focused tests in `backend/tests/test_runtime_store.py` that mock Supabase query builder behavior and catch the exact `statement` variable regression for both artifact and run reads.
- Confirmed artifact and run writes save against the authenticated user's profile and can be reused across studios.
- Added Supabase security hardening migration/source for billing RLS policy drift and anonymous SECURITY DEFINER RPC execution.
- Added Supabase RPC hardening that moves workspace bootstrap to the backend service-role client and revokes direct authenticated execution from public SECURITY DEFINER helper functions.
- Applied pending Supabase storage, profile-scope, billing/RPC hardening, and reminders FK index migrations to the linked project through Supabase MCP when CLI push was blocked by older remote migration-history drift.
- Applied the SECURITY DEFINER authenticated RPC hardening migration to the linked project through Supabase MCP.
- Performed a full Supabase security/RLS hardening pass after the public schema was approved for reset.
- Dropped and rebuilt the disposable Beyond Chat Supabase public schema from the canonical SQL files in `backend/sql-related-files/`.
- Recreated and verified the private `artifacts` and `user-uploads` Supabase Storage buckets.
- Verified workspace-scoped storage object policies and Excel MIME type support.
- Replaced SECURITY DEFINER helper-function-based RLS policies with direct membership predicates so authenticated table reads no longer depend on direct helper execution permission.
- Added `backend/sql-related-files/014_direct_membership_rls.sql`.
- Added matching migration `supabase/migrations/20260504071000_direct_membership_rls.sql`.
- Fixed UUID regex/cast issues in the hardening SQL files so invalid workspace IDs are filtered before UUID casts.
- Fixed matching UUID regex/cast issues in the Supabase migration files.
- Mirrored older remote-recorded Supabase migration versions locally to reduce future CLI migration drift.
- Deleted obsolete local-only `supabase/migrations/001_billing.sql` drift.
- Added local migration files for older remote versions including initial schema, artifacts/runs, workspace membership, users/workspaces/members, chat tables, integration tables, artifacts/runs base, run extensions, artifact extensions, RLS policies, storage setup, cleanup/fixes, RPC hardening, and direct membership RLS.
- Verified Supabase migration state with `npx supabase migration list --linked`.
- Verified `npx supabase db push --dry-run` reports the remote database is up to date.
- Added `frontend/.env.local` with local Supabase frontend configuration so real browser E2E can use Supabase Auth locally.

## Live E2E and Provider Verification
- Created disposable Supabase users for local E2E verification.
- Verified Supabase password sign-in returns a valid JWT.
- Verified backend bootstrap and workspace endpoints use Supabase JWT auth.
- Verified authenticated users can read their own workspace/artifact data after the direct-membership RLS rewrite.
- Verified authenticated users cannot directly execute revoked helper functions such as `is_workspace_member`.
- Ran browser login E2E through the real frontend with Supabase Auth.
- Navigated and verified protected routes for Dashboard, Chat, Writing, Research, Data, Finance, Image, Artifacts, and Settings.
- Verified OpenRouter chat with a live model call.
- Verified Compare as a shared model-output comparison flow with OpenRouter.
- Verified Research uses live Exa and records Exa-backed run steps.
- Verified Data CSV upload, preview/profile, OpenRouter-backed analysis, chart output, and table output.
- Verified Writing targeted edit returns replacement text only and does not include surrounding context.
- Verified Stripe billing status and checkout creation while preserving free-plan usability.
- Verified OpenRouter image generation and Supabase Storage persistence for generated images.
- Verified Finance/Dexter reaches terminal completed state with live finance data.
- Verified `/api/status/providers` reports OpenRouter, Exa, Financial Datasets, OpenRouter Images, Supabase, Supabase Storage, and local Dexter correctly.

## Testing / Validation
- Ran backend tests with `uv run pytest`; final result was `39 passed, 2 warnings`.
- Ran frontend lint with `bun run lint`; passed.
- Ran frontend tests with `bun run test`; final result was `5 passed`.
- Ran frontend production build with `bun run build`; passed with existing large chunk warnings only.
- Ran Dexter TypeScript typecheck with `npm run typecheck`; passed.
- Ran `git diff --check`; only CRLF warnings appeared.
- Ran Supabase migration list through `npx supabase migration list --linked`; local and remote migrations aligned through `20260504071000`.
- Ran `npx supabase db push --dry-run`; remote database was up to date.
- Ran Supabase security advisor; only leaked password protection remains, which requires Supabase Pro.
- Ran Supabase performance advisor; only unused-index info warnings remain, which are not urgent before representative traffic.
- Verified storage buckets are private and support the required upload types.
- Verified policies no longer depend on authenticated direct execution of SECURITY DEFINER helper functions.

## Research / Technical Findings
- Supabase RLS policies that call helper functions can break after revoking direct execution from `authenticated`; direct membership predicates are safer for exposed table policies.
- Workspace filtering alone is not enough for saved user outputs; artifacts and runs need profile ownership checks so users in the same workspace do not see each other's private outputs.
- Supabase Auth JWT verification is working through the backend's `auth.get_user(token)` path, so local backend requests use real Supabase sessions rather than local bypass logic.
- Data Studio produces meaningful analysis only when the model receives real uploaded file bytes, schema/profile data, rows, and summary stats.
- Research should fail when Exa is not configured because fake search output would make saved artifacts untrustworthy.
- Writing targeted edits need a strict contract that returns only replacement text; including before/after context would overwrite unrelated document content.
- Compare works best as a shared model-output comparison panel, not as a separate artifact-comparison studio.
- Finance/Dexter's local runtime is a valid development path even without a remote sandbox runner, so provider status must reflect local runtime availability.
- Stripe billing should degrade gracefully to free-plan usage when billing storage or checkout is unavailable.
- Browser E2E catches important integration bugs that isolated tests miss, especially around Supabase session restore, protected routes, auth headers, and provider status display.
- Supabase migration drift can come from older remote-recorded versions; mirroring those versions locally makes future CLI workflows safer.

## Blockers / Risks
- Supabase leaked password protection is still disabled because it requires Supabase Pro; this is an external/manual limitation, not a code blocker.
- Supabase unused-index advisor warnings remain informational until the app has representative traffic.
- Google Calendar OAuth remains external/manual because OAuth credentials, consent setup, and real calendar integration are still required.
- Production deployment still needs environment variables kept in sync across frontend, backend, sandbox runner, Supabase, OpenRouter, Exa, Financial Datasets, Stripe, and Dexter.
- Vercel Sandbox execution for Dexter still needs deployment-side verification even though local Dexter execution and the shared event model are working.
- Some generated Dexter cache/scratchpad files appeared during live finance testing, so generated runtime files need to stay out of source control unless intentionally committed as fixtures.

## Hours Worked
- Total estimated time: 30 hours
