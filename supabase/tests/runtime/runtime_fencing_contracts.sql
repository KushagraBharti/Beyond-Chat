\set ON_ERROR_STOP on
begin;
create schema if not exists test_support;
create or replace function test_support.assert_true(condition boolean, message text)
returns void language plpgsql security invoker set search_path=pg_catalog as $$
begin if condition is distinct from true then raise exception 'assertion failed: %',message; end if; end $$;

select test_support.assert_true(to_regclass('public.runtime_checkpoints') is not null, 'checkpoint table exists');
select test_support.assert_true(to_regclass('public.runtime_budget_accounts') is not null, 'budget account table exists');
select test_support.assert_true(to_regclass('public.runtime_budget_windows') is not null, 'budget window table exists');
select test_support.assert_true(not has_table_privilege('authenticated','public.runtime_checkpoints','select'), 'checkpoints are service-only');
select test_support.assert_true(not has_table_privilege('authenticated','public.runtime_budget_windows','select'), 'budget windows are service-only');
select test_support.assert_true(not has_function_privilege('authenticated','public.append_runtime_event_fenced(text,integer,uuid,text,text,text,jsonb,timestamptz)','execute'), 'fenced event RPC is service-only');
select test_support.assert_true(position('next_event_sequence' in pg_get_functiondef('public.append_runtime_event_fenced(text,integer,uuid,text,text,text,jsonb,timestamptz)'::regprocedure))>0, 'events allocate sequence in database');
select test_support.assert_true(position('p_lease_id' in pg_get_functiondef('public.complete_runtime_success(text,integer,uuid,text,jsonb,jsonb,text)'::regprocedure))>0, 'completion is lease fenced');
select test_support.assert_true(position('runtime_budget_windows' in pg_get_functiondef('public.reserve_runtime_usage_window(text,text,integer,text,text,numeric,timestamptz,text)'::regprocedure))>0, 'reservation uses explicit budget window');
select test_support.assert_true(position('for update' in lower(pg_get_functiondef('public.append_runtime_event_fenced(text,integer,uuid,text,text,text,jsonb,timestamptz)'::regprocedure)))>0, 'concurrent event allocation locks the run');
select test_support.assert_true(position('runtime_event_idempotency' in pg_get_functiondef('public.append_runtime_event_fenced(text,integer,uuid,text,text,text,jsonb,timestamptz)'::regprocedure))>0, 'duplicate events use durable idempotency');
select test_support.assert_true(position('expires_at > clock_timestamp()' in pg_get_functiondef('public.release_runtime_lease(text,integer,uuid,text,text)'::regprocedure))>0, 'expired lease release is rejected');
select test_support.assert_true(position('expires_at>clock_timestamp()' in replace(pg_get_functiondef('public.suspend_runtime_for_approval(text,text,text,integer,uuid,text,text,jsonb,timestamptz,jsonb,jsonb,text,text,bigint)'::regprocedure),' ',''))>0, 'approval suspension rejects stale lease');
select test_support.assert_true(position('runtime output idempotency conflict' in pg_get_functiondef('public.complete_runtime_success(text,integer,uuid,text,jsonb,jsonb,text)'::regprocedure))>0, 'output collision fails closed');
do $$ declare signature text; begin
  foreach signature in array array[
    'public.heartbeat_runtime_lease(text,integer,uuid,text,timestamptz)',
    'public.release_runtime_lease(text,integer,uuid,text,text)',
    'public.append_runtime_event_fenced(text,integer,uuid,text,text,text,jsonb,timestamptz)',
    'public.write_runtime_checkpoint(text,text,integer,uuid,text,jsonb,jsonb,text,text,bigint)',
    'public.suspend_runtime_for_approval(text,text,text,integer,uuid,text,text,jsonb,timestamptz,jsonb,jsonb,text,text,bigint)',
    'public.complete_runtime_success(text,integer,uuid,text,jsonb,jsonb,text)',
    'public.reserve_runtime_usage_window(text,text,integer,text,text,numeric,timestamptz,text)'
  ] loop
    if has_function_privilege('authenticated',signature,'execute') or has_function_privilege('anon',signature,'execute') then
      raise exception 'client can execute %',signature;
    end if;
  end loop;
end $$;
rollback;
\echo 'runtime_fencing_contracts.sql: all assertions passed'
