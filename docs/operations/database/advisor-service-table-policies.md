# Service-table advisor cleanup

Migration `20260712000208_deny_client_access_service_tables.sql` addresses the
four `rls_enabled_no_policy` INFO notices reported after the product-plane
migration. It adds explicit deny policies for `anon` and `authenticated` on:

- `product_idempotency_keys`
- `runtime_dispatch_queue`
- `runtime_leases`
- `runtime_run_attempts`

The migration does not add or change grants. The tables remain service-only:
client roles have no table privileges, each policy evaluates to `false` for
both existing rows and proposed writes, and `service_role` retains its existing
privileges and RLS-bypass behavior.

## Review and apply

The manager must verify the linked project ref is `vffndfwdykxqjlnntuuk`,
review the migration, apply it through the normal migration workflow, run
`supabase/tests/database/advisor_service_table_policies.sql`, and rerun the
security advisor. This change was prepared locally and was not applied remotely.

## Rollback

Rollback is metadata-only and does not affect table data or grants:

```sql
begin;
drop policy if exists product_idempotency_keys_client_deny on public.product_idempotency_keys;
drop policy if exists runtime_dispatch_queue_client_deny on public.runtime_dispatch_queue;
drop policy if exists runtime_leases_client_deny on public.runtime_leases;
drop policy if exists runtime_run_attempts_client_deny on public.runtime_run_attempts;
commit;
```

After rollback, the four tables remain RLS-enabled and unavailable to client
roles, but the advisor will again report `rls_enabled_no_policy` INFO notices.
