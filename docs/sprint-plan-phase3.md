# Phase 3 Sprint Plan

Status: historical planning document, refreshed against the current app surface on May 4, 2026.

## Sprint Goal

Turn Beyond Chat from a partial MVP into a coherent alpha product with real protected flows, shared artifact handling, and disconnected-safe provider integrations.

## Streams

### Backend

- Finalize JWT enforcement and workspace bootstrap
- Stabilize run/artifact/chat endpoints
- Wire provider adapters behind consistent readiness states
- Prepare Supabase SQL handoff files
- Preserve billing, storage, and provider failure states as explicit API responses

### Frontend

- Finish protected route map
- Harden login and signup flows
- Keep compare inside chat
- Ensure writing, research, image, data, finance, and artifact surfaces all render against real API contracts
- Keep Data Studio upload/preview/analyze flows aligned with the storage-backed backend contract
- Keep Settings usable when Stripe or provider credentials are absent

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

## Current Follow-Through

- Compare is implemented as an in-studio shared panel rather than a route.
- Protected studio routes exist for dashboard, chat, writing, research, image, data, finance, artifacts, and settings.
- Supabase SQL assets and migration mirrors exist, but hosted schema changes still require careful manual/CLI coordination.
- Remaining work is mostly external credential validation and product hardening rather than route scaffolding.
