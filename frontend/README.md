# Beyond Chat Frontend

Production frontend for Beyond Chat.

## Stack

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4 via `@tailwindcss/vite`
- Supabase client auth
- React Router 7
- Vitest

## Product Surface

- Public: landing, pricing, login, signup redirect, auth callback, forgot password, reset password, billing success/cancel
- Protected: dashboard, chat, writing, research, image, data, finance, artifacts, settings
- Shared systems: app shell, auth, compare panel, context builder, artifact flows
- Chat and Image own dedicated layouts; the remaining protected studios use `DashboardLayout`
- Temporary protected design previews are available at `/designs/1` through `/designs/6`

## Environment

Copy `env.example` to `.env.local`.

Required values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Commands

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
npm run lint
npm run build
npm run test
```

## Notes

- Compare is implemented as a shared panel, not a standalone route.
- This is the only active frontend application in the repo.
- API calls use the current Supabase session token and optional `X-Workspace-Id` header.
- The active workspace ID is stored in `localStorage` as `bc.workspace_id`.
- Data Studio supports CSV, XLSX, and XLS uploads through backend storage endpoints.
- Settings reads billing/provider status and disables paid actions when backend billing or Stripe configuration is unavailable.
