# ADR 0002: Secret Scope and Write-only Provider Values

- Status: Accepted
- Date: 2026-07-11

## Decision

Secrets are placed only in the smallest service scope that consumes them. Provider master keys never enter frontend projects or untrusted sandboxes. Write-only secret stores are verified through metadata and runtime behavior; blank CLI pulls are not treated as empty values.

## Consequences

- The frontend keeps only explicitly public VITE configuration.
- Composio lives in the backend gateway, not Modal or the legacy runner.
- OpenRouter is temporarily available to backend and legacy runner until Modal/gateway architecture supersedes the runner.
- Local secret edits use ignored files and encrypted pre-change backups; no secret value appears in docs or command output.

