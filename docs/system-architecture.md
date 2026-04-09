# System Architecture

```mermaid
flowchart LR
    User["User"] --> FE["React + Vite Frontend"]
    FE --> Auth["Supabase Auth Client"]
    FE --> API["FastAPI Backend"]

    API --> Runtime["Runtime Store Router"]
    Runtime --> PG["Supabase Postgres"]
    Runtime --> Local["Legacy SQLite Fallback (local bypass only)"]

    API --> OR["OpenRouter"]
    API --> Tavily["Tavily Search"]
    API --> Google["Google Calendar Connect Scaffolding"]
    API --> Storage["Supabase Storage"]

    PG --> Workspace["workspaces / workspace_members / user_profiles"]
    PG --> Chat["chat_collections / chat_threads / chat_messages"]
    PG --> Work["artifacts / runs / run_steps / reminders"]

    FE --> Studios["Dashboard / Chat / Writing / Research / Image / Data / Finance / Artifacts / Settings"]
    Studios --> Context["Context Builder"]
    Studios --> Runs["Run timelines + saved outputs"]
    Studios --> Library["Artifact Library"]
```

## Notes

- The frontend is the main workspace shell and studio UI.
- Supabase Auth is the primary hosted session source.
- FastAPI owns orchestration, compare, exports, provider status, run execution, and workspace bootstrap.
- `src/runtime_store.py` now routes authenticated hosted requests to Supabase/Postgres.
- The legacy SQLite store remains only for local bypass and local test-style fallback flows.
- Supabase Storage is used for artifact uploads and generated image files.
- Google Calendar remains scaffolded; the hosted deployment path does not depend on it.
