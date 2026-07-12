# Phase 0 Provider Mutation Log

All timestamps are 2026-07-11 UTC. No credential values are recorded.

| Resource | Mutation | Evidence/rollback |
|---|---|---|
| Supabase CLI local session | Reauthenticated CLI | `projects list` and `migration list --linked` now succeed and match MCP ref `vffndfwdykxqjlnntuuk`; revoke the named CLI token in Supabase account settings to roll back |
| Vercel frontend `prj_oq31…` | Removed `OPENROUTER_API_KEY`, `EXA_API_KEY`, `FINANCIAL_DATASETS_API_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_PASSWORD` from Production | Pure Vite build and no references proved them unused; DPAPI snapshot at `$HOME/.beyond-chat-backups/vercel/beyond-chat-frontend-production-20260711-061301.env.dpapi`; re-add from authoritative provider stores if rollback is ever required |
| OpenRouter Default Workspace | Created `Beyond Chat Production 2026-07` | `$25` credit limit, monthly reset, no expiration; `/api/v1/auth/key` returned 200; revoke by key name in workspace key settings |
| Vercel backend `prj_LVv…` | Updated `OPENROUTER_API_KEY` as Sensitive | Direct key verification 200; previous ignored local env DPAPI snapshot retained; rotate to another verified key to roll back |
| Vercel runner `prj_C0N…` | Updated `OPENROUTER_API_KEY` as Sensitive | Same verified key; rotate or retire runner |
| Composio project `pr_82bhnZTH8xSD` | Created `Beyond Chat Runtime 2026-07` scoped API key | Permissions: Tools read; Tool execution write; Sessions read/write; Connected accounts read/write; Auth configs read; Toolkits read. Proxy, triggers, webhooks, observability, and other writes denied. Read-only API probe returned 200. Revoke by name after replacing runtime config |
| Vercel backend `prj_LVv…` | Added `COMPOSIO_API_KEY` as Sensitive | Backend only; direct Composio probe 200; remove/replace to roll back |
| Backend + legacy runner | Rotated `DEXTER_RUNNER_SHARED_SECRET` | Fresh 256 random bits, identical in both Vercel projects and ignored local envs; pre-rotation backend env exists in DPAPI backup; unauthenticated runner POST returns 401 |
| Vercel backend | Redeployed prior production source | New deployment `beyond-chat-backend-j2n4immir-kushagras-projects-5d330ca5.vercel.app`, aliased and READY; use Vercel rollback to prior deployment |
| Vercel runner | Redeployed prior production source | New deployment `beyond-chat-sandbox-runner-mab7qfc8o.vercel.app`, aliased and READY; use Vercel rollback to prior deployment |
| WorkOS MCP global OAuth grant | Reauthorized `workos` as `Kushagra Bharti <kushagrabharti@gmail.com>` | `codex mcp login workos` completed; a fresh CLI MCP process verified team `Kushagra`, role `ADMIN`, four environment IDs, both production apps, roles/permissions, and zero organizations. The already-running desktop MCP transport must be restarted/reconnected to load the grant |
| WorkOS canonical selection | Selected Production B: environment `environment_01KX84DX4GA5XMSN4D4FK9DFND`, app `app_01KX84DXGTP1ZKASV4PBVSASM6`, client `client_01KX84DX9XT83ZSTCBM0T2XC8G` | Selection only. Candidate A is documented as unused/legacy and was not changed or deleted |
| WorkOS canonical provider state | Attempted non-persisting URL dry-run validation through MCP; no provider mutation succeeded | MCP mutation confirmations were cancelled by the non-interactive worker, and the dashboard independently showed Production disabled until billing details are added. Canonical and legacy app records remained unchanged; both organization counts remained zero |
| Vercel backend `prj_LVv…` | Added `WORKOS_CLIENT_ID` and a freshly generated `WORKOS_COOKIE_PASSWORD` as Sensitive Production variables | Vercel metadata query confirms both names, Production target, and Sensitive type without returning values. Remove the two variables to roll back before auth code is enabled |

No database reset, live Stripe charge/product/price, persistent WorkOS provider mutation, WorkOS billing activation, Modal app creation, or Composio toolkit/auth-config mutation occurred in this workstream.
