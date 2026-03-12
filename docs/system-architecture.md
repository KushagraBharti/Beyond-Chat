# System Architecture Diagram

```mermaid
flowchart LR
    User["User"] --> FE["React + Vite Frontend"]
    FE --> Auth["Supabase Auth Client"]
    FE --> API["FastAPI Backend"]

    API --> Local["Local SQLite Store"]
    API --> OR["OpenRouter"]
    API --> Tavily["Tavily Search"]
    API --> Google["Google Calendar OAuth / Events"]
    API --> SB["Supabase Postgres + Storage"]

    SB --> AuthUsers["auth.users"]
    SB --> PublicTables["public.workspaces / workspace_members / artifacts / runs / run_steps / chat_*"]

    FE --> Studios["Home / Chat / Writing / Research / Image / Data / Finance / Artifacts / Settings"]
    Studios --> Context["Context Builder"]
    Studios --> Runs["Runs + Run Steps"]
    Studios --> Artifacts["Artifact Library"]
```

## Notes

- The frontend is the primary workspace shell and studio UI.
- Supabase Auth is the intended production session source.
- FastAPI owns orchestration, exports, provider status, runs, compare, and workspace bootstrap logic.
- Local SQLite keeps development unblocked before Supabase setup is fully complete.
- Supabase Postgres and Storage remain the intended production persistence layer.
