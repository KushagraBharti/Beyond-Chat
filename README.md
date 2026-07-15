# Beyond Chat

A project-centered agentic hub where teams run reusable agents against company knowledge and turn their work into durable, reviewable outputs through shared memory, approvals, and automation.

Beyond Chat is designed as the central AI operating layer for a company. Instead of scattering work across isolated conversations, teams organize agents, knowledge, tools, applications, outputs, and automations around persistent projects.

## Product and highlights

Beyond Chat gives organizations one place to:

- Create projects with shared context and company knowledge.
- Run reusable General, Research, Finance, and organization-defined agents.
- Connect agents to files, databases, applications, tools, skills, and MCP servers.
- Save agent work as durable documents and structured outputs.
- Review, edit, version, approve, and reuse generated work.
- Preserve project and organization memory across runs.
- Configure repeatable automations around proven agent workflows.
- Inspect live tool calls, sources, execution progress, failures, and final outputs.
- Govern models, data access, tools, budgets, and approvals at the organization level.

The product surface includes Home, Chat, Work, Projects, Agents, Knowledge & Apps, Automations, Memory, and Settings/Admin. The goal is to make agents part of the company’s operating system rather than disposable chat sessions.

## How Beyond Chat works

### Primary user journey

```text
sign in
  ↓
select organization and project
  ↓
invoke a reusable agent
  ↓
load project knowledge, tools, memory, and policy
  ↓
execute inside an isolated sandbox
  ↓
stream steps, sources, and generated files
  ↓
save a durable collaborative output
  ↓
review, approve, reuse, or automate
```

### Agent resolution

When a user invokes an agent, the runtime resolves:

- The active organization and project
- The agent definition and version
- Allowed models
- Assigned skills and tools
- Connected applications
- Project and organization knowledge
- Scoped memory
- Budget and execution policy
- Human-approval requirements

This creates a reproducible execution contract rather than a loose prompt assembled in the browser.

### Durable execution

FastAPI creates a durable run record before execution begins. Runs support:

- Ordered events
- Leases and worker ownership
- Budgets
- Checkpoints
- Cancellation
- Suspension
- Recovery
- Reconciliation
- Generated files
- Human approvals
- SSE streaming and replay

The agent runtime is built around Pi, wrapped by Beyond Chat’s own application-server protocol. Production work executes inside isolated Modal sandboxes so agents can use tools, create files, and run code without sharing a mutable host environment.

### Knowledge, applications, and tools

Agents can work against:

- Uploaded project files
- Organization knowledge sources
- Connected external applications
- Native research and finance tools
- Composio integrations
- MCP servers
- Organization-authored skills
- Agent-scoped and project-scoped memory

Knowledge retrieval preserves citations so outputs remain reviewable. Tool and application access is filtered through organization policy rather than exposed globally.

### Durable outputs

A completed run is not reduced to one final chat message. Beyond Chat promotes useful work into saved outputs with:

- Source-run provenance
- Generated files
- Version history
- Review state
- Collaboration
- Approval status
- Project association
- Reuse as future context

This allows research, analysis, documents, and operational work to survive beyond the conversation that produced them.

### Identity, authorization, and data

- **WorkOS AuthKit** provides identity, organizations, invitations, memberships, and RBAC.
- **Supabase Postgres** stores organizations, projects, agents, runs, events, outputs, policies, and memory.
- **Supabase Storage** stores uploaded and generated files.
- **Supabase Realtime** supports organization-scoped updates where appropriate.
- Organization-scoped row-level security prevents cross-tenant access.

### Technologies and external dependencies

- **Frontend:** React, TypeScript, Vite, React Router, Tailwind CSS, TipTap
- **Backend:** Python, FastAPI, Pydantic, uv
- **Agent runtime:** Pi with Beyond Chat runtime adapters
- **Execution:** Modal sandboxes
- **Models:** OpenRouter
- **Identity:** WorkOS AuthKit
- **Data:** Supabase Postgres, Storage, and Realtime
- **Applications and tools:** Composio and MCP
- **Research:** Exa and connected knowledge sources
- **Deployment:** Vercel
- **Billing infrastructure:** Stripe

### Repository structure

```text
Beyond-Chat/
├── frontend/                    # Production React/Vite application
├── backend/                     # FastAPI API, persistence, providers, migrations
├── agents/                      # Built-in and organization-facing agent definitions
├── connectors/                  # Knowledge and application connectors
├── packages/
│   ├── contracts/               # Shared product contracts
│   ├── runtime-contracts/       # Agent-runtime protocol
│   ├── agent-registry/          # Agent definitions and versions
│   ├── skill-registry/          # Skill resolution
│   ├── app-registry/            # Connected application definitions
│   ├── knowledge-plane/         # Retrieval and citation contracts
│   ├── memory-plane/            # Scoped memory
│   ├── automation-engine/       # Scheduled and event-driven workflows
│   └── output-collaboration/    # Durable collaborative outputs
├── services/
│   ├── modal-runtime/           # Sandboxed agent execution
│   ├── modal-control-plane/     # Modal orchestration
│   └── local-app-server/        # Local runtime surface
├── supabase/migrations/         # Canonical database migrations
├── infra/                       # Deployment and infrastructure configuration
└── docs/                        # Architecture and operations references
```

## Quick start

Backend:

```powershell
cd backend
uv sync
uv run uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Create `backend/.env` and `frontend/.env.local` from their example files.

Open `http://127.0.0.1:5173`. The frontend proxies `/api/*` to the backend at `127.0.0.1:8000`.

Validate:

```powershell
cd backend
uv run pytest

cd ../frontend
npm run build
npm run test
```
