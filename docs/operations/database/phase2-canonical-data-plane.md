# Phase 2 canonical Supabase data plane

## Production identity

| Field | Value |
| --- | --- |
| Project | `Beyond Chat Production` |
| Project ref | `vffndfwdykxqjlnntuuk` |
| Organization ref | `nwvyypcrdwhzwpurtonm` |
| Region | `us-east-2` |
| Database engine | PostgreSQL 17 |
| API origin | `https://vffndfwdykxqjlnntuuk.supabase.co` |

Every database command must prove the linked ref before mutation. Never infer
the target from an account name or an open dashboard tab.

## Reset decision

The prototype migration chain was intentionally discarded rather than evolved.
Immediately before the reset, the authoritative remote inventory was:

- `auth.users`: 0
- rows in public application tables: 0
- `storage.objects`: 0
- `realtime.messages`: 0
- legacy public tables: 14
- legacy migration rows: 19

The deployed Vercel Production environment used only the Supabase API URL and
publishable/anon keys. It had no database password or direct Postgres URL. The
canonical model therefore reset the public schema and did not preserve
`auth.users` identifiers.

## Backup and restore evidence

The pre-reset archive is outside the repository:

```text
$HOME/.beyond-chat-backups/supabase/20260711-074743/
```

Evidence:

| Check | Result |
| --- | --- |
| Format | PostgreSQL custom archive, compression level 9 |
| Encryption | Windows DPAPI, `CurrentUser` scope |
| Plaintext SHA-256 | `1A24F111D61A851CC1030F76FE9C2F5F8D3E7F5433896DB31357E336EE8FF62A` |
| Encrypted SHA-256 | `89088F4B910852E062F2E82E1125344835B83080F7450380E1A2B70EF426313B` |
| Encrypted bytes | 301,238 |
| DPAPI decrypt/hash round trip | passed |
| Plaintext archive after validation | removed |
| Disposable restore | passed on PostgreSQL 17.10 |

The restore reproduced 14 legacy public tables, 0 public rows, 0 auth users, 0
storage objects, 1 legacy bucket, 19 migration rows, 14 RLS-enabled tables, and
21 public policies. The portable upstream PostgreSQL restore excluded only the
Supabase-managed `supabase_vault` extension and `vault` schema because those are
not distributed in upstream PostgreSQL. No Vault rows or application references
existed.

Restore evidence is retained outside the repository at:

```text
$HOME/.beyond-chat-tools/supabase-restore-validation/20260711-074743/evidence.json
```

## PostgreSQL validation toolchain

The disposable validation runtime is the official EnterpriseDB PostgreSQL 17.10
Windows x64 binary archive downloaded from the EnterpriseDB PostgreSQL binaries
page. It is extracted outside the repository at:

```text
$HOME/.beyond-chat-tools/postgresql-17.10-2-portable/install/pgsql
```

Archive SHA-256:

```text
EF9B1E5E23D2E8A83914BA13D9DC536A72210FBA53FD1808FF1F7E06BB22B106
```

The archive is delivered from EnterpriseDB's authoritative download host, but
EnterpriseDB did not publish a separate checksum for the binary archive. The
individual executable hashes and provenance are retained in the operator
evidence. Do not silently replace this runtime; record a new version and hashes.

## Canonical history

Only these migrations are current:

1. `20260711130000_canonical_identity_and_multitenancy.sql`
2. `20260711131500_advisor_hardening.sql`

The first migration deliberately drops and rebuilds `public` and `app_private`.
It is safe only for a verified empty environment. The second captures advisor
hardening discovered during the first production application.

The canonical public tables are:

1. `profiles`
2. `external_identities`
3. `organizations`
4. `organization_memberships`
5. `teams`
6. `team_memberships`
7. `projects`
8. `project_memberships`
9. `invitations`
10. `bulk_invite_batches`
11. `bulk_invite_entries`
12. `resource_grants`
13. `webhook_inbox`
14. `outbox_events`
15. `audit_events`

There are no foreign keys to `auth.users` and no functions in the exposed
`public` schema.

## Identity contract

WorkOS identity is mapped to an internal profile by the exact tuple:

```text
(provider = workos, JWT iss, JWT sub)
```

The selected organization is mapped from JWT `org_id`; `organization_id` is
accepted as a compatibility claim. RLS uses `request.jwt.claims`, never
`auth.uid()`.

Important rules:

- issuer and subject must both match a stored `external_identities` row;
- the profile must be active;
- the selected WorkOS organization must map to an active internal organization;
- the profile must hold an active internal membership;
- an organization-scoped token cannot query another organization even if an ID
  is guessed;
- suspended and revoked memberships do not authorize access.

