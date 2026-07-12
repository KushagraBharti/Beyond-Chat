# Provider Identity and Authentication Register

Evidence captured: **2026-07-12 UTC**, against commit
**`a90849180a3f1c230d989bebcf57442382c4778d`**. “Verified” means an
authenticated provider surface returned the recorded immutable ID or a
provider-authenticated request succeeded. It does not mean the corresponding
product integration is implemented. Later evidence supersedes a row only when
it identifies this capture and records the replacement immutable facts.

| Provider/surface | Immutable resource identity | Authentication evidence | Status | Next gate |
|---|---|---|---|---|
| GitHub CLI | User ID `65621922`; login `KushagraBharti` | `gh auth status`; authenticated API call to `/user` | Verified, over-scoped | Replace OAuth token scopes `delete_repo,gist,read:org,repo,workflow` with least privilege; GitHub MCP was not exposed in this task |
| Vercel team | `team_zZPyc4iWczMNMcU7ReWg3dGc`; slug `kushagras-projects-5d330ca5` | CLI `whoami`, team listing, MCP team listing | Verified | Keep one external-mutation owner at a time |
| Vercel frontend | `prj_oq31gdbP117PJBxU3A0v87ewWqdr`; production alias `beyond-chat-production.vercel.app` | CLI link/project inspect; project-scoped MCP; READY deployment `dpl_8ZSswK2T7BUvBDfvVzUc6xX1ZgGt` | Verified | Frontend receives only VITE/public Supabase values |
| Vercel backend | `prj_LVvFbBJ4ksVdgGTkBwJdZ82mAIZu`; production alias `beyond-chat-backend.vercel.app` | CLI link/project inspect; production redeploy READY; project-scoped Production environment-variable metadata query | Verified | `WORKOS_CLIENT_ID` and `WORKOS_COOKIE_PASSWORD` are installed as Sensitive; `WORKOS_API_KEY` remains absent until WorkOS Production is enabled |
| Vercel legacy runner | `prj_C0NH6PmkehZKvrVbWjijd6G9l18k`; production alias `beyond-chat-sandbox-runner.vercel.app` | CLI link/project inspect; production redeploy READY; unauthenticated POST returns 401 | Verified, temporary | Retire after Modal parity and rollback proof |
| Supabase organization | `nwvyypcrdwhzwpurtonm` | CLI project listing | Verified | Restrict operational tokens to project scope where supported |
| Supabase project | Ref `vffndfwdykxqjlnntuuk`; URL `https://vffndfwdykxqjlnntuuk.supabase.co` | MCP URL/migration/table/advisor calls; linked ref files match; CLI 2.109.0 currently returns 401 | MCP verified; CLI gate failed | Reauthenticate CLI, then compare the seven local/remote versions without repairing history |
| Modal | Profile `kushagrabharti`; environment `beyond-chat-production`; app `ap-FbZZRj50uSQRtGe2nwvlYH`; release `2026-07-11.4` images `im-sM7PhCwKy46WBkVzcK23iM`, `im-kGV2kfZyxOSCnGQWnkHA7m`, `im-HbHwCRRnHDWgjdoNTB0bx9`, `im-QDEEaGhyZNLNQ3JdR0PWwe`; volumes `vo-32ghh7cJPxUHAg54jwujdl`, `vo-Vji1FReSJUHavoZX6WsIEL`, `vo-k3pPcHikaFcfChazNxkILK` | Immutable bindings in `infra/modal/rollout.json` and `fixtures/phase4/releases/2026-07-11.4/modal-provider-state.json`; supersedes the 2026-07-11 empty app-list snapshot | Provider plane verified; production routing disabled at 0% | Complete production database/RPC admission, real gateway parity, controlled canary, rollback observation, and service-identity proof before routing or retiring the legacy runner |
| WorkOS team | Team `Kushagra`; caller `Kushagra Bharti <kushagrabharti@gmail.com>`; role `ADMIN` | Current MCP process returned `whoami` and authoritative canonical-environment queries | Verified | Always pass the canonical environment ID explicitly |
| WorkOS production legacy A | Environment `environment_01KX6XSE77SSHVD4SVM8ZY0QZJ`; app `app_01KX6XSERQW6QCG30ZE2KTD410`; client `client_01KX6XSED33RARK1GY1B5J9X0M` | MCP application and organization-count queries | Explicitly unused/legacy; read-only | Never delete automatically; retain only as rollback evidence until the canonical environment is live |
| WorkOS canonical production B | Environment `environment_01KX84DX4GA5XMSN4D4FK9DFND`; app `app_01KX84DXGTP1ZKASV4PBVSASM6`; client `client_01KX84DX9XT83ZSTCBM0T2XC8G` | Provider metadata plus successful production auth | Selected canonical pair; auth working | One controlled profile/organization/Owner exists; invitation, switch, revocation, custom-role, and all-route evidence remain open |
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
| `workos` | Current MCP process returned `whoami`, application, role, organization-count, and API-key metadata queries. | Team-wide, multiple environments; always pass canonical environment `environment_01KX84DX4GA5XMSN4D4FK9DFND`; legacy A is read-only |
| GitHub | No GitHub MCP tool was present in this task’s active registry | CLI verified; MCP claim remains unproven |

## Supabase advisor evidence

The project-scoped security advisor returned no findings on 2026-07-12. The
legacy callable `SECURITY DEFINER` warnings are historical and their functions
are absent from the canonical schema. Performance output contains expected
`unused_index` INFO notices because all 26 public tables are empty; it contains
no missing-foreign-key-index finding.
