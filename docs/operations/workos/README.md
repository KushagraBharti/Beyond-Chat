# WorkOS Production Control Plane

Evidence date: **2026-07-11 UTC**.

This directory is the operational source of truth for the Beyond Chat WorkOS environment. It records identifiers and configuration contracts, never credential values.

## Canonical resources

| Resource | Immutable ID | Posture |
|---|---|---|
| WorkOS team | `Kushagra` | Caller verified as `Kushagra Bharti <kushagrabharti@gmail.com>`, role `ADMIN` |
| Canonical production environment | `environment_01KX84DX4GA5XMSN4D4FK9DFND` | Selected, but dashboard Production activation is blocked on billing details |
| Canonical AuthKit application | `app_01KX84DXGTP1ZKASV4PBVSASM6` | Default state; not yet configured |
| Canonical client | `client_01KX84DX9XT83ZSTCBM0T2XC8G` | Installed backend-only in Vercel Production |
| Unused legacy production environment | `environment_01KX6XSE77SSHVD4SVM8ZY0QZJ` | Read-only legacy; do not mutate or delete automatically |
| Unused legacy AuthKit application | `app_01KX6XSERQW6QCG30ZE2KTD410` | Read-only legacy; do not mutate or delete automatically |

## Current truthful state

- Both production environments have zero organizations.
- The canonical application is still named `Kushagra's Application`.
- Redirect URIs, logout URIs, web origins, and application/homepage URLs are empty.
- Access-token expiry is 300 seconds, maximum session time is 31,536,000 seconds, and inactivity timeout is 172,800 seconds.
- Canonical roles are the default `admin` and `member`; requested Owner/Builder/Viewer roles do not yet exist.
- No canonical production API key exists.
- A signature-verifying, replay-safe backend endpoint now exists at `POST /api/webhooks/workos`, but no provider webhook is configured or deployed yet.
- `WORKOS_CLIENT_ID` and `WORKOS_COOKIE_PASSWORD` exist only in Vercel backend Production as Sensitive values.
- `WORKOS_API_KEY` is absent from Vercel.

## Authentication posture

The global WorkOS MCP OAuth grant was refreshed successfully. A fresh Codex CLI MCP process verified identity and provider state. The already-running Codex desktop MCP transport still holds stale OAuth state and must be restarted or explicitly reconnected before WorkOS MCP calls will work in that process.

## Documents

- [configuration.md](configuration.md) defines the exact activation and AuthKit settings.
- [roles-and-permissions.md](roles-and-permissions.md) defines the coarse WorkOS role layer and the internal authorization boundary.
- [validation.md](validation.md) defines evidence required before the provider is called ready.
- [rollback-runbook.md](rollback-runbook.md) defines a non-destructive rollback.

WorkOS is **selected but not production-ready**. Do not claim otherwise until every validation item passes.

## Implemented application boundary

The backend now owns the AuthKit redirect/callback/logout flow with sealed, HTTP-only session cookies. Cookie-authenticated mutations require a matching `beyond_csrf` cookie and `X-CSRF-Token` header. `GET /api/auth/session` resolves the WorkOS session and then re-reads the active internal organization membership; token role claims are never sufficient authorization. Organization listing/switching and single/bulk invitation routes use the same canonical principal.

Owner/Admin organization administration reads are canonical-database projections:

- `GET /api/organizations/{organization_id}/members`
- `GET /api/organizations/{organization_id}/invitations`

Both routes require the path ID to equal the selected internal organization, support repeatable `status` filters plus opaque `cursor` and bounded `limit` pagination, and return only UI-safe fields. Cursors are stable over immutable canonical row IDs and are not provider cursors. Invitation revocation continues to use `DELETE /api/invitations/{invitation_id}` with the canonical ID returned by the list; the repository verifies organization ownership before the provider call. Bulk invitations require an organization-scoped idempotency key. Allowlisted membership and invitation webhooks reconcile canonical list state, ignore older object updates, and deduplicate exact event replays.

The WorkOS identity routes are deliberately excluded from the transitional Supabase-auth middleware. Existing legacy product routes have not yet been migrated, and the frontend still uses the legacy login surface, so this backend foundation alone does not satisfy the all-protected-routes gate.
