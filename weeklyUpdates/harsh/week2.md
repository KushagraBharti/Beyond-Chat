# Week 2 Report — Harsh Kothari

**Date**: March 1–5, 2026

---

## Summary

This week focused on three areas: fixing backend stability, building the authenticated dashboard experience, and deploying the frontend to Vercel.

---

## Completed

### 1. Backend Dependency Fix
- Added missing `python-dotenv` and `supabase` packages to `backend/pyproject.toml`
- These were imported in `src/main.py` but never declared, causing runtime crashes
- Ran `uv sync` to install all 55 backend packages successfully

### 2. Dashboard Shell (Frontend)
- **DashboardLayout** — Fixed sidebar with logo, navigation links for all 6 studios, user avatar, and sign-out button
- **HomePage** — Replaced placeholder "Welcome back" card with a studio cards grid featuring:
  - Time-aware greeting (morning/afternoon/evening)
  - 6 clickable studio cards (Writing, Research, Image, Data, Finance, Model Compare)
  - Staggered entrance animations and hover effects using Framer Motion
- **StudioPage** — Placeholder page for each studio with header bar, "coming soon" state, and back navigation
- **Routing** — Added `/studio/:studioId` route with protected access via `DashboardLayout` wrapper

### 3. Vercel Deployment
- Deployed frontend to Vercel (via GitHub integration)
- Configured root directory to `frontend/`
- Added `vercel.json` with SPA rewrite rule for client-side routing
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel environment variables
- Updated Supabase Site URL to point to Vercel deployment instead of localhost

### 4. Housekeeping
- Added `api-credentials.txt` to `.gitignore` to prevent accidental secret commits

---

## Files Changed

| File | Action |
|------|--------|
| `backend/pyproject.toml` | Modified — added python-dotenv, supabase deps |
| `backend/uv.lock` | Updated — lockfile regenerated |
| `frontend/src/components/DashboardLayout.tsx` | Created — sidebar layout component |
| `frontend/src/pages/protected/HomePage.tsx` | Rewritten — studio cards grid |
| `frontend/src/pages/protected/StudioPage.tsx` | Created — studio placeholder page |
| `frontend/src/App.tsx` | Modified — added dashboard layout and studio routes |
| `frontend/vercel.json` | Created — SPA rewrite for Vercel |
| `.gitignore` | Modified — added api-credentials.txt |

---

## Commits

- `5eaefcd` — fix: add vercel.json SPA rewrite for client-side routing
- `e7d4dbb` — feat: add dashboard layout with sidebar, studio cards grid, and studio placeholder pages
- `01ffb57` — feat: implement Supabase auth – login and session management
- `8158fad` — wire Supabase auth login/signup

---

## Next Steps

- Fix pre-existing TypeScript build issue (`lib.es2023.d.ts` missing)
- Build out first functional studio (Writing Studio recommended)
- Add backend API endpoints for studio interactions (LLM integration)
- Set up Supabase database schema for artifacts and workspace data
- Commit and configure the `supabase/` directory
