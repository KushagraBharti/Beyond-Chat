# System Architecture

```mermaid
flowchart LR
    User["User"] --> FE["React + Vite + Tailwind Frontend"]
    FE --> Auth["Supabase Auth Client"]
    FE --> API["FastAPI Backend"]

    FE --> Shell["App Shell"]
    Shell --> Studios["Home / Chat / Writing / Research / Image / Data / Finance / Artifacts / Settings"]
    Studios --> Compare["Shared Compare Panel"]
    Studios --> Context["Context Builder"]
    Studios --> Library["Artifact Library"]

    API --> Runtime["Supabase Request Context + Runtime Store"]
    Runtime --> PG["Supabase Postgres"]
    Runtime --> Storage["Supabase Storage"]

    API --> OR["OpenRouter"]
    API --> Exa["Exa"]
    API --> Google["Google Calendar Scaffolding"]

    PG --> Profile["user_profiles as product ownership scope"]
    PG --> Workspace["legacy/bootstrap workspace tables where already required"]
    PG --> Chat["chat_collections / chat_threads / chat_messages"]
    PG --> Work["artifacts / runs / run_steps / reminders"]
```

## Canonical Notes

- Hosted runtime is Supabase-only.
- Authenticated request context is derived from a Supabase session token.
- FastAPI owns orchestration, compare, workspace bootstrap, exports, provider status, and storage URL handling.
- `backend/sql-related-files/` is the live schema source of truth.
- `backend/src/store.py` remains only as a legacy local test store and is not part of the hosted architecture.
- `frontend-mock/` is archived reference material and not an active runtime target.
- `docs/agentic-artifact-workspace-plan.md` defines the next product architecture target for agentic studios and user-profile-scoped artifacts.
- Product-facing artifact and run ownership is user-profile scoped through `owner_profile_id`. Workspace IDs remain in some tables as hidden legacy/internal routing and bootstrap plumbing rather than visible collaboration UX.
- Finance/Dexter is the canonical reference for agent loop, tool calling, run steps, and artifact-producing behavior.
- Research, Data, Writing, Image, Chat, and Compare should converge on the same agentic artifact-producing pattern.
- Live providers are required for product behavior: OpenRouter for LLMs, Exa for research, Supabase for persistence/storage. Do not add deterministic demo fallbacks as product behavior.
- Frontend work should use `high-end-visual-design`, `gpt-taste`, `design-taste-frontend`, and `frontend-design`, while preserving the current Beyond Chat theme and architecture.
- Supabase/Postgres work should use the repo-local `supabase-postgres-best-practices` skill.
