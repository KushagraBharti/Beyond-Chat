\set ON_ERROR_STOP on

begin;

create schema if not exists test_support;

create or replace function test_support.assert_true(condition boolean, message text)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if condition is distinct from true then
    raise exception 'assertion failed: %', message;
  end if;
end
$$;

create or replace function test_support.assert_sqlstate(statement text, expected_state text, message text)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  failed boolean := false;
  actual_state text;
begin
  begin
    execute statement;
  exception when others then
    failed := true;
    actual_state := sqlstate;
  end;

  if not failed then
    raise exception 'assertion failed: % (statement unexpectedly succeeded)', message;
  end if;

  if actual_state <> expected_state then
    raise exception 'assertion failed: % (expected SQLSTATE %, got %)', message, expected_state, actual_state;
  end if;
end
$$;

grant usage on schema test_support to authenticated;
grant execute on all functions in schema test_support to authenticated;

insert into public.profiles (id, display_name, primary_email)
values
  ('11111111-1111-4111-8111-111111111111', 'Org A Owner', 'owner-a@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'Org A Member', 'member-a@example.com'),
  ('33333333-3333-4333-8333-333333333333', 'Org B Owner', 'owner-b@example.com'),
  ('44444444-4444-4444-8444-444444444444', 'Revoked User', 'revoked@example.com'),
  ('55555555-5555-4555-8555-555555555555', 'Org A Viewer', 'viewer-a@example.com');

insert into public.external_identities (profile_id, issuer, subject, email, email_verified)
values
  ('11111111-1111-4111-8111-111111111111', 'https://auth.workos.test', 'user_a_owner', 'owner-a@example.com', true),
  ('22222222-2222-4222-8222-222222222222', 'https://auth.workos.test', 'user_a_member', 'member-a@example.com', true),
  ('33333333-3333-4333-8333-333333333333', 'https://auth.workos.test', 'user_b_owner', 'owner-b@example.com', true),
  ('44444444-4444-4444-8444-444444444444', 'https://auth.workos.test', 'user_revoked', 'revoked@example.com', true),
  ('55555555-5555-4555-8555-555555555555', 'https://auth.workos.test', 'user_a_viewer', 'viewer-a@example.com', true);

insert into public.organizations (id, workos_organization_id, name, slug)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'org_workos_a', 'Organization A', 'organization-a'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'org_workos_b', 'Organization B', 'organization-b');

insert into public.organization_memberships (
  organization_id, profile_id, workos_membership_id, role, state, joined_at, revoked_at
)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'om_a_owner', 'owner', 'active', now(), null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'om_a_member', 'member', 'active', now(), null),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '33333333-3333-4333-8333-333333333333', 'om_b_owner', 'owner', 'active', now(), null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '44444444-4444-4444-8444-444444444444', 'om_a_revoked', 'member', 'revoked', now() - interval '1 day', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '55555555-5555-4555-8555-555555555555', 'om_a_viewer', 'viewer', 'active', now(), null);

insert into public.teams (id, organization_id, name, slug, created_by)
values
  ('a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Team A', 'team-a', '11111111-1111-4111-8111-111111111111'),
  ('b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Team B', 'team-b', '33333333-3333-4333-8333-333333333333');

insert into public.team_memberships (team_id, profile_id)
values
  ('a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0', '22222222-2222-4222-8222-222222222222'),
  ('b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0', '33333333-3333-4333-8333-333333333333');

