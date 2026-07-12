# Codex reference record

This directory contains metadata and the upstream license only. Codex is not a production dependency and no Codex source is copied here.

Pinned reference: [`openai/codex@5c19155cbd93bfa099016e7487259f61669823ff`](https://github.com/openai/codex/tree/5c19155cbd93bfa099016e7487259f61669823ff), Apache-2.0.

Beyond may borrow architectural concepts, not implementation code:

- a versioned bidirectional application protocol rather than parsing terminal output;
- explicit initialize/initialized negotiation and client identity;
- stable thread, turn, and item identifiers;
- request/response commands plus asynchronous lifecycle notifications;
- inline approval requests that keep the run suspended until a decision;
- resumable thread state and structured item rendering;
- capability discovery for skills, apps, models, and configuration;
- transport isolation: protocol semantics do not depend on stdio/WebSocket details;
- health/readiness behavior and structured stderr tracing.

The exact app-server reference is the [pinned app-server README](https://github.com/openai/codex/blob/5c19155cbd93bfa099016e7487259f61669823ff/codex-rs/app-server/README.md). Beyond owns its command/event schemas, authorization, tenancy, durable log, transport, approvals, and compatibility policy.

Any future code reuse requires a separate legal review, preserved Apache-2.0 notices, and an explicit provenance update.
