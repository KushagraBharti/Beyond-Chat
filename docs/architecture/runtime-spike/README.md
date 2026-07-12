# Phase 1 local runtime/app-server spike

This executable spike proves the Phase 1 protocol, durability, Pi-adapter, recovery, and sandbox boundaries without treating a local process as the production control plane. Beyond owns the command/event protocol and durable state. Pi remains private to `PiRuntimeAdapter`, and the local app server depends only on the canonical `AgentRuntime` interface plus the adapter package.

The adapter resolves `@earendil-works/pi-ai` and `@earendil-works/pi-agent-core` from the approved vendored Beyond fork at commit `19fe0e01c5eca791c9da0372b49256845555a783` and tree `d77910df21965dcf37f4a577bf8e3625e6babbd4`. The offline test/eval runtime instantiates the real exported Pi `Agent`; deterministic model responses replace external network calls, but Pi's actual loop, tool execution, lifecycle events, and message state are exercised. Adapter-specific tests separately prove the steering and abort translations. `pi-coding-agent` is intentionally absent from the application runtime lock because the pinned root export brings a compile-only `pi-tui` coupling that Beyond does not need for this headless spike.

## Protocol 1.0

- `POST /v1/commands` accepts canonical `run.start`, `run.steer`, `run.cancel`, `run.checkpoint`, and `run.resume` envelopes.
- `GET /v1/runs/:id/events?after=N` replays committed events after a contiguous per-run cursor and then follows new events over SSE. A reconnect may provide `Last-Event-ID`; replay completes before live delivery begins.
- `GET /v1/runs/:id/snapshot` returns the canonical run state, optimistic version, attempt, last committed event sequence, and latest logical checkpoint.
- A start request returns after durable acceptance rather than after model completion. `LocalAppServerCore.awaitIdle()` is an explicit operational/test seam for waiting on background execution.
- Command types are closed by default. Envelopes, canonical IDs, timestamps, schema versions, scope, expected versions, event sequence, and state transitions are validated server-side.
- Idempotency is scoped by organization, project, thread, run, actor, and key. The fingerprint includes the semantic command fields. Exact retries return the stored result; conflicting reuse fails closed.

## Durable journal and event ordering

`AppendOnlyStore` uses Node 24's built-in SQLite binding. It creates a strict append-only journal, enables WAL mode and `synchronous=FULL`, and writes every logical record group inside one `BEGIN IMMEDIATE` transaction. A group can include command outcome, run snapshot, event, and checkpoint records, so a process crash cannot durably split one logical transition.

Each row stores canonical JSON plus a SHA-256 checksum. Startup reads rows in insertion order, verifies checksums and record identities, validates every snapshot transition, and rejects corrupt JSON, tampered checksums, invalid command fingerprints, or noncontiguous event sequences. Events are persisted and applied before publisher/subscriber delivery. Publisher or subscriber exceptions are isolated from the committed log.

The local SQLite journal is evidence for protocol semantics, not the intended multi-worker production database. Phase 3 must map the same invariants to the durable production coordinator and Supabase schema.

## Runtime lifecycle and recovery

A newly accepted run advances through the canonical `accepted → queued → leased → preparing` states before the runtime produces `running` and later completion events. Runtime instances are run-scoped and created through a factory that returns the canonical `AgentRuntime`; the app server has no second Pi-specific driver contract.

On startup, the server reconstructs commands, snapshots, events, and checkpoints from the journal. A nonterminal run enters `reconciling`, receives a fresh runtime, and restarts from its durable start definition or resumes from the latest compatible logical checkpoint. The implementation never claims that process memory, file descriptors, sockets, or credentials survived. Pending accepted steer, cancel, and checkpoint commands are also reconciled instead of being silently forgotten.

The tests prove:

- a real Pi agent runs behind the canonical protocol and no Pi-native type reaches HTTP or durable records;
- SSE delivers live events before completion and reconnect replay resumes after the acknowledged cursor;
- process restart recovers a nonterminal run from its durable definition;
- journal replay reconstructs the same contiguous sequence;
- duplicate delivery and duplicate command execution do not duplicate canonical effects;
- persistence, publisher, and subscriber faults cannot create gaps in committed events;
- corrupt or checksum-tampered journals fail closed.

## Cancellation, checkpoint, and resume semantics

Cancellation first persists `run.cancel.requested` and its accepted command intent. The runtime must explicitly acknowledge that an active execution accepted propagation before the server commits the terminal `run.canceled` state. A terminal cancellation cannot later project completion or failure. A crash between durable intent and runtime effect is reconciled on startup and produces exactly one cancellation-request event followed by the terminal cancellation.

A checkpoint records the exact durable event cursor, logical Pi message state with SHA-256/byte integrity, the working-set manifest, artifact references, the runtime image digest, and provider metadata. `pause: true` checkpoints state first, then requests runtime cancellation and commits `paused`. Resume creates a new runtime, validates run/image/Pi revision compatibility, restores logical messages, synchronizes the durable cursor, and continues. It does not restore process memory or in-memory secrets.

## Sandbox provider evidence

`SandboxProvider` has two Phase 1 implementations:

- `InMemorySandboxProvider` is the semantic reference. It proves lifecycle validation, exact byte upload/download, content digests, real command write effects, wall-time cancellation, path containment, durable working-set manifests, checkpoint/restore parity, port validation, and idempotent teardown.
- `LocalDockerProvider` builds real shell-free Docker argv through `NodeProcessBoundary`. It enforces a loopback-only published-port allowlist, `--network none`, CPU/memory/PID limits, wall-time aborts, explicit lifecycle and exit validation, byte-preserving `docker cp`, tracked-path checkpoint manifests, restore into a new container, and idempotent termination.

On 2026-07-11 the Windows validation host had no `docker` executable, so Docker behavior is contract-tested through an injected process boundary. No live local-container claim is made. A live unfiltered Linux run in the Modal-compatible runtime image, a real immutable image digest, short-lived run credential injection, network-policy enforcement, and forced sandbox-loss recovery remain external promotion gates.

Checkpoint correctness depends on durable object/working-set manifests. It does not depend on Modal's experimental memory snapshots, and no implementation here claims that a memory snapshot is a durable filesystem snapshot.

## Benchmark fixtures

`scripts/phase1/run-fixtures.ts` runs two deterministic offline benchmarks through the real local app server, real `PiRuntimeAdapter`, and real Pi `Agent` loop:

- the document fixture invokes a Pi tool that writes a Markdown deliverable, then validates the actual file bytes, SHA-256, output event, required sections/phrases, word count, tool/model trace, latency, and cost budgets;
- the finance fixture passes recorded AAPL income statements and SEC source URLs through Dexter's actual `formatIncomeStatements`, computes revenue growth and margin deltas, writes a sourced Markdown memo through a Pi tool, and validates citations, numeric tolerances, actual output bytes, tool/model trace, latency, and cost budgets.

The finance fixture is deterministic and network-free by design. It proves adapter and Dexter-computation parity against recorded source data; it does not claim live Financial Datasets or SEC availability.

## Validation

From the repository root:

```powershell
powershell -File scripts/phase1/validate.ps1
```

The script verifies local and online provenance, verifies the adapter import boundary, reproducibly builds the selected vendored Pi packages, performs clean installs and high-severity audits for every Phase 1 package, typechecks, runs all package tests, executes both benchmark fixtures once, rechecks provenance, and requires the working-tree status to match its pre-validation snapshot. CI repeats this under Node 24 from a clean checkout and rejects both tracked mutations and new untracked files.
