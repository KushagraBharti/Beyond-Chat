# Production Worker Adapter Contract

The worker owns no provider credentials inside a sandbox. It receives only a lease-bound invocation-broker session and calls product-owned gateways for model and tool work.

`SupabaseWorkerPersistence` uses the committed service-role contract without alternate write paths:

- `claim_runtime_run` allocates a `FOR UPDATE SKIP LOCKED` lease.
- `runtime_runs`, the exact active `runtime_leases` binding, and the latest run/attempt/lease-bound `runtime_checkpoints` row are read for control/resume. Missing, released, expired, or replaced leases are fenced before sandbox creation.
- `append_runtime_event_fenced`, `heartbeat_runtime_lease`, `release_runtime_lease`, and `write_runtime_checkpoint` enforce run/attempt/lease/worker fencing.
- `suspend_runtime_for_approval`, `complete_runtime_success`, `complete_runtime_cancellation`, and `record_runtime_attempt_failure` are the only worker terminal/lease-consuming writes. Immediately before success, the adapter reads zero or one active usage reservation for the exact run and attempt and passes only that ID to the atomic completion RPC; ambiguous or expired holds fail closed.
- `reconcile_expired_runtime_leases` is the durable lease reconciler.
- SQLSTATE `40001` is always a stale lease. An ambiguous transport failure at an atomic completion boundary is `CommitOutcomeUnknown`; the worker reads `runtime_runs.state` before deciding whether to retry.

`BrokerCapabilityIssuer` is an injected invocation-broker interface. Sessions bind run, tenant, actor, agent version, attempt, lease, timezone-aware expiry, and an exact audience/operation allowlist. Every minted token binds one audience, operation, argument digest, idempotency key, and a timezone-aware expiry no later than its session.

`ModalSandboxLifecycle` accepts only configured lowercase `sha256:` image digests. It marks every sandbox with `beyond.owner`, run, attempt, and image metadata, recursively validates and restores only the checkpoint `working_set`, and starts with an empty creation environment. Process launch allows exactly `BEYOND_RUN_ID`, `BEYOND_ATTEMPT`, and `BEYOND_INVOCATION_BROKER_SESSION`; every other environment name is rejected. Pi stdout must be UTF-8, version `1` JSONL and is normalized to `AdapterEvent`. Pi success is withheld until process exit, provider usage is emitted as a cost first, and then exactly one success is emitted; duplicate or post-success Pi events fail closed. Cancellation targets the process tree, termination is idempotent, and reconciliation lists and terminates only `beyond.owner=beyond-chat` resources whose run is not active. Provider errors are redacted.

The injected Modal protocol is intentionally not a live SDK integration. A production composition root must implement image lookup, stable filesystem mounts, resource limits, egress policy, process-tree cancellation, usage normalization, and ownership-filtered listing against a pinned Modal SDK.