The helper functions live in non-exposed `app_private`. Security-definer helpers
use a fixed search path, have no `public`/`anon` execute grant, and expose only
the minimum execute surface to `authenticated` for RLS evaluation.

## Roles and resource access

Organization roles are ordered by product authority, not by PostgreSQL role
inheritance:

- Owner
- Admin
- Builder
- Member
- Viewer

Project access is explicit (`owner`, `editor`, `contributor`, `viewer`) and can
also derive from organization visibility or team membership. Generic resource
grants are restricted to organization, team, and project resources and validate
that resources and principals belong to the same organization.

WorkOS webhooks, outbox delivery, identity synchronization, audit writes,
membership synchronization, and invitation reconciliation are service-side
operations. `webhook_inbox` and `outbox_events` have no authenticated table
grant plus explicit deny policies.

## Storage

Canonical private buckets:

- `knowledge`
- `outputs`

The legacy empty `artifacts` bucket was deleted through the Storage API after
the successful canonical migration. Direct SQL deletion is blocked by Supabase
Storage and must not be bypassed.

Object names use this mandatory prefix:

```text
<organization UUID>/<project UUID>/<relative object path>
```

Malformed UUID segments resolve to no access instead of throwing. Read access
requires active organization context and project access. Knowledge writes
require Owner/Admin/Builder. Output writes require project access. Update and
delete require project management rights.

## Realtime

Exactly seven public tables are in `supabase_realtime`:

- `organization_memberships`
- `teams`
- `team_memberships`
- `projects`
- `project_memberships`
- `invitations`
- `resource_grants`

All seven have RLS. Realtime consumers must still use an authenticated JWT; the
publication is not an authorization boundary.

## Validation

Run from the repository root:

```powershell
.\scripts\database\Test-CanonicalDatabase.ps1
```

The script uses PostgreSQL 17, starts a disposable loopback-only cluster,
bootstraps only the Supabase roles/Storage/Realtime primitives needed for the
test, replays every migration twice, runs the adversarial suite twice, stops the
cluster, and removes the disposable directory.

Coverage includes:

- exact WorkOS issuer/subject/org claim mapping;
- two-organization isolation and guessed IDs;
- Owner/Member/Viewer behavior;
- team and project visibility;
- invitation visibility;
- rejected cross-tenant writes;
- revoked membership behavior;
- wrong issuer behavior;
- Storage read/write policy boundaries;
- Realtime publication allowlist;
- service-only table grants and deny policies;
- webhook, outbox, and bulk-invite idempotency constraints;
- resource-grant organization integrity;
- RLS on every public table;
- absence of public RPC helpers;
- advisor-reported foreign-key indexes.

Last verified result:

```text
PostgreSQL 17.10
2 migration replays
2 adversarial test passes
15 public tables / 15 RLS-enabled
0 public functions
4 Storage policies
7 Realtime tables
```

## Production verification

After apply:

- migration history contains exactly the two canonical migrations;
- all 15 public tables contain 0 rows;
- `auth.users` contains 0 rows;
- `storage.objects` contains 0 rows;
- buckets are exactly `knowledge` and `outputs`;
- security advisors report no findings;
- performance advisors report no missing foreign-key indexes;
- a live PostgREST request to `/rest/v1/profiles` with the publishable/anon key
  returns HTTP 401 with permission denied;
- a live anonymous Storage upload to an unowned organization/project prefix is
  rejected by RLS and leaves `storage.objects` at 0 rows;
- performance advisors report only `unused_index` informational findings,
  expected because the database has no traffic or rows;
- normalized `pg_dump --schema-only` output for `public` + `app_private` matches
  local replay exactly.

Normalized local and remote schema SHA-256:

```text
D5732CE385057DE24978E064F379FE46065604083AED435F224E00BE4741A2E9
```

Normalization removes only `pg_dump`'s random `\\restrict` token and the server
patch-version comment (`17.10` local versus `17.6` managed). No DDL difference
remained.

Generated TypeScript types were regenerated twice from the project and matched:

```text
BA9BE65EDFA4A3BB1E88575C779CE975F59DDBD8EB7F6F06EDC9A14E4E30374E
```

## Mutation record

1. The 19 legacy migration-history rows were marked reverted.
2. The first canonical push attempted direct deletion of an empty Storage bucket.
   Supabase rejected that statement, and the surrounding transaction rolled back
   the entire migration. No partial schema change remained.
3. Direct bucket deletion was removed from SQL; the canonical migration then
   applied successfully.
4. The empty legacy `artifacts` bucket was deleted through the project-scoped
   Storage API without persisting the temporary secret key.
5. Advisor hardening applied the two missing foreign-key indexes and explicit
   service-table deny policies.

No persistent database password was created or rotated. Supabase CLI temporary
login-role credentials were held in process memory only and were not stored in
the repository, Vercel, or application configuration.
