# Phase 3 Sprint Plan

## Sprint Goal

Turn Beyond Chat from a partial MVP into a coherent alpha product with real protected flows, shared artifact handling, and disconnected-safe provider integrations.

## Streams

### Backend

- Finalize JWT enforcement and workspace bootstrap
- Stabilize run/artifact/chat endpoints
- Wire provider adapters behind consistent readiness states
- Prepare Supabase SQL handoff files

### Frontend

- Finish protected route map
- Harden login and signup flows
- Keep compare inside chat
- Ensure writing, research, image, data, finance, and artifact surfaces all render against real API contracts

### QA

- Build verification with Bun and uv
- Add pytest + Vitest baselines
- Run Playwright checks on local integrated flows

## Exit Criteria

- Health endpoint works
- Protected routes resolve
- Supabase client/auth wiring is in place
- Schema and RLS SQL files exist for manual execution
- Docs exist for API, architecture, spec, completed work, manual steps, and blockers
