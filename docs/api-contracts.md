# Initial API Contracts

## Contract Principles

- Health remains publicly reachable.
- Provider status remains publicly reachable for readiness rendering.
- All product routes except health require authenticated context.
- Provider-backed routes must fail gracefully with explicit status and error information.
- Artifact-producing routes should preserve selected context IDs and provenance metadata.

## Core Endpoints

### Health

- `GET /api/health`
- Returns backend reachability status.

### Root

- `GET /`
- Returns backend service identity and reachability status.

### Auth Bootstrap

- `POST /api/auth/bootstrap`
- Ensures the authenticated user has a workspace and workspace membership.

### Workspace

- `GET /api/workspace`
- Returns workspace identity and current auth mode metadata.

### Providers

- `GET /api/status/providers`
- Returns normalized provider states:
  - `connected`
  - `disconnected`
  - `not_configured`
  - `error`
  - Includes OpenRouter, Exa, Dexter, financial datasets, image generation, Supabase, Supabase Storage, Google Calendar, Notion, Google Drive, and Slack.

### Billing

- `GET /api/billing/status`
  - Returns the authenticated account plan, monthly usage, limits, billing storage state, and Stripe checkout/portal configuration flags.
  - If billing storage is unavailable, the endpoint returns a non-blocking free-plan status with zero usage and `billing_storage: "unavailable"` so Settings can still load.
- `POST /api/billing/checkout`
  - Requires Stripe secret and Pro price configuration; otherwise returns a setup error instead of creating a checkout session.
- `POST /api/billing/portal`
  - Requires Stripe configuration and an existing Stripe customer for the account.

### Chat

- `GET /api/chat/threads`
- `POST /api/chat/threads`
- `GET /api/chat/threads/{thread_id}`
- `POST /api/chat/threads/{thread_id}/messages`
- `POST /api/chat/threads/{thread_id}/messages/stream`
- `PATCH /api/chat/threads/{thread_id}`
- `DELETE /api/chat/threads/{thread_id}`
  - Accepts optional `context_ids` so selected artifacts are merged into the provider prompt while the original user message remains stored unchanged.
  - Frontend assistant messages expose Save to artifact as `chat_response` records.
  - Frontend assistant messages can continue into Research, Writing, or Compare with the assistant response content passed forward.
  - Chat welcome state exposes launch-planning quick actions that populate the live composer instead of creating fake plan artifacts.
- `POST /api/chat/compare`
  - Compares model outputs from OpenRouter with the same prompt and context.
  - Accepts optional OpenRouter-compatible `tools` and `tool_choice` fields and preserves returned tool-call metadata per model result.
  - Frontend shared panel supports saving a selected result as an artifact and handing a selected result back to the originating studio.

### Runs

- `POST /api/runs`
- `GET /api/runs/{run_id}`
- `GET /api/runs/{run_id}/steps`
  - Research runs require live Exa search and synthesize source-backed markdown with Executive Summary, Key Findings, Competitor or Landscape Matrix, Opportunity/Risk Matrix, Recommended Next Steps, and Sources sections.
  - Frontend run output panels for Research and Finance can continue generated markdown into downstream studios using route state instead of manual copy/paste.

### Data

- `POST /api/data/preview`
  - Accepts a Supabase Storage path for CSV, XLSX, or XLS files.
  - Returns headers, first rows, row/column counts, column dtypes, and missing-value counts.
- `POST /api/data/analyze`
  - Accepts the same uploaded data file path plus prompt/model.
  - Records data run steps and returns insight, metrics, risks, recommendations, chart, and table output.
  - Frontend exposes separate save actions for the combined analysis, generated chart, and generated table artifacts.
  - Frontend renders bar, line, pie, and scatter chart responses without adding chart-library dependencies.
  - Frontend can continue the generated analysis into Finance, Writing, or Compare by passing the full markdown analysis as the next prompt/template.
  - Data accepts route-prefilled prompts from upstream Research/Finance handoffs.

### Writing

- `POST /api/runs` with `studio: "writing"`
  - Standard mode drafts markdown from prompt/context.
  - Targeted edit mode uses `options.mode: "targeted_edit"` plus `selected_text`, `before_context`, and `after_context`.
  - Targeted edit output is replacement text for the selected range only; callers apply it to that range rather than rewriting the whole document.
  - Accepts `context_ids` like other run-based studios; the Writing editor exposes Context Builder and passes selected artifact context into assistant runs and Compare.
  - Multi-output mode uses `options.mode: "multi_output"` and `options.documents` to return multiple artifact-ready markdown documents from one live writing run.
  - Frontend assistant suggestions expose Save to artifact as `writing` records linked to the originating run when available.
  - Writing library can save all returned multi-output documents as separate `writing` artifacts with shared source-run/context provenance.

### Image

- `POST /api/runs` with `studio: "image"`
  - Accepts `context_ids`; selected artifact context is merged into the prompt before image prompt enhancement and generation.
  - Frontend exposes Context Builder in Image Studio and preserves selected context IDs in saved image artifact metadata.

### Artifacts

- `POST /api/artifact`
- `GET /api/artifacts`
- `GET /api/artifact/search`
- `GET /api/artifact/{artifact_id}`
- `PATCH /api/artifact/{artifact_id}`
- `DELETE /api/artifact/{artifact_id}`
- `POST /api/artifact/{artifact_id}/export`
- `POST /api/artifacts/export-bundle`
  - Product-facing artifact records are owned by the authenticated user profile via `ownerProfileId`.
  - `workspace_id` may remain in responses as legacy/internal routing metadata and should not be presented as collaboration scope.
  - Bundle export accepts selected artifact IDs and returns a combined Markdown artifact bundle.

### Context Builder

- Frontend source tabs: Artifacts, Notion, Files, Calendar, Slack.
- Artifact context is selectable and passed by `context_ids`.
- Non-artifact sources show real provider availability states and are not selectable until live connector data paths exist.
- Artifact detail handoffs pass selected artifact context into Chat, Research, Finance, Writing, and Compare.

### Workspace Productivity

- `GET /api/reminders`
- `POST /api/reminders`
- `DELETE /api/reminders/{reminder_id}`

### Integrations

- `POST /api/integrations/google-calendar/connect-start`
- `GET /api/integrations/google-calendar/status`
- `GET /api/integrations/google-calendar/events`
  - Returns an empty list until a real calendar data path is connected; no deterministic preview events are returned.

### Storage

- `POST /api/storage/artifacts/upload`
- `POST /api/storage/artifacts/signed-url`

## Current Compatibility Aliases

- `POST /api/compare` aliases `POST /api/chat/compare`.
- `POST /api/run` aliases `POST /api/runs`.
- Plural artifact routes under `/api/artifacts/*` mirror the singular `/api/artifact/*` routes where implemented.
