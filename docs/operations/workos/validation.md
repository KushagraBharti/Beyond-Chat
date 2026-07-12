# WorkOS Production Validation

WorkOS is ready only when all checks below have authoritative evidence.

## Identity and scope

- Caller is `Kushagra Bharti <kushagrabharti@gmail.com>`, team `Kushagra`, role `ADMIN`.
- Every query/mutation passes environment `environment_01KX84DX4GA5XMSN4D4FK9DFND` explicitly.
- Application and client IDs match the canonical register.
- Legacy Production A remains unchanged and is not linked to runtime configuration.

## Provider configuration

- Dashboard reports Production enabled.
- Application name, homepage, initiate-login URL, redirect URIs, logout URIs, and web origins exactly match [configuration.md](configuration.md).
- Session values are 300-second access tokens, seven-day maximum, and 48-hour inactivity timeout.
- Branding says Beyond Chat and references only authoritative assets/URLs.
- Owner/Admin/Builder/Member/Viewer and their exact permission assignments match [roles-and-permissions.md](roles-and-permissions.md).
- Organization count remains zero until an explicit onboarding test creates controlled fixtures.

## Credentials

- Vercel backend project ID is `prj_LVvFbBJ4ksVdgGTkBwJdZ82mAIZu`.
- Production contains Sensitive `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, and `WORKOS_COOKIE_PASSWORD`.
- Frontend, runner, and Modal do not contain `WORKOS_API_KEY` or `WORKOS_COOKIE_PASSWORD`.
- No secret value appears in tracked files, logs, screenshots, provider docs, or command history.
- A webhook secret is absent until a deployed verification endpoint exists.

## Local application evidence (2026-07-11)

- Backend AuthKit login state, callback state rejection, sealed session, logout cookie deletion, organization switching, invitation creation/revocation, bulk idempotency, webhook replay, and membership revocation are covered by deterministic route tests.
- Protected WorkOS routes re-read canonical membership and ignore provider role claims for authorization.
- Role ordering and cross-organization project denial are covered for Owner/Admin/Builder/Member/Viewer.
- The database adversarial script covers two organizations, guessed IDs, write attempts, Storage rows, Realtime publication scope, invitation visibility, wrong issuer, missing `org_id`, and revoked membership.
- `uv run --isolated pytest -q` passes. Local database replay could not be executed in this session because the Windows Docker engine was unavailable. No remote Supabase mutation was attempted because CLI authentication is expired.

## Production application evidence required later

- Login, callback, logout, refresh, expiry, and invalid-state paths work in production.
- Invitation, organization switch, membership revocation, and session revocation work.
- Two controlled test organizations cannot cross-read or cross-write through API, PostgREST, Storage, Realtime, or guessed identifiers.
- Rollback removes WorkOS routing without locking operators out or deleting provider resources.

The current baseline passes the local backend identity/authorization contract and deterministic adversarial tests. Production activation, provider configuration, API-key placement, frontend migration, live callback/session exercise, local/remote database replay, and live PostgREST/Storage/Realtime tenant evidence remain open.
