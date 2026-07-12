# Phase 2 Organization Lifecycle — Local Evidence and Open Production Gates

Snapshot date: 2026-07-12. Workstream: Phase 2 organization/identity (Claude).
Starting commit `a908491`; work performed on top of `cd6cc13` in the shared
checkout. This document records the server-enforced organization lifecycle,
the five-role authorization contract, WorkOS reconciliation behavior, and the
two-organization isolation proof set. It is not a Phase 2 completion claim:
live provider proof and two database-backed atomic operation contracts remain
open production gates.

## 1. Authorization contract

- Canonical matrix: `backend/src/authorization/policy.py`
  (`OrganizationPermission`, `ORGANIZATION_ROLE_PERMISSIONS`).
- Shared fixture: `fixtures/phase2/role-permissions.json` — backend
  (`tests/test_authorization_policy.py`) and frontend
  (`frontend/src/features/organizations/permissions.test.ts`) both assert
  exact equality against it, so role semantics cannot drift between layers.
- Frontend mirror (`frontend/src/features/organizations/permissions.ts`) is
  render-gating only; every route re-checks permissions server-side.
- `/api/auth/session` now returns the server-computed `permissions` list.
- Unknown roles resolve to zero permissions; `strict_organization_role`
  rejects unknown role values with 400. Owner-targeting operations and
  owner-role grants require `manage_owner_lifecycle` (owner only).
- Administrative member actions never target the actor's own membership
  (stable 409). `MembershipAdminService` re-reads the actor at operation entry
  and again immediately before the provider side effect, so a locally observed
  demotion, suspension, revocation, or removal fails closed. The ordinary
  count-based last-owner check is useful defense in depth but is **not** a
  distributed concurrency guarantee; the required atomic reservation is
  specified in Section 6.

## 2. Organization lifecycle API (all CSRF-protected, org-scoped, fail-closed)

| Operation | Route | Permission |
|---|---|---|
| List organizations | `GET /api/organizations` | authenticated |
| Switch organization | `POST /api/organizations/switch` | active membership (server-verified) |
| Member directory | `GET /api/organizations/{org}/members` | `view_member_directory` (active members, lifecycle fields stripped) |
| Member lifecycle view | same, `status` filter | `view_member_lifecycle` |
| Change member role | `PATCH /api/organizations/{org}/members/{member_id}` | `change_member_roles` |
| Suspend member | `POST .../members/{member_id}/suspend` | `suspend_members` |
| Restore member | `POST .../members/{member_id}/restore` | `restore_members` (suspended → active only) |
| Revoke member | `DELETE .../members/{member_id}` | `revoke_members` |
| Invite / bulk invite | `POST /api/invitations[/bulk]` | `invite_members` (+ owner-lifecycle for owner grants) |
| List invitations | `GET /api/organizations/{org}/invitations` | `view_member_lifecycle` |
| Revoke invitation | `DELETE /api/invitations/{id}` | `invite_members` |

Lifecycle semantics (`backend/src/identity/membership_admin.py`):

- **Ordering:** WorkOS is mutated first (deactivate/reactivate/delete/update
  role), then canonical state. Login synchronization now preserves canonical
  `suspended` and `revoked` states, and generic active membership webhooks do
  not resurrect either state. Provider-first still requires a durable saga to
  prove recovery from every provider-success/canonical-failure interval.
- Same-state operations are idempotent (200 with current state); invalid
  transitions return stable 409s (suspend on non-active, restore on revoked,
  role change on non-active).
- Memberships without a stored `workos_membership_id` are resolved through
  the provider (`find_membership`) before mutation; unresolvable links 409.
- Provider errors surface as 502 with canonical state untouched.
- Every lifecycle change writes a best-effort `audit_events` row
  (action, actor, target membership, metadata).
- Cross-organization member identifiers 404 identically to unknown ones.

## 3. WorkOS webhook reconciliation

- Signature verification uses the installed SDK client's
  `client.webhooks.verify_event` before parsing/reconciliation. A real signed
  SDK adapter contract test proves valid, malformed, and invalid signatures;
  request-boundary tests prove invalid signatures produce **zero mutation**.
- Event allowlist matches the installed SDK literals exactly:
  `organization.{created,updated,deleted}`,
  `organization_membership.{created,updated,deleted}`,
  `user.{created,updated,deleted}`, and
  `invitation.{created,accepted,revoked,resent}`.
  - WorkOS emits no `invitation.expired` (expiry derives from `expires_at`);
    the previously allowlisted name was removed.
  - `invitation.resent` remains pending, refreshes expiry, is idempotent, and
    cannot regress accepted/revoked terminal state.
- Idempotent inbox (`webhook_inbox`), duplicate delivery returns
  `duplicate: true` without reapplication; out-of-order events cannot
  resurrect revoked membership (object-version staleness guard); webhooks
  scoped to one organization cannot mutate another organization's rows.

## 4. Two-organization isolation coverage

All at the request/API boundary in `backend/tests/test_workos_identity.py`
unless noted; run with `uv run pytest tests/test_workos_identity.py
tests/test_authorization_policy.py tests/test_membership_admin.py`.

