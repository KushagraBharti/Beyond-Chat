# ADR 0001: Provider Identity and Mutation Boundary

- Status: Accepted
- Date: 2026-07-11

## Decision

Every provider mutation must name and verify the immutable account/team/project/environment ID, not merely a display name. One workstream owns external mutations at a time. Ambiguous resources are read-only until evidence resolves them.

## Consequences

- WorkOS remains unmodified while two production environments are plausible.
- Vercel MCP is treated as frontend-scoped; backend/runner operations use explicitly linked CLI projects.
- Local Stripe credentials are rejected if their account ID differs from the intended CLI account, even when the key itself is valid.
- Mutation logs and rollback paths are required for every provider change.

