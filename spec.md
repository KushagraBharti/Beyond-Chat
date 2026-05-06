# Beyond Chat Product Spec

## Product Definition

Beyond Chat is a modular AI workspace for artifact-first work. Users move through dedicated studios instead of collapsing every task into one generic chat feed. The product is organized around reusable outputs, explicit workflows, and workspace-scoped context.

## Product Vision

- Replace endless chat history with structured studio workflows
- Treat outputs as first-class artifacts that can be searched, reopened, exported, and reused as context
- Make model comparison available from the active workflow without forcing route changes
- Keep one coherent product surface instead of parallel prototype apps

## Canonical Surface Area

### Public Routes

- Landing
- Pricing
- Login
- Signup
- Auth callback
- Forgot password
- Reset password
- Billing success/cancel

### Protected Routes

- Dashboard
- Chat
- Writing
- Research
- Image
- Data
- Finance
- Artifacts
- Settings

### Explicitly Removed

- Standalone `/compare` route
- Local-auth product mode
- SQLite-backed hosted runtime
- `frontend-mock/` as an active application
- Fake provider data as product behavior

## Core Concepts

### Studios

Studios are purpose-built workflows. Each studio has its own framing, controls, and outputs, but they share one app shell, one auth model, one context model, and one artifact library.

### Artifacts

Artifacts are the durable units of value in the product. They are searchable, filterable, exportable, and attachable as context to future runs. Writing drafts, research reports, compare results, generated images, and data outputs all become artifacts.

### Shared Compare Panel

Compare remains a core capability, but it is invoked as a shared reusable panel from Chat and any other studio that needs side-by-side model output review. Compare is no longer its own destination.

### Workspace Context

All protected data is workspace-scoped. Auth, chat threads, artifacts, runs, reminders, and storage paths resolve inside the active workspace.

### Profile Ownership

Artifacts and runs are product-facing user-profile records. Workspace IDs still appear in some API responses and database rows for compatibility, storage path isolation, and bootstrap routing, but the interface should not present collaboration or workspace management as a shipped feature.

## Studio Expectations

### Home

- dashboard overview
- reminders
- provider status
- quick links into studios
- recent artifact activity and per-studio saved output counts

### Chat

- persistent threads and collections
- model selection
- context attachment
- launch point for the shared compare panel
- streamed and non-streamed assistant responses
- save assistant output as `chat_response` artifacts
- continue assistant output into Research, Writing, or Compare

### Writing

- writing library
- editor experience
- save/reopen writing artifacts
- targeted edit mode for selected text
- multi-output launch kit generation
- context-aware assistant drafts and compare handoffs

### Research

- prompt + context
- structured run output
- source visibility
- save-to-artifact flow
- Exa-backed source gathering is required for live research behavior

### Image

- prompt controls
- model/ratio/style options
- generated image outputs
- storage-backed saved results
- selected artifact context is included in prompt enhancement and saved metadata

### Data

- upload and prompt-driven analysis
- run output and step history
- save-to-artifact flow
- CSV, XLSX, and XLS preview/profile parsing
- decision metrics, risks, recommendations, charts, and tables
- separate save actions for combined analysis, generated chart, and generated table artifacts

### Finance

- finance-oriented research/synthesis workflow
- timeline and structured memo output
- Dexter-inspired agent behavior is the reference pattern for tool calling, steps, and artifact-producing runs

### Artifacts

- search
- filters
- detail view
- export to Markdown/PDF
- multi-select Markdown bundle export
- handoffs into Chat, Research, Finance, Writing, and Compare

### Settings

- authenticated user state
- provider/connectivity status
- workspace/runtime-facing configuration visibility
- billing status, checkout, and portal actions when Stripe is configured

## UX Rules

- Protected screens must feel like one product, not mixed prototypes
- Shared UI primitives should be reused across studios
- Tailwind CSS is the canonical frontend styling layer
- Provider-backed states must degrade clearly when a provider is disconnected or not configured
- Navigation must be stable and predictable
- Non-artifact connector tabs must show real availability states and remain non-selectable until live data paths exist
- Studio output handoffs should preserve source text and selected artifact context rather than forcing copy/paste

## Technical Contract

### Frontend

- React + TypeScript + Vite + Tailwind CSS
- feature-oriented structure:
  - `app shell`
  - `auth`
  - `studios`
  - `artifacts`
  - `shared compare panel`
  - `shared ui`

### Backend

- FastAPI
- Supabase Auth verified request context
- Supabase Postgres for persistence
- Supabase Storage for uploaded/generated files
- OpenRouter for model calls
- Exa for research search
- Stripe for billing status, checkout, and portal flows
- Google Calendar scaffolding for future live calendar integration

### Persistence

Hosted runtime persistence is limited to:

- workspaces and membership
- chat collections, threads, and messages
- artifacts
- runs and run steps
- reminders
- billing customers, subscriptions, and usage events
- storage uploads and signed URLs

## Non-Goals

- Maintaining a second active frontend under `frontend-mock/`
- Supporting local bypass as a product feature
- Preserving outdated route/documentation structure for backward comfort

## Done Criteria For Reorganization

- The protected route surface matches this spec
- Compare is only available through shared invocation points
- Docs no longer describe SQLite/local bypass as supported architecture
- The repo presents one canonical stack and one canonical runtime story
- Data, Writing, Research, Image, Chat, Finance, and Artifacts all preserve artifact context through their main handoff paths
