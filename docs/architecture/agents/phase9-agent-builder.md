# Phase 9 agent builder and publishing

Phase 9 treats deployment as an immutable configuration release, not infrastructure provisioning. A mutable draft is validated against current model, skill, app, MCP, knowledge, memory, runtime, policy, budget, eval, and output catalogs. Publication re-resolves those dependencies, freezes a content-addressed version, and advances an audience-specific deployment pointer.

## Guarantees

- Draft writes use optimistic revision checks.
- Validation evidence is bound to the draft revision, config digest, and dependency digest.
- Publish re-resolves dependencies to close the validation-to-publication TOCTOU window.
- Published configuration is immutable and identified by a canonical SHA-256 content hash.
- Rollback changes only a deployment pointer with compare-and-swap revision protection.
- A run resolves and stores the exact version ID, content hash, deployment ID, and deployment revision.
- Invocation verifies the stored version hash before returning effective configuration.
- Organization publication can require a separate Owner/Admin approval.
- Authorization is organization-scoped, deny-by-default, and audience-aware.
- Shared agents cannot implicitly read personal memory; consequential tools cannot be silently allowed.

## Ports and live dependencies

`AgentCatalogPort` is the only Phase 9 dependency-resolution seam. A live adapter must compose the public Phase 5–8 model catalog, skill registry, app registry, MCP registry, knowledge scopes, memory spaces, runtime/image catalog, tool policy, and output templates. It must return exact IDs, versions, digests, unavailability, and policy errors without credentials.

`EvalRunnerPort` executes smoke inputs and configured eval suites in permitted context and returns durable evidence references. `AgentRegistryPersistencePort` stores the records below with transactional uniqueness and optimistic concurrency. `AgentRuntimeResolutionPort` is the dispatch seam: run creation calls it once and persists the returned exact resolution on the run before execution.

The in-memory adapter is a conformance implementation for tests. It is not durable production storage.

## Persistence schema proposal

This proposal intentionally does not add a migration; Phase 9 is not allowed to modify the canonical migration chain in this delivery.

| Record | Required invariants and indexes |
|---|---|
| `agents` | Stable ID, organization/owner, lifecycle; index `(organization_id, state)` |
| `agent_drafts` | One mutable config plus integer revision; unique active draft identity; compare-and-swap updates |
| `agent_versions` | Unique `(agent_id, ordinal)` and `content_hash`; config JSON and dependency digest immutable after insert except a deprecation marker |
| `agent_validation_results` | Draft ID/revision, config and dependency digests, issues, eval evidence; append-only |
| `agent_deployments` | Unique target key per agent/audience/audience IDs; active version FK; integer CAS revision |
| `agent_publication_requests` | Requester, decision, approver and timestamps; terminal decision immutable |
| `agent_favorites` | Unique `(profile_id, agent_id)` |
| `agent_usage_events` | Append-only exact version ID, actor, run ID and timestamp; indexes by version/time and actor/time |

Every row carries `organization_id` directly or through an immutable parent, uses RLS, and denies cross-organization access. Deployment pointer changes and version insertion should be one idempotent transaction. Content hashes are computed by trusted application code and verified on dispatch; production persistence should additionally reject mutation of version config with a trigger or restricted grants.

## Publication sequence

1. Save a draft with an expected revision.
2. Preview the effective configuration and run preflight/evals.
3. Bind validation evidence to the draft and dependency digests.
4. Obtain publication approval when policy requires it.
5. Re-resolve dependencies and reject drift.
6. Insert the immutable content-addressed version.
7. Advance the audience deployment pointer transactionally.
8. Directory queries project only deployments visible to the actor.
9. Run dispatch resolves the pointer once and persists the exact returned version.

## Failure and rollback

Catalog drift, stale draft revisions, failed evals, missing approvals, invalid budgets, personal-memory leakage, approval gaps, and content hash mismatches are blocking failures. Rollback never edits historical versions or runs; it advances the deployment pointer to an earlier non-deprecated version. Active versions cannot be deprecated.
