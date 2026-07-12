\set ON_ERROR_STOP on

begin;

create schema if not exists test_support;
create or replace function test_support.assert_true(condition boolean, message text)
returns void language plpgsql security invoker set search_path = pg_catalog as $$
begin if condition is distinct from true then raise exception 'assertion failed: %', message; end if; end $$;

insert into public.profiles(id, display_name, primary_email) values
  ('61111111-1111-4111-8111-111111111111', 'Runtime A', 'runtime-a@example.com'),
  ('62222222-2222-4222-8222-222222222222', 'Runtime B', 'runtime-b@example.com')
on conflict (id) do nothing;
insert into public.external_identities(profile_id, issuer, subject, email, email_verified) values
  ('61111111-1111-4111-8111-111111111111', 'https://auth.workos.test', 'runtime_a', 'runtime-a@example.com', true),
  ('62222222-2222-4222-8222-222222222222', 'https://auth.workos.test', 'runtime_b', 'runtime-b@example.com', true)
on conflict do nothing;
insert into public.organizations(id, workos_organization_id, name, slug) values
  ('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'org_runtime_a', 'Runtime A', 'runtime-a'),
  ('6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'org_runtime_b', 'Runtime B', 'runtime-b')
on conflict (id) do nothing;
insert into public.organization_memberships(organization_id, profile_id, workos_membership_id, role, state, joined_at) values
  ('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '61111111-1111-4111-8111-111111111111', 'om_runtime_a', 'owner', 'active', now()),
  ('6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '62222222-2222-4222-8222-222222222222', 'om_runtime_b', 'owner', 'active', now())
on conflict (organization_id, profile_id) do update set state = 'active', revoked_at = null;
insert into public.projects(id, organization_id, name, slug, visibility, created_by) values
  ('6a1a1a1a-a1a1-41a1-81a1-a1a1a1a1a1a1', '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Runtime project A', 'runtime-project-a', 'private', '61111111-1111-4111-8111-111111111111'),
  ('6b1b1b1b-b1b1-41b1-81b1-b1b1b1b1b1b1', '6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Runtime project B', 'runtime-project-b', 'private', '62222222-2222-4222-8222-222222222222')
on conflict (id) do nothing;
insert into public.project_memberships(project_id, profile_id, role, created_by) values
  ('6a1a1a1a-a1a1-41a1-81a1-a1a1a1a1a1a1', '61111111-1111-4111-8111-111111111111', 'owner', '61111111-1111-4111-8111-111111111111'),
  ('6b1b1b1b-b1b1-41b1-81b1-b1b1b1b1b1b1', '62222222-2222-4222-8222-222222222222', 'owner', '62222222-2222-4222-8222-222222222222')
on conflict (project_id, profile_id) do nothing;

set local role service_role;
select public.admit_runtime_run('run-runtime-a', '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '6a1a1a1a-a1a1-41a1-81a1-a1a1a1a1a1a1', '61111111-1111-4111-8111-111111111111',
  'general-v1', 'runtime-idem-001', 'corr-runtime-a');
select public.admit_runtime_run('run-runtime-a-duplicate', '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '6a1a1a1a-a1a1-41a1-81a1-a1a1a1a1a1a1', '61111111-1111-4111-8111-111111111111',
  'general-v1', 'runtime-idem-001', 'corr-runtime-a');
reset role;

select test_support.assert_true((select count(*) = 1 from public.runtime_runs where organization_id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'duplicate admission creates one run');
select test_support.assert_true(not has_function_privilege('authenticated', 'public.claim_runtime_run(text,timestamptz,integer)', 'execute'), 'worker claim is not client callable');
select test_support.assert_true(not has_table_privilege('authenticated', 'public.runtime_leases', 'select'), 'leases are service-only');
select test_support.assert_true(position('skip locked' in lower(pg_get_functiondef('public.claim_runtime_run(text,timestamptz,integer)'::regprocedure))) > 0, 'claim uses SKIP LOCKED');

set local role authenticated;
select set_config('request.jwt.claims', '{"iss":"https://auth.workos.test","sub":"runtime_a","org_id":"org_runtime_a"}', true);
select test_support.assert_true((select count(*) = 1 from public.runtime_runs), 'Org A sees its runtime run');
select test_support.assert_true((select count(*) = 0 from public.runtime_runs where organization_id = '6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 'Org A cannot guess Org B runtime rows');
reset role;

rollback;
\echo 'phase4c_runtime_control_plane.sql: all assertions passed'
