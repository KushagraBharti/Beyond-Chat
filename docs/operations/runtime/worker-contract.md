# Durable runtime worker contract

The `src.runtime_worker` package is a provider-neutral, one-shot orchestration layer. One invocation claims at most one database-fenced lease and returns. A production scheduler is responsible for invoking it repeatedly and running reconciliation independently.

## Correctness boundary

Postgres is authoritative for run state, event sequence allocation, event idempotency, lease fencing, checkpoints, approvals, outputs, costs, and terminal state. The worker never infers durable success from a Pi process exit or a Modal response.

The persistence adapter must implement every method in `WorkerPersistence` as an atomic database operation where indicated:

- `claim_one` claims one eligible run, increments its attempt, and creates a unique lease fence.
- `append_event` verifies `(run_id, attempt, lease_id, worker_id)`, allocates the next sequence in the database, and deduplicates the adapter idempotency key.
- `heartbeat`, `write_checkpoint`, cancellation, failure, release, and approval suspension reject stale fences.
- `suspend_for_approval` commits the checkpoint, approval request/event, run transition, and lease release in one transaction.
- `complete_success` commits the durable output metadata, all actual-cost records, reservation settlement, completion event, run transition, and lease release in one transaction. Nothing else may set a run to `completed`.
- `terminal_state` is used only to resolve an unknown response after an atomic completion call; it does not repair partial state.

Repeated events must return the already allocated durable event. The worker owns a monotonic heartbeat cadence checked both while awaiting the next adapter event and before processing every busy-stream event; neither silence nor a high event rate can starve lease renewal. Database heartbeats occur only when that cadence is due. A stale worker stops producing effects when a heartbeat or database operation rejects its fence. Pending stream tasks are canceled and awaited on every exit. Sandbox cleanup is always attempted. A separate lease release is attempted only while the lease is still active: atomic success, cancellation, and approval suspension consume the lease themselves.

## Capability and credential boundary

Committed internal-gateway invocation tokens are single-use and bound to an exact audience, operation, argument digest, and idempotency claim. They are never projected into the sandbox as reusable run credentials.

Instead, the capability issuer opens one short-lived, lease-bound invocation-broker session whose allowlist contains exactly:

- `model-gateway` with `model.invoke`
- `tool-gateway` with `tool.execute`

The Pi adapter process receives only the broker-session credential plus run metadata. Before sandbox creation, the worker verifies that the session has a nonempty credential, is unexpired, is bound to the exact run ID, attempt, and lease ID, and has exactly the two audience/operation entries above—no missing or additional power. For every model or tool call, the trusted broker accepts the exact audience, operation, canonical argument digest, idempotency key, and approval binding, rechecks the lease, and mints a fresh single-use invocation token through the control plane. The adapter then immediately presents that token to the intended gateway. The broker session cannot itself invoke a gateway, cannot broaden its allowlist, and expires or is revoked with the lease. The sandbox must not receive OpenRouter, Composio, Modal, database, object-store, invocation-signing, or other provider/master credentials. Gateways re-evaluate current identity, authorization, connection ownership, policy, approval, budget, and idempotency at invocation time.

## Sandbox and Pi adapter integration

Implement `SandboxLifecycle` with the real Modal provider outside this package. `create_or_restore` must use an approved immutable image and restore the checkpoint's stable working-set/filesystem bundle; correctness must not depend on a live-process or memory snapshot. `launch` starts the Beyond-owned Pi adapter command and returns normalized `AdapterEvent` values. `cancel` must terminate the process tree, and `terminate` must release the sandbox even after failure.

The production Pi adapter must:

1. Accept the lease-bound invocation-broker session and logical resume state.
2. Request a fresh argument-bound, single-use gateway token for each exact model/tool call; never cache or reuse an invocation token.
3. Reconstruct Pi from durable logical state and restored files.
4. Assign a database-compatible stable idempotency key of exactly 8–255 characters to every normalized semantic event.
5. Adapter heartbeats may provide telemetry, but worker lease safety never depends on them.
6. Upload semantically important files before emitting checkpoint/output references.
7. Emit a checkpoint with every approval request.
8. Emit exactly one durable output and unique provider usage records before exactly one `success`; emit nothing afterward.
9. Classify explicit adapter failures or exit nonzero; ending the stream is not success.

Before any persistence call, the worker verifies checkpoint run/attempt/lease/image/state-digest binding, output run binding, cost run/attempt binding, provider usage uniqueness, and the output/cost/success state machine. Both configured image and checkpoint state digests use canonical lowercase `sha256:[0-9a-f]{64}` form, and a checkpoint image must equal the approved configured digest. Invalid adapter data is a nonretryable protocol failure and cannot reach terminal success.

No Pi-native or Modal-native event shape may escape this adapter boundary.

## Recovery and reconciliation

On retry, the claimed run exposes its latest committed checkpoint. A fresh sandbox is restored and Pi is reconstructed from `logical_state`; open processes, sockets, file descriptors, and in-memory secrets are never assumed to survive.

Run a separate `RuntimeReconciler` loop on a production schedule. Its persistence adapter requeues or terminally fails expired attempts according to retry policy. Its sandbox adapter lists provider resources by Beyond ownership metadata and terminates sandboxes whose run is not in the authoritative active-run set. Both operations must be idempotent.

## Failure policy

Provider unavailability, provider timeout, unknown atomic-commit response, and durable output/cost persistence failures are retryable. Adapter protocol violations and unexpected application exceptions are nonretryable by default. Production adapters should translate provider SDK exceptions into the explicit worker error classes and include redacted structured details.

Cancellation is checked before sandbox creation and between every adapter event. Once observed it propagates to the sandbox before the database atomically records cancellation. Approval suspension checkpoints first within the same database transaction and then releases compute.

## Production wiring still required

- An async adapter over the existing runtime Supabase/Postgres RPCs, including a read-after-unknown terminal-state query and mappings for the fenced failure/cancellation RPCs.
- A Modal `SandboxLifecycle` implementation with image digest validation, ownership tags, stable filesystem/object recovery, process-tree cancellation, usage reporting, and orphan listing.
- The Beyond-owned Pi adapter executable and normalized event schema/version contract.
- A trusted invocation broker that authenticates the lease-bound session, canonicalizes each call, and requests a fresh single-use, audience/operation/argument/idempotency-bound token from the production signer. Broker session revocation must follow lease consumption/expiry.
- A durable scheduler/queue consumer for `run_once`, heartbeat cadence enforcement during long adapter operations, retry delay/max-attempt policy, and a separately scheduled reconciler.
- Metrics/traces for lease age, checkpoint age, cold start, recovery, cancellation latency, cleanup failure, event deduplication, unknown commit outcomes, and cost settlement.
