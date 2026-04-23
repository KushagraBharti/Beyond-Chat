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

    PG --> Workspace["workspaces / workspace_members / user_profiles"]
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
