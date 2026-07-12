# Supabase rollback and recovery

## Stop conditions

Stop all database mutation immediately if any of these are true:

- the linked ref is not `vffndfwdykxqjlnntuuk`;
- the encrypted backup or manifest is missing;
- DPAPI decryption does not reproduce the recorded plaintext SHA-256;
- customer data exists and no reviewed data migration is available;
- WorkOS synchronization is writing during recovery;
- Storage contains objects that are not represented in a separate object backup;
- the operator cannot explain an advisor or schema-diff result.

## Recovery objective

The pre-reset archive is a forensic/rollback snapshot of the empty prototype. It
is not the preferred forward recovery mechanism once real customer data exists.
After launch, use scheduled managed backups plus object backups and forward
migrations.

## Verify the encrypted archive

1. Read the manifest under
   `$HOME/.beyond-chat-backups/supabase/20260711-074743/manifest.json`.
2. Verify the encrypted file SHA-256.
3. DPAPI-decrypt as the same Windows user into a restricted temporary directory.
4. Verify plaintext SHA-256 equals:
   `1A24F111D61A851CC1030F76FE9C2F5F8D3E7F5433896DB31357E336EE8FF62A`.
5. Run `pg_restore --list` before connecting to a database.
6. Remove the plaintext immediately after validation or restore.

Never copy the decrypted archive into the repository, OneDrive project tree, a
chat, CI logs, Vercel, or an application environment variable.

## Disposable restore rehearsal

Restore to PostgreSQL 17 on loopback first. The upstream portable server does
not include Supabase Vault, so filter only the `supabase_vault` extension and
`vault` schema entries. Confirm the legacy inventory in the Phase 2 operations
document. Any other restore error is a failed gate.

## Production rollback

Because the reset began from an empty project, the safest rollback is usually a
forward migration that restores the required compatibility surface. A full
prototype restore is appropriate only before customer data exists.

If a full restore is explicitly approved:

1. disable writes and pause workers/webhooks;
2. verify the exact project ref and take a new backup of current state;
3. restore the pre-reset archive using a Supabase-supported recovery path;
4. restore migration history consistently with the archive;
5. recreate the legacy `artifacts` bucket through the Storage API if required;
6. verify auth, Storage, Realtime, grants, policies, and row counts;
7. rotate any credential exposed during the incident;
8. re-enable traffic gradually and record the incident.

Do not restore only `public` while leaving incompatible Storage policies or
migration history behind.

## Canonical reapply

For an empty replacement project:

1. link the CLI to the exact replacement ref;
2. create an encrypted backup even if the project appears empty;
3. run `.\scripts\database\Test-CanonicalDatabase.ps1`;
4. run `supabase db push --linked --dry-run`;
5. verify only canonical migrations are listed;
6. apply migrations;
7. generate types twice and compare hashes;
8. compare normalized `public` + `app_private` schema dumps;
9. verify Storage buckets/policies and Realtime publication;
10. run security and performance advisors;
11. record the new project identity, backup hashes, mutations, and rollback path.
