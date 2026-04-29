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

### Protected Routes

- Home
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

## Core Concepts

### Studios

Studios are purpose-built workflows. Each studio has its own framing, controls, and outputs, but they share one app shell, one auth model, one context model, and one artifact library.

### Artifacts

Artifacts are the durable units of value in the product. They are searchable, filterable, exportable, and attachable as context to future runs. Writing drafts, research reports, compare results, generated images, and data outputs all become artifacts.

### Shared Compare Panel

Compare remains a core capability, but it is invoked as a shared reusable panel from Chat and any other studio that needs side-by-side model output review. Compare is no longer its own destination.

### Workspace Context

All protected data is workspace-scoped. Auth, chat threads, artifacts, runs, reminders, and storage paths resolve inside the active workspace.

## Studio Expectations

### Home

- workspace overview
- reminders
- provider status
- quick links into studios

### Chat

- persistent threads and collections
- model selection
- context attachment
- launch point for the shared compare panel

### Writing

- writing library
- editor experience
- save/reopen writing artifacts

### Research

- prompt + context
- structured run output
- source visibility
- save-to-artifact flow

### Image

- prompt controls
- model/ratio/style options
- generated image outputs
- storage-backed saved results

### Data

- upload and prompt-driven analysis
- run output and step history
- save-to-artifact flow

### Finance

- finance-oriented research/synthesis workflow
- timeline and structured memo output

### Artifacts

- search
- filters
- detail view
- export to Markdown/PDF

### Settings

- authenticated user state
- provider/connectivity status
- workspace/runtime-facing configuration visibility

## UX Rules

- Protected screens must feel like one product, not mixed prototypes
- Shared UI primitives should be reused across studios
- Tailwind CSS is the canonical frontend styling layer
- Provider-backed states must degrade clearly when a provider is disconnected or not configured
- Navigation must be stable and predictable

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
- Tavily for research search

### Persistence

Hosted runtime persistence is limited to:

- workspaces and membership
- chat collections, threads, and messages
- artifacts
- runs and run steps
- reminders
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