insert into public.projects (id, organization_id, team_id, name, slug, visibility, created_by)
values
  ('a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', null, 'Private Project A', 'private-project-a', 'private', '11111111-1111-4111-8111-111111111111'),
  ('a2a2a2a2-a2a2-42a2-82a2-a2a2a2a2a2a2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', null, 'Organization Project A', 'organization-project-a', 'organization', '11111111-1111-4111-8111-111111111111'),
  ('a3a3a3a3-a3a3-43a3-83a3-a3a3a3a3a3a3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0', 'Team Project A', 'team-project-a', 'team', '11111111-1111-4111-8111-111111111111'),
  ('b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null, 'Private Project B', 'private-project-b', 'private', '33333333-3333-4333-8333-333333333333');

insert into public.project_memberships (project_id, profile_id, role, created_by)
values
  ('a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', '11111111-1111-4111-8111-111111111111', 'owner', '11111111-1111-4111-8111-111111111111'),
  ('a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', '22222222-2222-4222-8222-222222222222', 'viewer', '11111111-1111-4111-8111-111111111111'),
  ('b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1', '33333333-3333-4333-8333-333333333333', 'owner', '33333333-3333-4333-8333-333333333333');

insert into public.invitations (id, organization_id, email, role, invited_by, expires_at)
values
  ('a4a4a4a4-a4a4-44a4-84a4-a4a4a4a4a4a4', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'invite-a@example.com', 'member', '11111111-1111-4111-8111-111111111111', now() + interval '7 days'),
  ('b4b4b4b4-b4b4-44b4-84b4-b4b4b4b4b4b4', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'invite-b@example.com', 'member', '33333333-3333-4333-8333-333333333333', now() + interval '7 days');

insert into storage.objects (id, bucket_id, name)
values
  ('a5a5a5a5-a5a5-45a5-85a5-a5a5a5a5a5a5', 'outputs', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1/report.md'),
  ('a6a6a6a6-a6a6-46a6-86a6-a6a6a6a6a6a6', 'knowledge', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/a2a2a2a2-a2a2-42a2-82a2-a2a2a2a2a2a2/source.pdf'),
  ('b5b5b5b5-b5b5-45b5-85b5-b5b5b5b5b5b5', 'outputs', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1/report.md');

select test_support.assert_true(
  (select count(*) = 15
   from information_schema.tables
   where table_schema = 'public' and table_type = 'BASE TABLE'
     and table_name = any(array[
       'profiles', 'external_identities', 'organizations', 'organization_memberships',
       'teams', 'team_memberships', 'projects', 'project_memberships', 'invitations',
       'bulk_invite_batches', 'bulk_invite_entries', 'resource_grants', 'webhook_inbox',
       'outbox_events', 'audit_events'
     ])),
  'canonical baseline retains all 15 identity tables'
);

select test_support.assert_true(
  (select bool_and(c.relrowsecurity)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'),
  'every public table has RLS enabled'
);

select test_support.assert_true(
  (select count(*) = 0
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname <> all(array[
       'admit_runtime_run', 'claim_runtime_run', 'notify_runtime_run', 'append_runtime_event',
       'transition_runtime_run',
       'commit_runtime_output', 'finalize_runtime_cost', 'reconcile_expired_runtime_leases',
       'request_runtime_cancel', 'resolve_runtime_approval', 'recheck_runtime_gateway_policy'
       , 'request_runtime_approval'
     ])),
  'only the explicit runtime service RPC allowlist is exposed in public'
);

select test_support.assert_true(
  (select bool_and(
      not exists (
        select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
        where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      )
      and not has_function_privilege('anon', p.oid, 'execute')
      and not has_function_privilege('authenticated', p.oid, 'execute')
      and has_function_privilege('service_role', p.oid, 'execute')
    )
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'),
  'every public runtime RPC is service-role only'
);

select test_support.assert_true(
  not has_table_privilege('anon', 'public.profiles', 'select'),
  'anon has no profile table access'
);

select test_support.assert_true(
  not has_table_privilege('authenticated', 'public.webhook_inbox', 'select')
  and not has_table_privilege('authenticated', 'public.outbox_events', 'select'),
  'webhook inbox and outbox remain service-only'
);

select test_support.assert_true(
  (select count(*) = 2
   from pg_policies
   where schemaname = 'public'
     and tablename in ('webhook_inbox', 'outbox_events')
     and policyname in ('webhook_inbox_authenticated_deny', 'outbox_events_authenticated_deny')),
  'service-only tables carry explicit authenticated deny policies'
);

select test_support.assert_true(
  to_regclass('public.projects_organization_team_idx') is not null
  and to_regclass('public.outbox_events_organization_id_idx') is not null,
  'all advisor-reported foreign keys have covering indexes'
);

select test_support.assert_true(
  position(
    'rtrim(app_private.jwt_claims() ->> ''iss'', ''/'')'
    in pg_get_functiondef('app_private.jwt_issuer()'::regprocedure)
  ) > 0,
  'JWT issuer helper normalizes trailing slashes'
);

select test_support.assert_true(
  position(
    'app_private.jwt_organization_external_id() is not null'
    in pg_get_functiondef('app_private.is_organization_context(uuid)'::regprocedure)
  ) > 0,
  'organization context fails closed when the organization claim is missing'
);

select test_support.assert_true(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'projects_insert'
      and cmd = 'INSERT'
      and roles = array['authenticated']::name[]
      and with_check like '%''member''::organization_role%'
  ),
  'project insert policy includes the Member role'
);

select test_support.assert_true(
  (select count(*) = 7 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'),
  'only the intended seven collaboration tables are in realtime'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"iss":"https://auth.workos.test/","sub":"user_a_owner","org_id":"org_workos_a"}',
  true
);

select test_support.assert_true(
  app_private.current_profile_id() = '11111111-1111-4111-8111-111111111111',
  'trailing-slash WorkOS issuer/subject maps to the normalized stored issuer'
);
select test_support.assert_true(app_private.current_organization_id() = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'WorkOS org claim maps to internal organization');
select test_support.assert_true((select count(*) = 1 from public.organizations), 'Org A token sees only Org A');
select test_support.assert_true((select count(*) = 3 from public.projects), 'Org A owner sees all Org A projects');
select test_support.assert_true((select count(*) = 0 from public.projects where id = 'b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1'), 'guessed Org B project id returns no row');
select test_support.assert_true((select count(*) = 1 from public.invitations), 'Org A owner sees only Org A invitation');
select test_support.assert_true((select count(*) = 2 from storage.objects), 'Org A owner sees only Org A storage objects');

select test_support.assert_sqlstate(
  $$insert into public.projects (organization_id, name, slug, visibility, created_by)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Cross tenant', 'cross-tenant', 'organization', '11111111-1111-4111-8111-111111111111')$$,
  '42501',
  'Org A owner cannot write an Org B project'
);

select set_config(
  'request.jwt.claims',
  '{"iss":"https://auth.workos.test/","sub":"user_a_member","org_id":"org_workos_a"}',
  true
);

select test_support.assert_true((select count(*) = 3 from public.projects), 'Org A member sees explicit, organization, and team projects');
select test_support.assert_true((select count(*) = 0 from public.invitations), 'member cannot read invitations');
select test_support.assert_true((select count(*) = 2 from storage.objects), 'member storage access follows project access');
insert into public.projects (organization_id, name, slug, visibility, created_by)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Member Project A', 'member-project-a', 'private',
  '22222222-2222-4222-8222-222222222222'
);
select test_support.assert_sqlstate(
  $$insert into public.projects (organization_id, name, slug, visibility, created_by)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Member Cross Tenant', 'member-cross-tenant', 'private', '22222222-2222-4222-8222-222222222222')$$,
  '42501',
  'member cannot create a project in another organization'
);

select set_config(
  'request.jwt.claims',
  '{"iss":"https://auth.workos.test/","sub":"user_a_viewer","org_id":"org_workos_a"}',
  true
);

select test_support.assert_true((select count(*) = 1 from public.projects), 'viewer sees only organization-visible project');
select test_support.assert_sqlstate(
  $$insert into public.teams (organization_id, name, slug, created_by)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Unauthorized Team', 'unauthorized-team', '55555555-5555-4555-8555-555555555555')$$,
  '42501',
  'viewer cannot create a team'
);

select set_config(
  'request.jwt.claims',
  '{"iss":"https://auth.workos.test/","sub":"user_b_owner","org_id":"org_workos_b"}',
  true
);

select test_support.assert_true((select count(*) = 1 from public.organizations), 'Org B token sees only Org B');
select test_support.assert_true((select count(*) = 1 from public.projects), 'Org B owner sees only Org B project');
select test_support.assert_true((select count(*) = 0 from public.profiles where id = '11111111-1111-4111-8111-111111111111'), 'Org B token cannot read Org A profile by guessed id');
select test_support.assert_true((select count(*) = 1 from storage.objects), 'Org B token sees only Org B storage object');

select set_config(
  'request.jwt.claims',
  '{"iss":"https://auth.workos.test/","sub":"user_revoked","org_id":"org_workos_a"}',
  true
);

select test_support.assert_true((select count(*) = 0 from public.organizations), 'revoked membership removes organization access');
select test_support.assert_true((select count(*) = 0 from public.projects), 'revoked membership removes project access');
select test_support.assert_true((select count(*) = 0 from storage.objects), 'revoked membership removes storage access');

select set_config(
  'request.jwt.claims',
  '{"iss":"https://wrong-issuer.test/","sub":"user_a_owner","org_id":"org_workos_a"}',
  true
);

select test_support.assert_true(app_private.current_profile_id() is null, 'wrong issuer does not map to a profile');
select test_support.assert_true((select count(*) = 0 from public.organizations), 'wrong issuer has no tenant access');

select set_config(
  'request.jwt.claims',
  '{"iss":"https://auth.workos.test/","sub":"user_a_owner"}',
  true
);

select test_support.assert_true(app_private.current_organization_id() is null, 'missing organization claim has no active organization');
select test_support.assert_true((select count(*) = 0 from public.organizations), 'missing organization claim cannot fan out across memberships');
select test_support.assert_true((select count(*) = 0 from public.projects), 'missing organization claim cannot access projects');
select test_support.assert_true((select count(*) = 0 from storage.objects), 'missing organization claim cannot access storage');

reset role;

insert into public.webhook_inbox (provider, event_id, event_type, payload)
values ('workos', 'evt_idempotency_1', 'organization.updated', '{"ok":true}'::jsonb);

select test_support.assert_sqlstate(
  $$insert into public.webhook_inbox (provider, event_id, event_type, payload)
    values ('workos', 'evt_idempotency_1', 'organization.updated', '{"ok":true}'::jsonb)$$,
  '23505',
  'duplicate WorkOS event is rejected idempotently'
);

insert into public.outbox_events (
  organization_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'organization', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'organization.updated', '{"ok":true}'::jsonb, 'outbox-idempotency-1'
);

select test_support.assert_sqlstate(
  $$insert into public.outbox_events (
      organization_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'organization', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'organization.updated', '{"ok":true}'::jsonb, 'outbox-idempotency-1'
    )$$,
  '23505',
  'duplicate outbox idempotency key is rejected'
);

insert into public.bulk_invite_batches (
  organization_id, requested_by, idempotency_key, total_count
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
  'bulk-idempotency-1', 1
);

select test_support.assert_sqlstate(
  $$insert into public.bulk_invite_batches (
      organization_id, requested_by, idempotency_key, total_count
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
      'bulk-idempotency-1', 1
    )$$,
  '23505',
  'duplicate bulk-invite idempotency key is rejected'
);

select test_support.assert_sqlstate(
  $$insert into public.resource_grants (
      organization_id, resource_type, resource_id, principal_type, principal_id, permission, created_by
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'project', 'b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1',
      'profile', '11111111-1111-4111-8111-111111111111', 'view', '11111111-1111-4111-8111-111111111111'
    )$$,
  '23514',
  'resource grant cannot point across organizations'
);

rollback;

\echo 'phase2_security.sql: all assertions passed'
