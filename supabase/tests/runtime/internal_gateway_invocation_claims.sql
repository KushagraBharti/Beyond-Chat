\set ON_ERROR_STOP on
begin;

create schema if not exists test_support;
create or replace function test_support.assert_true(condition boolean, message text)
returns void language plpgsql security invoker set search_path=pg_catalog as $$
begin if condition is distinct from true then raise exception 'assertion failed: %',message; end if; end $$;

select test_support.assert_true(to_regclass('public.internal_gateway_invocation_claims') is not null, 'claim table exists');
select test_support.assert_true((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.internal_gateway_invocation_claims'::regclass), 'claim table forces RLS');
select test_support.assert_true(not has_table_privilege('anon','public.internal_gateway_invocation_claims','select'), 'anon cannot read claims');
select test_support.assert_true(not has_table_privilege('authenticated','public.internal_gateway_invocation_claims','select'), 'authenticated cannot read claims');
select test_support.assert_true(not has_function_privilege('anon','public.claim_internal_gateway_invocation(uuid,uuid,text,text,integer,uuid,text,text,text,timestamptz)','execute'), 'anon cannot claim');
select test_support.assert_true(not has_function_privilege('authenticated','public.claim_internal_gateway_invocation(uuid,uuid,text,text,integer,uuid,text,text,text,timestamptz)','execute'), 'authenticated cannot claim');
select test_support.assert_true(has_function_privilege('service_role','public.claim_internal_gateway_invocation(uuid,uuid,text,text,integer,uuid,text,text,text,timestamptz)','execute'), 'service role can claim');
select test_support.assert_true(not has_table_privilege('service_role','public.internal_gateway_invocation_claims','insert'), 'service role cannot bypass claim RPC');
select test_support.assert_true(not has_sequence_privilege('service_role','public.internal_gateway_invocation_claims_id_seq','usage'), 'service role cannot allocate claim ids');

insert into public.organizations(id, workos_organization_id, name, slug)
values ('814a42d5-b760-488b-b01a-635c32ee12c9', 'org_gateway_test', 'Gateway Test', 'gateway-test')
on conflict do nothing;
insert into public.profiles(id, display_name, primary_email)
values ('3d24f8d6-f5f7-48e9-a49b-e9ddff0cab02', 'Gateway Test User', 'gateway-test@example.invalid')
on conflict do nothing;
insert into public.projects(id, organization_id, name, slug, created_by)
values ('c7d23b91-07ac-4bb0-b93b-ec86e0340916', '814a42d5-b760-488b-b01a-635c32ee12c9', 'Gateway Project', 'gateway-project', '3d24f8d6-f5f7-48e9-a49b-e9ddff0cab02')
on conflict do nothing;
insert into public.runtime_runs(id, organization_id, project_id, actor_id, agent_version_id, state, idempotency_key)
values ('gateway-run-test', '814a42d5-b760-488b-b01a-635c32ee12c9', 'c7d23b91-07ac-4bb0-b93b-ec86e0340916', '3d24f8d6-f5f7-48e9-a49b-e9ddff0cab02', 'agent-version-test', 'running', 'gateway-run-idem')
on conflict do nothing;
update public.runtime_runs set state='running', attempt=3, cancel_requested_at=null, terminal_at=null where id='gateway-run-test';
insert into public.runtime_run_attempts(run_id,attempt,worker_id) values ('gateway-run-test',3,'worker-1') on conflict do nothing;
insert into public.runtime_leases(id,run_id,organization_id,worker_id,attempt,expires_at)
values ('df23e58d-3895-4ae7-afd2-a42a8e36968b','gateway-run-test','814a42d5-b760-488b-b01a-635c32ee12c9','worker-1',3,clock_timestamp()+interval '10 minutes')
on conflict do nothing;

select test_support.assert_true(
  (select status='claimed' from public.claim_internal_gateway_invocation('814a42d5-b760-488b-b01a-635c32ee12c9','c7d23b91-07ac-4bb0-b93b-ec86e0340916','gateway-run-test','worker-1',3,'df23e58d-3895-4ae7-afd2-a42a8e36968b','gateway-idem-1','sha256:'||repeat('a',64),'gateway-jti-0001',clock_timestamp()+interval '4 minutes')),
  'first binding is claimed'
);
select test_support.assert_true(
  (select status='token_replayed' from public.claim_internal_gateway_invocation('814a42d5-b760-488b-b01a-635c32ee12c9','c7d23b91-07ac-4bb0-b93b-ec86e0340916','gateway-run-test','worker-1',3,'df23e58d-3895-4ae7-afd2-a42a8e36968b','gateway-idem-1','sha256:'||repeat('a',64),'gateway-jti-0001',clock_timestamp()+interval '4 minutes')),
  'same token deterministically replays'
);
select test_support.assert_true(
  (select status='idempotency_conflict' from public.claim_internal_gateway_invocation('814a42d5-b760-488b-b01a-635c32ee12c9','c7d23b91-07ac-4bb0-b93b-ec86e0340916','gateway-run-test','worker-1',3,'df23e58d-3895-4ae7-afd2-a42a8e36968b','gateway-idem-1','sha256:'||repeat('b',64),'gateway-jti-0002',clock_timestamp()+interval '4 minutes')),
  'claimed run key conflicts for a distinct token'
);
select test_support.assert_true((select count(*)=1 from public.internal_gateway_invocation_claims where run_id='gateway-run-test'), 'conflicts do not partially persist a token');

select test_support.assert_true((select status='binding_stale' from public.claim_internal_gateway_invocation('814a42d5-b760-488b-b01a-635c32ee12c9','11111111-1111-1111-1111-111111111111','gateway-run-test','worker-1',3,'df23e58d-3895-4ae7-afd2-a42a8e36968b','gateway-idem-2','sha256:'||repeat('c',64),'gateway-jti-0003',clock_timestamp()+interval '4 minutes')), 'cross-project binding is stale');
select test_support.assert_true((select status='binding_stale' from public.claim_internal_gateway_invocation('814a42d5-b760-488b-b01a-635c32ee12c9','c7d23b91-07ac-4bb0-b93b-ec86e0340916','gateway-run-test','worker-other',3,'df23e58d-3895-4ae7-afd2-a42a8e36968b','gateway-idem-3','sha256:'||repeat('d',64),'gateway-jti-0004',clock_timestamp()+interval '4 minutes')), 'cross-subject binding is stale');

update public.runtime_runs set state='failed', terminal_at=clock_timestamp() where id='gateway-run-test';
select test_support.assert_true((select status='binding_stale' from public.claim_internal_gateway_invocation('814a42d5-b760-488b-b01a-635c32ee12c9','c7d23b91-07ac-4bb0-b93b-ec86e0340916','gateway-run-test','worker-1',3,'df23e58d-3895-4ae7-afd2-a42a8e36968b','gateway-idem-4','sha256:'||repeat('e',64),'gateway-jti-0005',clock_timestamp()+interval '4 minutes')), 'terminal transition wins race before claim');
update public.runtime_runs set state='running', terminal_at=null where id='gateway-run-test';
update public.runtime_leases set acquired_at=clock_timestamp()-interval '10 minutes', expires_at=clock_timestamp()-interval '1 second' where id='df23e58d-3895-4ae7-afd2-a42a8e36968b';
select test_support.assert_true((select status='binding_stale' from public.claim_internal_gateway_invocation('814a42d5-b760-488b-b01a-635c32ee12c9','c7d23b91-07ac-4bb0-b93b-ec86e0340916','gateway-run-test','worker-1',3,'df23e58d-3895-4ae7-afd2-a42a8e36968b','gateway-idem-5','sha256:'||repeat('f',64),'gateway-jti-0006',clock_timestamp()+interval '4 minutes')), 'lease expiry wins race before claim');
update public.runtime_leases set expires_at=clock_timestamp()+interval '10 minutes', released_at=clock_timestamp() where id='df23e58d-3895-4ae7-afd2-a42a8e36968b';
select test_support.assert_true((select status='binding_stale' from public.claim_internal_gateway_invocation('814a42d5-b760-488b-b01a-635c32ee12c9','c7d23b91-07ac-4bb0-b93b-ec86e0340916','gateway-run-test','worker-1',3,'df23e58d-3895-4ae7-afd2-a42a8e36968b','gateway-idem-6','sha256:'||repeat('0',64),'gateway-jti-0007',clock_timestamp()+interval '4 minutes')), 'released/replaced lease wins race before claim');

select test_support.assert_true(position('for update' in lower(pg_get_functiondef('public.claim_internal_gateway_invocation(uuid,uuid,text,text,integer,uuid,text,text,text,timestamptz)'::regprocedure)))>0, 'claim RPC locks run against concurrent transition');
select test_support.assert_true(position('for share' in lower(pg_get_functiondef('public.claim_internal_gateway_invocation(uuid,uuid,text,text,integer,uuid,text,text,text,timestamptz)'::regprocedure)))>0, 'claim RPC locks lease against replacement');
select test_support.assert_true(position('pg_advisory_xact_lock' in pg_get_functiondef('public.claim_internal_gateway_invocation(uuid,uuid,text,text,integer,uuid,text,text,text,timestamptz)'::regprocedure))>0, 'claim RPC serializes concurrent uniqueness domains');
select test_support.assert_true(position('set search_path to ''pg_catalog'', ''public''' in lower(pg_get_functiondef('public.claim_internal_gateway_invocation(uuid,uuid,text,text,integer,uuid,text,text,text,timestamptz)'::regprocedure)))>0, 'claim RPC has fixed search path');

rollback;
\echo 'internal_gateway_invocation_claims.sql: all assertions passed'
