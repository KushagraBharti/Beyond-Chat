# WorkOS Production Control Plane

Evidence date: **2026-07-11 UTC**.

This directory is the operational source of truth for the Beyond Chat WorkOS environment. It records identifiers and configuration contracts, never credential values.

## Canonical resources

| Resource | Immutable ID | Posture |
|---|---|---|
| WorkOS team | `Kushagra` | Caller verified as `Kushagra Bharti <kushagrabharti@gmail.com>`, role `ADMIN` |
| Canonical production environment | `environment_01KX84DX4GA5XMSN4D4FK9DFND` | Selected; production auth is working |
| Canonical AuthKit application | `app_01KX84DXGTP1ZKASV4PBVSASM6` | Production auth is working; complete configuration inventory still requires capture |
| Canonical client | `client_01KX84DX9XT83ZSTCBM0T2XC8G` | Installed backend-only in Vercel Production |
| Unused legacy production environment | `environment_01KX6XSE77SSHVD4SVM8ZY0QZJ` | Read-only legacy; do not mutate or delete automatically |
| Unused legacy AuthKit application | `app_01KX6XSERQW6QCG30ZE2KTD410` | Read-only legacy; do not mutate or delete automatically |

## Current truthful state

- The canonical production path has one controlled profile, organization, and
  Owner membership created by a successful authentication flow.
- Earlier metadata showing a default application name and empty URL/origin
  lists is superseded; the effective production settings still need to be
  captured without changing the provider.
- Access-token expiry is 300 seconds, maximum session time is 31,536,000 seconds, and inactivity timeout is 172,800 seconds.
- Canonical roles are the default `admin` and `member`; requested Owner/Builder/Viewer roles do not yet exist.
- Production auth proves a usable backend identity path. The exact provider-key
  identity and environment ownership still must be recorded without revealing
  the credential value.
- A signature-verifying, replay-safe backend endpoint now exists at `POST /api/webhooks/workos`, but no provider webhook is configured or deployed yet.
- `WORKOS_CLIENT_ID` and `WORKOS_COOKIE_PASSWORD` exist only in Vercel backend Production as Sensitive values.
- `WORKOS_API_KEY` is absent from Vercel.

## Authentication posture

The WorkOS MCP OAuth grant is active in the current process. On 2026-07-12,
`whoami` and explicit canonical-environment application, role, organization, and
API-key metadata queries succeeded.

## Documents

- [configuration.md](configuration.md) defines the exact activation and AuthKit settings.
- [roles-and-permissions.md](roles-and-permissions.md) defines the coarse WorkOS role layer and the internal authorization boundary.
- [validation.md](validation.md) defines evidence required before the provider is called ready.
- [rollback-runbook.md](rollback-runbook.md) defines a non-destructive rollback.

WorkOS authentication is **working but the Phase 2 production gate is not
closed**. One controlled profile/organization/Owner proves login and bootstrap;
it does not prove invitation, switching, revocation, custom roles, two-tenant
isolation, or migration of every protected route.

## Implemented application boundary

The backend now owns the AuthKit redirect/callback/logout flow with sealed, HTTP-only session cookies. Cookie-authenticated mutations require a matching `beyond_csrf` cookie and `X-CSRF-Token` header. `GET /api/auth/session` resolves the WorkOS session and then re-reads the active internal organization membership; token role claims are never sufficient authorization. Organization listing/switching and single/bulk invitation routes use the same canonical principal.

Owner/Admin organization administration reads are canonical-database projections:

- `GET /api/organizations/{organization_id}/members`
- `GET /api/organizations/{organization_id}/invitations`

Both routes require the path ID to equal the selected internal organization, support repeatable `status` filters plus opaque `cursor` and bounded `limit` pagination, and return only UI-safe fields. Cursors are stable over immutable canonical row IDs and are not provider cursors. Invitation revocation continues to use `DELETE /api/invitations/{invitation_id}` with the canonical ID returned by the list; the repository verifies organization ownership before the provider call. Bulk invitations require an organization-scoped idempotency key. Allowlisted membership and invitation webhooks reconcile canonical list state, ignore older object updates, and deduplicate exact event replays.

The WorkOS identity routes are deliberately excluded from the transitional Supabase-auth middleware. Existing legacy product routes have not yet been migrated, and the frontend still uses the legacy login surface, so this backend foundation alone does not satisfy the all-protected-routes gate.
