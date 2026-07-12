# Provider and Security Baseline

This directory is the Phase 0 operational source of truth for provider identity, authentication posture, credential ownership, rate assumptions, and destructive-change preparation. It intentionally contains identifiers and credential **names**, never credential values.

Baseline captured: **2026-07-11 UTC**.

## Current decision summary

- GitHub CLI, Vercel CLI/MCP, Supabase CLI/MCP, Modal CLI, WorkOS MCP, Stripe CLI, OpenRouter, Composio, Exa, and Financial Datasets were exercised with read-only or minimal verification calls.
- Supabase MCP is scoped to project ref `vffndfwdykxqjlnntuuk`, but the local
  Supabase CLI session currently returns 401 Unauthorized. Prior reauthentication
  evidence is historical and the Phase 0 CLI/MCP agreement gate is open.
- The three Vercel projects are verified by immutable ID. The Vercel MCP is scoped only to the frontend project; use the CLI for backend and runner work.
- Six backend-only variables were removed from the frontend Vercel project after proving the deployment is a pure Vite client and those names are not referenced by frontend code.
- A fresh OpenRouter production key was created with a `$25` monthly cap and installed only in the backend and temporary legacy runner.
- A scoped Composio runtime key was created with only runtime-required access and installed backend-only. The pre-existing full-access key is retained temporarily for rollback/admin use and must not be used by application code.
- `DEXTER_RUNNER_SHARED_SECRET` was rotated to a fresh 256-bit value and installed identically in backend and temporary runner scopes.
- Backend and runner were redeployed from their previous production deployment sources, avoiding the shared dirty checkout. Health, provider-presence, and runner-denial checks passed.
- WorkOS Production B is the selected canonical pair: environment `environment_01KX84DX4GA5XMSN4D4FK9DFND`, app `app_01KX84DXGTP1ZKASV4PBVSASM6`, client `client_01KX84DX9XT83ZSTCBM0T2XC8G`. Production A is explicitly unused/legacy and remains untouched.
- Production WorkOS authentication now succeeds with one controlled profile,
  organization, and Owner membership. This supersedes the earlier zero-org and
  wholly-unconfigured-auth snapshot, but does not by itself prove invitation,
  switch, revocation, custom-role, or all-protected-route gates.
- WorkOS MCP OAuth is active in the current process; `whoami` and canonical
  environment queries succeeded during the 2026-07-12 audit.
- Stripe CLI targets account `acct_1TrlgVQ1UUFrv64i`, but the existing local `STRIPE_SECRET_KEY` belongs to a different account. It was not propagated. The intended account cannot charge yet.

## Files

- `provider-identity-register.md` — immutable IDs, auth evidence, and blockers.
- `credential-register.md` — secret names, allowed locations, owners, and rotation requirements.
- `secret-scope-matrix.md` — least-privilege placement rules.
- `rate-register.csv` — dated machine-readable pricing inputs.
- `backup-reset-runbook.md` — backup, reset, recovery, and rollback controls.
- `mutation-log.md` — exact external mutations performed during this baseline.
- `../workos/` — canonical WorkOS configuration contract, RBAC boundary, activation validation, and rollback procedure.
- `../../../scripts/cost/calculate-unit-economics.ps1` — scenario calculator.
- `../../../scripts/cost/verify-provider-auth.ps1` — safe credential probes that never print values.

## Gate posture

Phase 0 provider/security work is **partially complete**. Provider identities and most authentication paths are verified, secret scope is materially improved, and cost tooling exists. Phase 0 cannot close until:

1. Supabase CLI is reauthenticated and independently agrees with the project-scoped MCP and seven-version migration history;
2. WorkOS Production B's exact URL/origin/branding/session/RBAC contract is applied and verified, and the backend credential names are proven to reference that environment without revealing values;
3. the correct Stripe account is activated and a matching backend key is installed during Phase 12;
4. the old Composio full-access key is revoked after the scoped key is exercised by shipped runtime code;
5. GitHub authorization is replaced with a narrower token or GitHub App installation;
6. GitHub MCP availability is restored or explicitly removed from the claimed tool inventory.

The detailed current gate assessment is
[`../configuration/phase0-2-gate-audit.md`](../configuration/phase0-2-gate-audit.md).
