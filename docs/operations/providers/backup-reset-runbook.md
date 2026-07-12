# Supabase Backup, Clean Reset, Restore, and Provider Rollback Runbook

This runbook prepares the intentional destructive reset of the empty transitional Supabase schema. It is not authorization to execute the reset. The reset owner must re-prove that there is no customer data immediately before execution.

## Preconditions

1. Record project ref `vffndfwdykxqjlnntuuk`, organization `nwvyypcrdwhzwpurtonm`, operator, timestamp, and maintenance window.
2. Verify both CLI and MCP target the same ref.
3. Prove zero customer data with table counts, Auth user count, Storage object count, and Realtime/Edge Function inventory. A plan statement is not evidence.
4. Freeze writes and provider webhooks.
5. Confirm the canonical replacement migration passes local replay and tenant/security tests.
6. Create an encrypted backup outside the Git repository and complete a restore rehearsal into a disposable local database or Supabase branch.

## Backup

Use current CLI help before execution. A typical capture includes:

```powershell
supabase db dump --linked --schema public --file <encrypted-staging-path>\schema.sql
supabase db dump --linked --data-only --schema public --file <encrypted-staging-path>\data.sql
supabase migration list --linked
supabase functions list
```

Also export, without committing:

- Auth user/identity count and configuration metadata;
- Storage bucket/object manifest and policy metadata;
- enabled extensions, database roles/grants, cron/queue jobs, vault references, and Edge Function names;
- security and performance advisor results;
- migration history from the remote database;
- checksums for every backup component.

Encrypt with an approved secret manager or Windows DPAPI for a single-machine development backup. Delete plaintext only after an encrypt/decrypt checksum round trip. Store the manifest separately from credential values.

## Reset execution gate

The reset owner must stop if any user data, non-reproducible object, unexplained policy, or mismatched project ref is found. If the gate passes:

1. disable app writes and webhooks;
2. take the final backup and checksums;
3. remove the legacy schema/migration history using the approved canonical reset procedure;
4. apply the single canonical baseline migration;
5. regenerate types;
6. run tenant, RLS, Storage, Realtime, privileged-function, and advisor tests;
7. deploy compatible application versions behind a rollback flag;
8. reopen writes only after remote/local drift is zero.

Do not preserve the current `SECURITY DEFINER` helpers merely to make the reset look incremental.

## Restore and rollback

Rollback requires evidence, not hope:

- restore schema/data into a clean target;
- compare checksums, row counts, buckets, object counts, grants, and migration history;
- verify the legacy app health and one read/write fixture;
- restore provider webhook state and application traffic only after validation;
- record recovery time and any un-restorable surface.

If the canonical migration fails before customer data exists, prefer fixing and replaying the canonical baseline rather than layering repair migrations onto a broken root.

## Vercel/provider rollback

- Vercel code: `vercel rollback` or promote the recorded prior production deployment.
- Vercel env: replace the named variable from its authoritative provider store. Sensitive values cannot be recovered from `env pull`.
- Local ignored env: decrypt the timestamped DPAPI backup under `$HOME/.beyond-chat-backups/local-env` as the same Windows user.
- OpenRouter/Composio: create and verify a replacement key, update the backend, redeploy, then revoke the failed key.
- Runner shared secret: set one fresh value in both backend and runner before redeploying either side; never roll only one side.
- Stripe/WorkOS: never “roll back” by using a credential from a different account/environment.

