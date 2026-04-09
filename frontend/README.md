# Beyond Chat Frontend

Production frontend for Beyond Chat.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase client auth

## Product Surface

- Public: landing, pricing, login, signup
- Protected: home, chat, writing, research, image, data, finance, artifacts, settings
- Shared systems: app shell, auth, compare panel, context builder, artifact flows

## Environment

Copy `env.example` to `.env.local`.

Required values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional:

- `VITE_API_BASE_URL`

## Commands

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 5173
npm run build
npm run test
```

## Notes

- Compare is implemented as a shared panel, not a standalone route.
- This is the only active frontend application in the repo.
