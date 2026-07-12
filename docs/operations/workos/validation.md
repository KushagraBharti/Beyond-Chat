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
- The controlled production-auth exercise has created one profile,
  organization, and Owner membership. Additional organizations require an
  explicit isolation-test plan.

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
- `uv run --isolated pytest -q` passed in the recorded application-validation session.
- Local PostgreSQL 17.10 replay now passes all seven migrations, two Phase 2 adversarial suites, and two service-table policy suites without Docker.
- Project-scoped MCP reported seven remote migration versions, 26 RLS-enabled
  public tables, and a clean security advisor. Its earlier empty-table count is
  historical. Supabase CLI authentication is expired, so CLI/MCP agreement
  remains open.
- Production authentication now succeeds for one controlled
  profile/organization/Owner foundation; the earlier all-empty public-table
  snapshot is therefore historical.

## Production application evidence required later

- Login, callback, logout, refresh, expiry, and invalid-state paths work in production.
- Invitation, organization switch, membership revocation, and session revocation work.
- Two controlled test organizations cannot cross-read or cross-write through API, PostgREST, Storage, Realtime, or guessed identifiers.
- Rollback removes WorkOS routing without locking operators out or deleting provider resources.

The current baseline passes the local backend identity/authorization contract,
deterministic adversarial tests, and one controlled production login/bootstrap.
Complete provider-configuration capture, credential ownership proof, frontend
migration, production invitation/switch/revocation, CLI-backed local/remote
comparison, and live two-tenant PostgREST/Storage/Realtime evidence remain open.
