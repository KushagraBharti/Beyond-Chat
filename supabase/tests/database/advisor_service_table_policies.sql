\set ON_ERROR_STOP on

begin;

create schema if not exists test_support;
create or replace function test_support.assert_true(condition boolean, message text)
returns void language plpgsql security invoker set search_path = pg_catalog as $$
begin if condition is distinct from true then raise exception 'assertion failed: %', message; end if; end $$;

select test_support.assert_true(
  (select count(*) = 5
   from pg_policies
   where schemaname = 'public'
     and (tablename, policyname) in (
       ('product_idempotency_keys', 'product_idempotency_keys_client_deny'),
       ('runtime_dispatch_queue', 'runtime_dispatch_queue_client_deny'),
       ('runtime_leases', 'runtime_leases_client_deny'),
       ('runtime_run_attempts', 'runtime_run_attempts_client_deny'),
       ('runtime_usage_reservations', 'runtime_usage_reservations_client_deny')
     )
     and roles @> array['anon', 'authenticated']::name[]
     and cmd = 'ALL'
     and qual = 'false'
     and with_check = 'false'),
  'all five service-only tables carry explicit anon and authenticated deny policies'
);

select test_support.assert_true(
  (select bool_and(c.relrowsecurity)
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in (
       'product_idempotency_keys',
       'runtime_dispatch_queue',
       'runtime_leases',
       'runtime_run_attempts',
       'runtime_usage_reservations'
     )),
  'RLS remains enabled on every service-only table'
);

select test_support.assert_true(
  not has_table_privilege('anon', 'public.product_idempotency_keys', 'select,insert,update,delete')
  and not has_table_privilege('authenticated', 'public.product_idempotency_keys', 'select,insert,update,delete')
  and not has_table_privilege('anon', 'public.runtime_dispatch_queue', 'select,insert,update,delete')
  and not has_table_privilege('authenticated', 'public.runtime_dispatch_queue', 'select,insert,update,delete')
  and not has_table_privilege('anon', 'public.runtime_leases', 'select,insert,update,delete')
  and not has_table_privilege('authenticated', 'public.runtime_leases', 'select,insert,update,delete')
  and not has_table_privilege('anon', 'public.runtime_run_attempts', 'select,insert,update,delete')
  and not has_table_privilege('authenticated', 'public.runtime_run_attempts', 'select,insert,update,delete')
  and not has_table_privilege('anon', 'public.runtime_usage_reservations', 'select,insert,update,delete')
  and not has_table_privilege('authenticated', 'public.runtime_usage_reservations', 'select,insert,update,delete'),
  'client roles retain no direct privileges on service-only tables'
);

select test_support.assert_true(
  has_table_privilege('service_role', 'public.product_idempotency_keys', 'select,insert,update,delete')
  and has_table_privilege('service_role', 'public.runtime_dispatch_queue', 'select,insert,update,delete')
  and has_table_privilege('service_role', 'public.runtime_leases', 'select,insert,update,delete')
  and has_table_privilege('service_role', 'public.runtime_run_attempts', 'select,insert,update,delete')
  and has_table_privilege('service_role', 'public.runtime_usage_reservations', 'select,insert,update,delete'),
  'service role retains its existing table privileges'
);

rollback;
\echo 'advisor_service_table_policies.sql: all assertions passed'
