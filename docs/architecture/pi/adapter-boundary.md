# Pi adapter-only import and translation boundary

## Compile-time rule

Only `packages/pi-runtime-adapter/**` may import:

- `@earendil-works/pi-ai`;
- `@earendil-works/pi-agent-core`;
- `@earendil-works/pi-coding-agent`;
- any path under `vendor/pi/upstream`.

`scripts/pi/verify-import-boundary.mjs` scans application source and fails on a direct import elsewhere. CI should call it without exceptions. A new integration path must extend the adapter, not add another allowlisted directory.

## Runtime rule

The adapter implements the Beyond `AgentRuntime` contract. It may hold Pi objects privately, but emits only canonical Beyond events and checkpoints.

| Pi concept | Adapter action | Beyond authority |
| --- | --- | --- |
| agent/model/tool identifiers | map to run-scoped internal handles | canonical IDs/contracts |
| lifecycle event | normalize, validate, assign canonical sequence | durable event envelope |
| tool call/update/result | route through policy-aware tool gateway | approvals, permissions, audit |
| cancellation/abort | translate idempotently | canonical run state machine |
| steering/follow-up | accept only canonical command | app-server command log |
| message history | serialize as adapter-private checkpoint payload | external checkpoint record |
| compaction | emit explicit summary/checkpoint evidence | Beyond recovery policy |
| file/process operation | execute only inside assigned sandbox/workspace | SandboxProvider/Modal policy |
| provider request | use a run-scoped capability | ModelGateway and cost policy |
| error | map to canonical code and safe message | Beyond error taxonomy |

Pi event types must never be stored as the database/public schema, returned from the API, or rendered directly. Preserve raw provider/Pi details only in access-controlled diagnostic metadata when policy allows it.

## Credential and sandbox rule

- Give Pi only short-lived, run-scoped credentials or opaque gateway tokens.
- Never expose WorkOS, Supabase service-role, Stripe, Composio master, provider master, or infrastructure credentials.
- Explicitly set the working directory and tool allowlist; never inherit a developer home directory as the tenancy boundary.
- Deny shell/network/file access by default outside the SandboxProvider policy.
- Re-authorize every side effect through the Beyond tool gateway.

## Local contract evidence

- imports outside the adapter fail static verification;
- the same canonical protocol works with a real offline Pi `Agent` and a controlled replacement runtime;
- start/stream/steer/cancel/checkpoint/replay/resume are scoped and idempotent where specified;
- no Pi type appears in serialized commands, events, checkpoints, API schemas, or database rows;
- cancellation wins races without later success projection;
- duplicate Pi events do not create duplicate canonical effects;
- malformed/unknown Pi events fail closed with a canonical error;
- replay after process loss rebuilds the same state;
- checkpoints explicitly state that process memory was not restored;
- document and Dexter fixtures meet quality, trace, latency, and cost tolerances.

These properties are executable in `packages/pi-runtime-adapter/tests`, `services/local-app-server/tests`, and `scripts/phase1/run-fixtures.ts`. Production promotion additionally requires external evidence that restored Modal runs receive fresh short-lived credentials and sandbox grants, that the Beyond tool gateway enforces approvals outside Pi, and that forced worker/sandbox loss recovers in the immutable Linux runtime image. Those later gates must not be inferred from the local deterministic tests.
