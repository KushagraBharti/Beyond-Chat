# Provider Identity and Authentication Register

Evidence date: **2026-07-11 UTC**. “Verified” means an authenticated provider surface returned the recorded immutable ID or a provider-authenticated request succeeded. It does not mean the corresponding product integration is implemented.

| Provider/surface | Immutable resource identity | Authentication evidence | Status | Next gate |
|---|---|---|---|---|
| GitHub CLI | User ID `65621922`; login `KushagraBharti` | `gh auth status`; authenticated API call to `/user` | Verified, over-scoped | Replace OAuth token scopes `delete_repo,gist,read:org,repo,workflow` with least privilege; GitHub MCP was not exposed in this task |
| Vercel team | `team_zZPyc4iWczMNMcU7ReWg3dGc`; slug `kushagras-projects-5d330ca5` | CLI `whoami`, team listing, MCP team listing | Verified | Keep one external-mutation owner at a time |
| Vercel frontend | `prj_oq31gdbP117PJBxU3A0v87ewWqdr`; production alias `beyond-chat-production.vercel.app` | CLI link/project inspect; project-scoped MCP; READY deployment `dpl_8ZSswK2T7BUvBDfvVzUc6xX1ZgGt` | Verified | Frontend receives only VITE/public Supabase values |
| Vercel backend | `prj_LVvFbBJ4ksVdgGTkBwJdZ82mAIZu`; production alias `beyond-chat-backend.vercel.app` | CLI link/project inspect; production redeploy READY; project-scoped Production environment-variable metadata query | Verified | `WORKOS_CLIENT_ID` and `WORKOS_COOKIE_PASSWORD` are installed as Sensitive; `WORKOS_API_KEY` remains absent until WorkOS Production is enabled |
| Vercel legacy runner | `prj_C0NH6PmkehZKvrVbWjijd6G9l18k`; production alias `beyond-chat-sandbox-runner.vercel.app` | CLI link/project inspect; production redeploy READY; unauthenticated POST returns 401 | Verified, temporary | Retire after Modal parity and rollback proof |
| Supabase organization | `nwvyypcrdwhzwpurtonm` | CLI project listing | Verified | Restrict operational tokens to project scope where supported |
| Supabase project | Ref `vffndfwdykxqjlnntuuk`; URL `https://vffndfwdykxqjlnntuuk.supabase.co` | MCP URL/migration/advisor calls; reauthenticated CLI; both linked project-ref files match; linked migration list succeeds | Verified | Back up, reset legacy schema, replay canonical migration, rerun advisors |
| Modal | Profile/workspace slug `kushagrabharti`; no immutable workspace ID exposed by CLI | `modal profile current/list`; `modal app list --json` authenticated and returned `[]` | Auth verified; app absent | Phase 4 creates named app, images, identities, and recovery resources |
| WorkOS team | Team `Kushagra`; caller `Kushagra Bharti <kushagrabharti@gmail.com>`; role `ADMIN` | Global `codex mcp login workos` completed; a fresh CLI MCP process then returned `whoami` and authoritative queries | Global OAuth refreshed; current desktop MCP transport remains stale until restart/reconnect | Restart Codex or reconnect WorkOS MCP before using it from the desktop process |
| WorkOS production legacy A | Environment `environment_01KX6XSE77SSHVD4SVM8ZY0QZJ`; app `app_01KX6XSERQW6QCG30ZE2KTD410`; client `client_01KX6XSED33RARK1GY1B5J9X0M` | MCP application and organization-count queries | Explicitly unused/legacy; read-only | Never delete automatically; retain only as rollback evidence until the canonical environment is live |
| WorkOS canonical production B | Environment `environment_01KX84DX4GA5XMSN4D4FK9DFND`; app `app_01KX84DXGTP1ZKASV4PBVSASM6`; client `client_01KX84DX9XT83ZSTCBM0T2XC8G` | MCP application/role/permission/org queries plus authenticated dashboard | Selected canonical pair; activation blocked | Dashboard requires billing address and payment method to enable Production. App remains default-named, has no redirect/logout/origin URLs, no API key, and zero organizations |
| WorkOS staging companions | `environment_01KX6XSDEZAPMP8A2GXWTKSK86`; `environment_01KX84DWCBF754R9FY2M75K4K8` | MCP application and organization-count queries | Verified, not production targets | Do not wire production runtime to staging |
| Stripe | Account `acct_1TrlgVQ1UUFrv64i`; US/USD | `stripe whoami`; live `/v1/account` read | Auth verified, launch blocked | `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false`; activate later; local key mismatch must not be used |
| Composio organization/project | Org `ok_5au9JsNjnfeX`; project `pr_82bhnZTH8xSD`; workspace/project slugs `kushagrabharti_workspace/beyond_chat_production` | Authenticated Chrome dashboard; scoped-key API call returned 200 | Verified | Wire runtime; then revoke old full-access key |
| OpenRouter | Default Workspace; provider exposes no immutable workspace ID on this dashboard surface | New `Beyond Chat Production 2026-07` key; `/api/v1/auth/key` returned 200 | Verified | `$25` monthly cap; monitor and revise from actual accepted-output economics |
| Exa | No immutable account/project ID exposed by the key probe | Minimal one-result search returned 200 using the local runtime credential; deployed backend reports configured | Credential verified | Reconcile key/account in Exa dashboard before commercial pilot |
| Financial Datasets | No immutable account/project ID exposed by the key probe | Minimal one-statement read returned 200 using the local runtime credential; deployed backend reports configured | Credential verified | Record contracted plan/rate before commercial forecast |

## MCP posture

| MCP | Evidence | Scope |
|---|---|---|
| `supabase_beyond_chat` | Project URL, migrations, and advisors returned successfully | Correct Beyond project only |
| `vercel_beyond_chat` | Team/project list and project details returned successfully | Frontend project only; it does not expose backend or runner |
| `workos` | Global OAuth grant refreshed; fresh CLI MCP process returned `whoami`, application, role, permission, and organization queries. The already-running desktop transport still returns OAuth-required until restart/reconnect. | Team-wide, multiple environments; always pass canonical environment `environment_01KX84DX4GA5XMSN4D4FK9DFND`; legacy A is read-only |
| GitHub | No GitHub MCP tool was present in this task’s active registry | CLI verified; MCP claim remains unproven |

## Supabase advisor evidence

The transitional schema currently produces two external security warnings:

- `public.current_workspace_ids()` is a callable `SECURITY DEFINER` function.
- `public.is_workspace_member(target_workspace_id uuid)` is a callable `SECURITY DEFINER` function.

Because the legacy schema is intentionally being destroyed before customer data, do not spend migration complexity preserving these functions. The canonical replacement must place privileged helpers outside exposed schemas or revoke public/authenticated execution, then pass advisors without unexplained warnings.