1. One user, Owner in A + Member in B — fixture baseline.
2. A-owner privileges denied in B (`test_owner_privileges_do_not_cross_organizations`).
3. Switch changes effective role to canonical B role (`test_switch_uses_canonical_role_not_provider_claim`).
4. A-scoped resource IDs under B scope → 404 (same test, plus member 404 case).
5. B's directory invisible while scoped to A (404, existence not confirmed).
6. Invitations administered only in their organization (`test_invitation_revoke_is_tenant_scoped_and_bulk_is_idempotent`).
7. Role semantics organization-specific (tests 2/3 + permission matrix tests).
8. Suspension in A preserves B (`test_suspension_in_one_organization_preserves_the_other`).
9. Revocation in A immediate, B preserved (`test_revocation_in_one_organization_preserves_the_other`, `test_revoked_membership_denies_same_still_valid_session`).
10. Unrelated organization unswitchable (`test_organization_switch_requires_current_internal_membership`).
11. Client-supplied org IDs/role claims never override canonical membership (switch + `test_switch_uses_canonical_role_not_provider_claim`; provider token claims marked untrusted).
12. Cross-org vs unknown IDs indistinguishable (404 both, `test_member_lifecycle_authorization_boundaries`).
13. Webhook replay cannot cross organizations (`test_membership_webhook_for_one_organization_cannot_mutate_another`).
14. Duplicate reconciliation idempotent (`test_stale_membership_webhook_cannot_resurrect_revoked_access`).
15. Stale actors are re-read twice and fail closed. A deterministic concurrent
    test also proves why the count-based last-owner guard still needs the
    atomic reservation below.

## 5. Frontend (`/settings`, `/admin` → `OrganizationPanel`)

Real API data only (no fixtures): org switcher, member directory with role and
lifecycle state, role-change select, suspend/restore/revoke with explicit
confirmation, server-backed pending invitations with revocation, single and
bulk invites. States implemented and tested: loading, empty directory,
no-organization onboarding, non-admin truthful denial, disabled controls with
reasons (self-administration, owner protection, missing permission), 409/403
conflict surfacing, session-expired re-authentication link. Switching
refreshes the session and reloads at `/home`. Suspended-in-selected-org
sessions fail closed to re-authentication (cross-tab rule: other-organization
sessions are unaffected).

## 6. Closed repository requests and open atomic contracts

IR-1 through IR-4 are implemented locally and covered by deterministic tests:

- updated/inactive maps active to suspended; deleted maps to revoked; generic
  active events preserve suspended/revoked;
- login sync preserves suspended/revoked and refuses to return an active
  identity for them;
- `invitation.resent` safely refreshes pending expiry without terminal-state
  regression;
- unknown provider role slugs map to Viewer with a content-free structured
  warning, while administrative request models reject unknown roles.

### Atomic membership lifecycle reservation (required migration/RPC)

Production last-owner and stale-actor safety requires one organization-scoped
transactional claim. The RPC must accept organization ID, actor profile ID,
target membership ID, operation, desired role/state, idempotency key, request
digest, and reservation TTL. Under an organization advisory/row lock it must:

1. re-read the actor's active canonical membership and permission;
2. lock/re-read the target and count active owners;
3. reject any operation that could leave zero active owners;
4. create or return an idempotent reservation bound to the request digest;
5. expose states `reserved`, `provider_succeeded`, `committed`, `compensating`,
   `failed`, and `expired`, with provider operation ID and audit-event linkage;
6. permit only the reservation owner to record provider outcome and commit the
   canonical mutation; and
7. support a reconciler for reservation timeout, provider timeout, provider
   success/canonical failure, and compensation failure.

`test_non_atomic_last_owner_guard_contract_exposes_distributed_race` is the
authoritative local proof that the current count/check cannot close this gate.

### Atomic bulk invitation operation claim (required migration/RPC)

The current endpoint's check-before-provider sequence is not crash- or
concurrency-idempotent. A durable operation claim must bind organization,
actor, idempotency key, normalized request digest, and ordered normalized
entries. Same key/same digest returns the operation; same key/different digest
is a stable conflict. Each entry needs a durable state (`pending`, `sending`,
`sent`, `failed`), provider invitation ID, attempt count, lease owner/expiry,
and safe error code. Only a leased claim owner may call WorkOS; completed
entries are never resent; partial completion resumes. Finalization records
counts and an audit reference atomically. A sweeper recovers expired leases
and lost responses by provider lookup before retry. Until this exists, bulk
idempotency is a local best-effort behavior, not a production guarantee.

## 7. Live-provider actions required but not performed (manager-gated)

- Configure WorkOS custom roles `builder` and `viewer` in the production
  environment (role slugs already validated end-to-end in code).
- Register the production webhook endpoint URL and verify a live delivery.
- Live two-organization journey with a second Google identity (invite →
  accept → switch → suspend → restore → revoke) once provider mutation is
  authorized.

## 8. Evidence classification

- **Proven locally:** role matrix, request-boundary tenant isolation, SDK
  signature adapter, webhook state preservation, login-sync preservation,
  stale-actor rereads, strict bulk-row parsing, and frontend lifecycle states.
- **Not yet proven remotely:** production webhook delivery, custom WorkOS role
  configuration, live two-identity/two-organization lifecycle, provider outage
  recovery, and database-backed lifecycle/bulk-operation sagas.
- **Phase 2 gate:** open until both atomic contracts are migrated, adversarially
  tested against linked Postgres, and the live-provider journey succeeds.
