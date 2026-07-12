# Phase 8 Memory

Phase 8 is implemented as a provider-neutral domain package and an integration-neutral React inspection surface. It deliberately does not modify the identity, runtime, workspace shell, or active canonical migration while those phases stabilize.

## Delivered behavior

- User and project memory spaces are available. Team space creation and recall are denied until `team_memory_enabled` is set by an organization-owned policy.
- The lifecycle is explicit: a remember request creates a proposal; accept activates it; reject closes it; edit creates a revision; delete removes content from active retrieval and requests embedding/cache cleanup.
- Contradictory content creates a review proposal linked to the active entry. Accepting it appends a revision instead of silently overwriting history.
- Retrieval repeats organization/scope checks, excludes disabled, deleted, expired, stale, irrelevant, and policy-denied sensitive entries, and persists both recalled IDs and denial reasons. A backend expiry sweep marks due entries and requests derived-index cleanup; retrieval fails closed even before that sweep runs.
- A shared agent gets no user memory unless the exact personal space ID is in `attached_personal_space_ids` for that invocation.
- Recall results include scope, match reasons, provenance event IDs, sensitivity, and last-update time for “why recalled” inspection.
- Compaction is a proposal containing ordered durable-event references. It does not mutate or replace the authoritative event log.
- Export includes accessible, non-deleted entries and their revisions. Disabled spaces remain exportable to their owner because disable controls recall, not ownership or portability.

## Package boundaries

`@beyond/memory-plane` exports canonical schema-independent types, `MemoryService`, `MemoryPersistencePort`, `IdentityAuthorizationPort`, and `RuntimeMemoryPort`. `InMemoryMemoryPersistence` is a deterministic conformance adapter for tests and local integration, not a production store.

The React surface under `frontend/src/components/memory` consumes view DTOs and callbacks. It is intentionally not routed from the active workspace shell yet. The eventual app adapter must map server-owned memory DTOs to these views and send all mutations to server commands; the browser must never enforce authorization by itself.

## Required integrations

### Identity (Phase 2)

The server adapter must construct `MemoryActor` only from verified server identity and provide `IdentityAuthorizationPort` with:

- canonical internal `organization_id` and `user_id`;
- current project grant for project memory management/read;
- live team membership for team memory;
- resource-level permission checks for manage versus read;
- an invocation-scoped list of explicitly attached personal space IDs, never a client-trusted audience claim;
- organization memory policy, including sensitivity/retention rules and the team-memory feature gate.

Revocation must fail closed at every recall and mutation. The UI-provided scope or actor fields are display/input hints only.

### Runtime and durable events (Phase 3)

The runtime adapter must depend only on `RuntimeMemoryPort` and pass the verified actor plus a server timestamp. Before prompt assembly it calls `recall`; after a run it may call `propose`, never directly create an active entry. Shared agent invocations must default `attached_personal_space_ids` to an empty list.

Compaction requires canonical `{ event_id, run_id, sequence, occurred_at }` references from persisted durable events. The adapter may generate summary text, but acceptance remains a memory decision and the referenced events remain authoritative. Memory proposal/accept/reject/edit/delete/retrieval/cleanup actions should themselves emit semantic durable events once the Phase 3 event names/envelopes are locked.

### Persistence

Implement `MemoryPersistencePort` transactionally against the canonical database. `save` in the reference port represents one atomic aggregate write; a production adapter should translate service commands to narrow transactions with optimistic concurrency or row locks. `requestDerivedCleanup` must enqueue an idempotent cleanup job keyed by entry ID and deletion/expiry version. Retrieval audit rows are append-only and should store a query digest, never raw query text.

Do not apply the adjacent SQL proposal until canonical identity table names, internal UUID types, RLS helpers, event foreign keys, and migration ordering are locked. Production persistence additionally needs:

- foreign keys to organization/user/project/team/run/output/event records;
- unique active `(space_id, key)` enforcement compatible with revisions;
- RLS and privileged functions that repeat resource authorization;
- a transactional outbox for index cleanup and durable-event emission;
- expiry sweep plus immediate retrieval-time expiry checks;
- immutable revisions and retrieval audit retention policy;
- derived embedding/index storage separated from authoritative content.

## Phase 8 gate matrix

| Gate | Evidence | Status |
|---|---|---|
| User memory lifecycle | remember/accept/reject/edit/delete/export tests | Pass |
| Project scope isolation | wrong-project and wrong-organization negative tests | Pass |
| Shared-agent personal isolation | empty-by-default and explicit-attachment tests | Pass |
| Team memory delayed | creation denied while feature gate is off | Pass |
| Explainable recall | reasons, scope, score, provenance UI and test | Pass |
| Contradiction review | linked proposal and revision test | Pass |
| Sensitivity/expiry/deletion | policy denial, stale/expiry evals, cleanup assertion | Pass |
| Durable-event compaction | ordered event references retained on proposal | Pass |
| Irrelevance/staleness evals | Phase 8 eval fixture and command | Pass |
| Live identity/runtime/persistence | ports and exact requirements documented; upstream contracts not stable | Integration pending |

## Validation commands

```powershell
cd packages/memory-plane
npm ci
npm run typecheck
npm test
npm run eval
npm audit --omit=dev
```

```powershell
cd frontend
npm ci
npm test -- src/features/memory/adapter.test.ts src/components/memory/MemoryInspector.test.tsx
npm run build
```
