# Canonical contracts (Phase 1A)

`@beyond/contracts` is the product-owned TypeScript contract package. It defines canonical IDs, command and event envelopes, execution-state rules, error semantics, JSON serialization, schema compatibility, and provider-neutral runtime contracts. `@beyond/runtime-contracts` is a local, in-memory prototype for durable event ordering, cursor replay, and command idempotency.

## Contract decisions

- IDs are opaque, typed strings with stable prefixes such as `org_`, `run_`, and `evt_`. Provider identifiers belong only in metadata and are never canonical product IDs.
- Contract schemas begin at `1.0`. A reader accepts only its declared major version and the inclusive minor range from `minimumReadable` through `current`. A minor release must preserve existing required fields and semantics; a breaking change requires a new major version and an explicit migration/dual-reader plan.
- Every command includes organization, actor, client idempotency key, correlation ID, schema version, and an expected version when optimistic concurrency applies. The idempotency scope is `(organization_id, actor.id, idempotency_key)`; reusing a key for a different command is a conflict.
- Every event is immutable and contains its own durable, contiguous per-run sequence. Events contain exactly one inline JSON payload or object reference. Large/binary results use the object reference.
- The state machine excludes `draft` and permits no transition from a terminal state. State snapshots are returned as new frozen values, never mutated in place.
- Consumers resume using the last accepted cursor sequence. They must tolerate duplicate event delivery and rebuild projections only from the append-only sequence order.
- Cancellation is a durable request followed by an acknowledgement that names each propagation target. Checkpoints point to the durable sequence, runtime state (when supported), working-set manifest, artifacts, image digest, and provider metadata; they never claim a live process or secret survives.

## Package boundaries

`@beyond/contracts` does not import Pi, Modal, a model provider, a tool provider, or product application code. It provides the provider-neutral `SandboxProvider`, `ToolGateway`, `ModelGateway`, and `AgentRuntime` shapes. Provider implementations and the future durable database live outside these packages.

## Local verification

```powershell
cd packages/contracts
npm test

cd ..\runtime-contracts
npm install
npm test
```

The tests cover ID and envelope validation, invalid schema versions, serialization round trips, state transitions, command idempotency, event sequence ordering, duplicate delivery, cursor replay, and deterministic projections.
