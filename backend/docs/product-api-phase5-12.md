# Phase 5-12 product API admission notes

The code under `src/product_api` is the mounted aggregate FastAPI surface for phases 5 through 12. It exposes authenticated contracts for catalog/slash discovery, capabilities and connection approvals, knowledge, memory, agent publishing, outputs and review, automations, and server-derived billing status. `src/product_persistence` supplies one repository contract, a test/development-only in-memory adapter, a Supabase/Postgres adapter, and a machine-readable schema manifest.

## Admission state

This surface is mounted in `src/main.py` at `/api/v2/product` with:

- canonical `require_principal` WorkOS resolution and CSRF enforcement;
- current project authorization plus canonical team membership/profile-grant authorization;
- `SupabaseProductRepository` whenever service-role Supabase is configured;
- the in-memory adapter only when `PRODUCT_API_ALLOW_IN_MEMORY=true` and `BEYOND_ENV` is explicitly `development`, `dev`, or `test`;
- transactional, service-role-only `product_create_record_once` and `product_update_record` RPCs from `20260711235500_product_plane_phase5_12.sql`.

Provider-backed operations still deny with `503` unless their complete credential and policy configuration is present. OpenRouter, Exa, and Composio are composed through the fail-closed live registry. Knowledge sync and automation dispatch remain disabled because no admitted execution adapter exists. The existing `billing_v2` foundation does not expose a production repository, so billing mapping remains disabled rather than inferring access. Billing and entitlement responses are forced to `disabled` unless a future server adapter returns `externally_verified=true`; request bodies cannot grant entitlements.

## Persistence rules

All 26 logical kinds share the canonical `product_records` table rather than duplicating the same physical schema 26 times. Every record has explicit organization/project/team columns, lifecycle state, a positive concurrency version, authorship, timestamps, and optional normalized parentage. `product_idempotency_keys` binds creates to a canonical request digest. Mutable writes use compare-and-swap; immutable version/audit kinds reject update RPCs. Writes append references to the existing canonical `audit_events` and `outbox_events` authorities.

The write RPCs are `SECURITY INVOKER`, tightly revoked from `public`, `anon`, and `authenticated`, and executable only by `service_role`. Authenticated access is read-only and RLS-filtered through current WorkOS identity, organization, project, team membership, and profile grant rows. Authorization never uses user-editable token metadata. Supabase transaction-pooler deployments must not rely on prepared statements.

## Endpoint root

All routes are rooted at `/api/v2/product`. Important groups are:

- `GET /catalog`, `GET /slash`
- `/projects/{project_id}/skills|tools|apps|mcp|connections|capability-approvals`
- `/projects/{project_id}/knowledge/connections|sources|syncs|retrieval|citations`
- `/projects/{project_id}/memory`
- `/projects/{project_id}/agents/drafts`, publish, and resolve
- `/projects/{project_id}/outputs`, versions, comments, reviews, realtime hints
- `/projects/{project_id}/automations`
- `GET /billing/status`, `GET /entitlements`

Creation/append operations require `Idempotency-Key`; shared mutable updates require integer `If-Match`.
