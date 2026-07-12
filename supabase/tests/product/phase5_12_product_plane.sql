\set ON_ERROR_STOP on

begin;

create schema if not exists test_support;
create or replace function test_support.assert_true(condition boolean, message text)
returns void language plpgsql security invoker set search_path = pg_catalog as $$
begin if condition is distinct from true then raise exception 'assertion failed: %', message; end if; end $$;

insert into public.profiles(id, display_name, primary_email) values
  ('71111111-1111-4111-8111-111111111111', 'Product A', 'product-a@example.com'),
  ('72222222-2222-4222-8222-222222222222', 'Product B', 'product-b@example.com')
on conflict (id) do nothing;
insert into public.external_identities(profile_id, issuer, subject, email, email_verified) values
  ('71111111-1111-4111-8111-111111111111', 'https://auth.workos.test', 'product_a', 'product-a@example.com', true),
  ('72222222-2222-4222-8222-222222222222', 'https://auth.workos.test', 'product_b', 'product-b@example.com', true)
on conflict do nothing;
insert into public.organizations(id, workos_organization_id, name, slug) values
  ('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'org_product_a', 'Product A', 'product-a'),
  ('7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'org_product_b', 'Product B', 'product-b')
on conflict (id) do nothing;
insert into public.organization_memberships(organization_id, profile_id, workos_membership_id, role, state, joined_at) values
  ('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '71111111-1111-4111-8111-111111111111', 'om_product_a', 'owner', 'active', now()),
  ('7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '72222222-2222-4222-8222-222222222222', 'om_product_b', 'owner', 'active', now())
on conflict (organization_id, profile_id) do update set state = 'active', revoked_at = null;
insert into public.projects(id, organization_id, name, slug, visibility, created_by) values
  ('7a1a1a1a-a1a1-41a1-81a1-a1a1a1a1a1a1', '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Product project A', 'product-project-a', 'private', '71111111-1111-4111-8111-111111111111'),
  ('7b1b1b1b-b1b1-41b1-81b1-b1b1b1b1b1b1', '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Product project B', 'product-project-b', 'private', '72222222-2222-4222-8222-222222222222')
on conflict (id) do nothing;
insert into public.project_memberships(project_id, profile_id, role, created_by) values
  ('7a1a1a1a-a1a1-41a1-81a1-a1a1a1a1a1a1', '71111111-1111-4111-8111-111111111111', 'owner', '71111111-1111-4111-8111-111111111111'),
  ('7b1b1b1b-b1b1-41b1-81b1-b1b1b1b1b1b1', '72222222-2222-4222-8222-222222222222', 'owner', '72222222-2222-4222-8222-222222222222')
on conflict (project_id, profile_id) do nothing;

set local role service_role;
select public.product_create_record_once(
  'output', '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '7a1a1a1a-a1a1-41a1-81a1-a1a1a1a1a1a1', null,
  '71111111-1111-4111-8111-111111111111', 'product-output-001', repeat('a', 64),
  'draft', '{"name":"Memo"}'::jsonb, null, null
);
select public.product_create_record_once(
  'output', '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '7a1a1a1a-a1a1-41a1-81a1-a1a1a1a1a1a1', null,
  '71111111-1111-4111-8111-111111111111', 'product-output-001', repeat('a', 64),
  'draft', '{"name":"Memo"}'::jsonb, null, null
);
reset role;

select test_support.assert_true((select count(*) = 1 from public.product_records), 'idempotent create returns one record');
select test_support.assert_true((select count(*) = 1 from public.audit_events where action = 'product.created'), 'create emits audit event');
select test_support.assert_true((select count(*) = 1 from public.outbox_events where event_type = 'product.created'), 'create emits outbox event');
select test_support.assert_true(not has_function_privilege('authenticated', 'public.product_create_record_once(text,uuid,uuid,uuid,uuid,text,text,text,jsonb,text,uuid)', 'execute'), 'create RPC is server-only');
select test_support.assert_true(not has_table_privilege('authenticated', 'public.product_records', 'insert'), 'authenticated cannot write records directly');

set local role authenticated;
select set_config('request.jwt.claims', '{"iss":"https://auth.workos.test","sub":"product_a","org_id":"org_product_a"}', true);
select test_support.assert_true((select count(*) = 1 from public.product_records), 'Org A reads its product record');
select test_support.assert_true((select count(*) = 0 from public.product_records where organization_id = '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 'Org A cannot read Org B product rows');
reset role;

rollback;
\echo 'phase5_12_product_plane.sql: all assertions passed'
