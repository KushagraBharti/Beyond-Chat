\set ON_ERROR_STOP on
begin;
create schema if not exists test_support;
create or replace function test_support.assert_true(condition boolean, message text)
returns void language plpgsql security invoker set search_path = pg_catalog as $$
begin if condition is distinct from true then raise exception 'assertion failed: %', message; end if; end $$;

select test_support.assert_true(to_regprocedure('public.runtime_stream_snapshot(uuid,uuid,text)') is not null, 'snapshot RPC exists');
select test_support.assert_true(to_regprocedure('public.runtime_stream_events_after(uuid,uuid,text,bigint,integer)') is not null, 'event RPC exists');
select test_support.assert_true(
  not exists (
    select 1 from pg_proc as proc, lateral aclexplode(coalesce(proc.proacl, acldefault('f', proc.proowner))) as privilege
    where proc.oid = 'public.runtime_stream_snapshot(uuid,uuid,text)'::regprocedure
      and privilege.grantee = 0 and privilege.privilege_type = 'EXECUTE'
  )
  and not has_function_privilege('anon', 'public.runtime_stream_snapshot(uuid,uuid,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.runtime_stream_snapshot(uuid,uuid,text)', 'execute')
  and has_function_privilege('service_role', 'public.runtime_stream_snapshot(uuid,uuid,text)', 'execute'),
  'snapshot RPC is service-role only');
select test_support.assert_true(
  not exists (
    select 1 from pg_proc as proc, lateral aclexplode(coalesce(proc.proacl, acldefault('f', proc.proowner))) as privilege
    where proc.oid = 'public.runtime_stream_events_after(uuid,uuid,text,bigint,integer)'::regprocedure
      and privilege.grantee = 0 and privilege.privilege_type = 'EXECUTE'
  )
  and not has_function_privilege('anon', 'public.runtime_stream_events_after(uuid,uuid,text,bigint,integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.runtime_stream_events_after(uuid,uuid,text,bigint,integer)', 'execute')
  and has_function_privilege('service_role', 'public.runtime_stream_events_after(uuid,uuid,text,bigint,integer)', 'execute'),
  'event RPC is service-role only');
select test_support.assert_true(
  (select prosecdef is false and provolatile = 's' from pg_proc where oid = 'public.runtime_stream_snapshot(uuid,uuid,text)'::regprocedure),
  'snapshot RPC is stable security invoker');
select test_support.assert_true(
  (select prosecdef is false and provolatile = 's' from pg_proc where oid = 'public.runtime_stream_events_after(uuid,uuid,text,bigint,integer)'::regprocedure),
  'event RPC is stable security invoker');
select test_support.assert_true(
  (select relrowsecurity from pg_class where oid = 'public.runtime_runs'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.runtime_events'::regclass),
  'runtime table RLS remains enabled');
select test_support.assert_true(to_regclass('public.runtime_events_org_project_run_sequence_idx') is not null, 'complete stream cursor index exists');

set local role service_role;
select test_support.assert_true((select count(*) = 0 from public.runtime_stream_snapshot(
  '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'missing-run')),
  'missing snapshot has the same empty shape');
select test_support.assert_true((select count(*) = 0 from public.runtime_stream_events_after(
  '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'missing-run', 0, 1000)),
  'missing event scope has the same empty shape');
do $$ begin
  perform * from public.runtime_stream_events_after(
    '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'missing-run', -1, 1);
  raise exception 'negative cursor was accepted';
exception when sqlstate '22023' then null; end $$;
do $$ begin
  perform * from public.runtime_stream_events_after(
    '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'missing-run', 0, 1001);
  raise exception 'oversized limit was accepted';
exception when sqlstate '22023' then null; end $$;
reset role;
rollback;
\echo 'runtime_stream_read_model.sql: all assertions passed'
