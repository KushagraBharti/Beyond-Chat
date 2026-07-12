# WorkOS Rollback Runbook

This runbook is non-destructive. Never delete either production environment or application as part of a routine rollback.

## Before configuration

1. Export/query the canonical application, branding, roles, permissions, API-key metadata, and organization count.
2. Record provider IDs, timestamps, operator, and result in the mutation log without secret values.
3. Confirm legacy Production A is unchanged and still has zero organizations.
4. Confirm a backend deployment rollback target exists.

## Roll back application routing

If AuthKit routing breaks before customer data exists:

1. Roll the backend deployment back to the last version that does not require WorkOS.
2. Remove `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, and `WORKOS_COOKIE_PASSWORD` from backend Vercel Production only if the rolled-back code no longer reads them.
3. Restore the canonical AuthKit application from the captured pre-change record. The 2026-07-11 baseline was: default name, empty redirect/logout/origin lists, 300-second access token, 31,536,000-second maximum session, and 172,800-second inactivity timeout.
4. Revoke the new WorkOS production API key only after the rollback deployment is healthy and no runtime still uses it.
5. Do not point production at the unused legacy environment as an emergency shortcut.

## Roll back roles

Disable role-dependent product behavior behind the application feature gate first. Do not delete roles or permissions while memberships may reference them. Preserve provider records for forensic review, then remove unused additions only through a separately reviewed migration.

## Verification

- Backend health endpoint responds.
- Public frontend remains reachable.
- Protected routes fail closed rather than accepting unsigned or stale identity.
- Vercel metadata shows only the variable names intended by the rollback.
- Canonical and legacy WorkOS organization counts match the pre-change record.
- Mutation log records the rollback and recovery result.

Escalate rather than improvising if any real user, organization, SSO connection, or directory exists at rollback time.
