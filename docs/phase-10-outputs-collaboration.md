# Phase 10: Outputs and Collaboration

This phase introduces a provider-owned boundary for durable outputs and multiplayer review without wiring unverified production providers into the active backend. The executable reference is `packages/output-collaboration`.

## Delivered contracts

- Typed document, spreadsheet, presentation, data/chart, and image payloads.
- Immutable versions, content hashes, checkpoints, optimistic head checks, idempotency, restore, branch, compare, and promote.
- Domain-path diffs and structural validation. The deterministic adapter supports document, spreadsheet, data/chart, and image previews. Presentation rendering is truthfully `preview_only` until a production renderer can test slide overflow and assets. The frontend labels every editor `preview_only` or `unsupported` until its production persistence/provider path is connected.
- Project grants, anchored comments, valid-member mentions, notifications, review requests/decisions, and activity events.
- Separate `RealtimePort` and `YjsProviderPort`. Realtime carries presence, progress, notifications, activity, and permission invalidation; it is not a CRDT.
- Deterministic in-memory Yjs-provider conformance model with idempotent operations, stable concurrent insertion ordering, session revocation, and per-operation authorization.

## Production integration needs

1. **Supabase persistence:** review and translate `schema/phase10-proposal.sql` into the canonical migration. Add canonical UUID defaults, foreign keys to organizations/projects/profiles, check constraints, RLS policies, transaction-scoped idempotency storage, and generated database types. Writes that advance `outputs.head_version_id` must use `select ... for update` or a compare-and-swap RPC.
2. **Supabase Realtime:** use private project channels. Presence payloads contain only user ID, coarse output/task location, and last-seen state. Broadcast run progress and durable record hints; clients refetch authorized rows. On share revision/revocation, remove the subscriber and invalidate cached queries. Never broadcast output bodies, provider credentials, or high-frequency editor updates.
3. **Hosted Yjs:** implement `YjsProviderPort` with Liveblocks (or another reviewed provider), TipTap/Yjs document rooms, short-lived server-minted room tokens, project/output authorization at token issue and refresh, immediate room eviction on revoke, durable Yjs snapshots in object storage, and checkpoint conversion into immutable `output_versions`. Provider room history is not the authoritative output history.
4. **Rendering and validation:** connect sandbox/runtime artifact upload to object storage using immutable keys and verified hashes. Add LibreOffice/Pandoc/Chromium render workers, formula/reference inspection, font/asset/link/citation/secret checks, accessibility checks where supported, and bounded retry/repair. Persist adapter version and runtime provenance with every render/validation.
5. **Runtime:** emit checkpoint requests through the Beyond command/event protocol; do not let a sandbox mutate output rows directly. Runs remain immutable. A branch creates new output versions referencing a source version; promote is an authorized compare-and-swap, not a run-history rewrite.

## Revocation invariant

Authorization is checked at durable API entry, Realtime subscription/refresh, and every collaborative edit. Revocation increments the share revision, commits durably, broadcasts invalidation, evicts the Yjs session, and rejects stale durable writes. Already committed versions, CRDT operations, comments, and audit events remain intact.

## Validation

From `packages/output-collaboration`, run `npm install`, `npm test`, `npm run typecheck`, `npm run eval`, and `npm audit --omit=dev`. Frontend validation remains `npm test`, `npm run build`, and `npm run lint` from `frontend`.
