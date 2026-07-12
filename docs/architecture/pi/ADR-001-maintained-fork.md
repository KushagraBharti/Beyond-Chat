# ADR-001: Maintain a pinned Pi fork behind a Beyond adapter

- Status: accepted
- Date: 2026-07-11

## Context

Beyond needs a capable general-purpose loop but cannot make a coding-agent terminal, local configuration, or Git repository the product boundary. Pi is compact and extensible, yet pre-1.0 and expected to change. Floating npm packages would make old runs difficult to explain and would couple product contracts to upstream event types.

## Decision

Maintain an exact Pi fork with preserved history and license, vendor an immutable source archive, build through the upstream npm lockfile, and isolate all consumption in `PiRuntimeAdapter`. Record source/tree/fork revisions, patch series, selected packages, SBOM, runtime image digest, and rollback revision.

Use Codex and T3 Code only as reference architectures for application protocol and orchestration/UI projection. They are not dependencies.

## Consequences

- Updates are deliberate and carry review/evaluation cost.
- Beyond can reproduce and explain a published runtime version.
- Product protocol, permissions, tenancy, recovery, and provider policy remain replaceable and runtime-neutral.
- A small patch stack may be required for a headless coding-agent export because Pi `0.80.6` couples its root package to TUI declarations.
- CI must verify provenance/import boundaries; release automation must bind fork commit to image and agent version.
