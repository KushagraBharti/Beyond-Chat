# Beyond Chat Frontend

React + TypeScript + Vite frontend for Beyond Chat.

## Environment

Copy `frontend/env.example` to `frontend/.env`.

Key variables:

- `VITE_ENABLE_MVP_BYPASS`
- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Run locally

```powershell
bun install
bun run dev --host 127.0.0.1 --port 5173
```

## Validation

```powershell
bun run build
bun run test
```

## Main App Areas

- public pages: landing, pricing, login/signup
- protected pages: dashboard, chat, writing, research, image, data, finance, artifacts, settings
- shared systems: auth context, API client, protected layout, context builder, run timeline
