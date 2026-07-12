-- Phase 5-12 aggregate product plane. Additive after Phase 4C runtime control plane.
-- Twenty-six logical kinds share one canonical record table; existing identity,
-- audit, outbox, and runtime authorities remain unchanged.

begin;

create table public.product_records (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid,
  team_id uuid,
  parent_kind text,
  parent_id uuid references public.product_records(id) on delete restrict,
  state text not null,
  version bigint not null default 1,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_records_kind_check check (kind in (
    'skill', 'tool', 'app', 'mcp_server', 'connection', 'capability_approval',
    'knowledge_connection', 'source', 'sync', 'retrieval', 'citation', 'memory',
    'memory_proposal', 'agent', 'agent_draft', 'agent_version', 'agent_deployment',
    'output', 'output_version', 'comment', 'review', 'review_decision', 'realtime_hint',
    'automation', 'automation_version', 'automation_execution'
  )),
  constraint product_records_state_nonempty check (char_length(btrim(state)) between 1 and 64),
  constraint product_records_version_positive check (version > 0),
  constraint product_records_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint product_records_payload_no_top_level_secrets check (
    not (payload ?| array['secret', 'token', 'api_key', 'access_token', 'refresh_token', 'password'])
  ),
  constraint product_records_parent_pair check ((parent_kind is null) = (parent_id is null)),
  constraint product_records_parent_kind_check check (parent_kind is null or parent_kind in (
    'skill', 'tool', 'app', 'mcp_server', 'connection', 'capability_approval',
    'knowledge_connection', 'source', 'sync', 'retrieval', 'citation', 'memory',
    'memory_proposal', 'agent', 'agent_draft', 'agent_version', 'agent_deployment',
    'output', 'output_version', 'comment', 'review', 'review_decision', 'realtime_hint',
    'automation', 'automation_version', 'automation_execution'
  )),
  constraint product_records_project_same_organization foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint product_records_team_same_organization foreign key (organization_id, team_id)
    references public.teams(organization_id, id) on delete cascade
);

create index product_records_scope_time_idx
  on public.product_records (organization_id, kind, project_id, team_id, updated_at desc);
create index product_records_org_state_time_idx
  on public.product_records (organization_id, kind, state, updated_at desc);
create index product_records_project_idx on public.product_records (project_id) where project_id is not null;
create index product_records_team_idx on public.product_records (team_id) where team_id is not null;
create index product_records_parent_idx on public.product_records (parent_id) where parent_id is not null;
create index product_records_created_by_idx on public.product_records (created_by);
create index product_records_updated_by_idx on public.product_records (updated_by);

create table public.product_idempotency_keys (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null,
  idempotency_key text not null,
  request_digest text not null,
  record_id uuid not null,
  response_digest text,
  created_at timestamptz not null default now(),
  primary key (organization_id, kind, idempotency_key),
  constraint product_idempotency_record_fk foreign key (record_id)
    references public.product_records(id) on delete cascade deferrable initially deferred,
  constraint product_idempotency_key_length check (char_length(idempotency_key) between 8 and 255),
  constraint product_idempotency_digest_hex check (request_digest ~ '^[0-9a-f]{64}$'),
  constraint product_idempotency_response_digest_hex check (
    response_digest is null or response_digest ~ '^[0-9a-f]{64}$'
  )
);
create index product_idempotency_created_at_idx on public.product_idempotency_keys (created_at);
create index product_idempotency_record_idx on public.product_idempotency_keys (record_id);

create or replace function app_private.can_access_product_team(
  target_organization_id uuid,
  target_team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select target_team_id is null or exists (
    select 1
    from public.teams as team
    where team.id = target_team_id
      and team.organization_id = target_organization_id
      and team.state = 'active'
      and (
        app_private.has_organization_role(
          target_organization_id,
          array['owner', 'admin', 'builder']::public.organization_role[]
        )
        or exists (
          select 1 from public.team_memberships as membership
          where membership.team_id = team.id
            and membership.profile_id = app_private.current_profile_id()
        )
        or exists (
          select 1 from public.resource_grants as grant_row
          where grant_row.organization_id = target_organization_id
            and grant_row.resource_type = 'team'
            and grant_row.resource_id = team.id
            and grant_row.principal_type = 'profile'
            and grant_row.principal_id = app_private.current_profile_id()
            and grant_row.permission in ('view', 'use', 'edit', 'manage')
            and (grant_row.expires_at is null or grant_row.expires_at > now())
        )
      )
  )
$$;

create or replace function app_private.can_access_product_scope(
  target_organization_id uuid,
  target_project_id uuid,
  target_team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select app_private.is_current_organization_member(target_organization_id)
    and (target_project_id is null or app_private.can_access_project(target_project_id))
    and app_private.can_access_product_team(target_organization_id, target_team_id)
$$;

create or replace function public.product_create_record_once(
  p_kind text,
  p_organization_id uuid,
  p_project_id uuid,
  p_team_id uuid,
  p_actor_id uuid,
  p_idempotency_key text,
  p_request_digest text,
  p_state text,
  p_payload jsonb,
  p_parent_kind text default null,
  p_parent_id uuid default null
)
returns setof public.product_records
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  admitted_id uuid := gen_random_uuid();
  inserted_count integer;
  existing_key public.product_idempotency_keys%rowtype;
  admitted public.product_records%rowtype;
begin
  if not exists (
    select 1 from public.organization_memberships
    where organization_id = p_organization_id and profile_id = p_actor_id and state = 'active'
  ) then raise exception 'scope_denied'; end if;

  if p_project_id is not null and not exists (
    select 1 from public.projects
    where id = p_project_id and organization_id = p_organization_id and state = 'active'
  ) then raise exception 'scope_denied'; end if;

  if p_team_id is not null and not exists (
    select 1 from public.teams
    where id = p_team_id and organization_id = p_organization_id and state = 'active'
  ) then raise exception 'scope_denied'; end if;

  insert into public.product_idempotency_keys(
    organization_id, kind, idempotency_key, request_digest, record_id
  ) values (p_organization_id, p_kind, p_idempotency_key, p_request_digest, admitted_id)
  on conflict (organization_id, kind, idempotency_key) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    select * into existing_key from public.product_idempotency_keys
    where organization_id = p_organization_id and kind = p_kind
      and idempotency_key = p_idempotency_key;
    if existing_key.request_digest <> p_request_digest then
      raise exception 'idempotency_key_reused';
    end if;
    return query select * from public.product_records where id = existing_key.record_id;
    return;
  end if;

  if p_parent_id is not null and not exists (
    select 1 from public.product_records
    where id = p_parent_id and kind = p_parent_kind and organization_id = p_organization_id
      and project_id is not distinct from p_project_id and team_id is not distinct from p_team_id
  ) then raise exception 'parent_not_found'; end if;

  insert into public.product_records(
    id, kind, organization_id, project_id, team_id, parent_kind, parent_id,
    state, payload, created_by, updated_by
  ) values (
    admitted_id, p_kind, p_organization_id, p_project_id, p_team_id, p_parent_kind, p_parent_id,
    p_state, coalesce(p_payload, '{}'::jsonb), p_actor_id, p_actor_id
  ) returning * into admitted;

  insert into public.audit_events(organization_id, actor_profile_id, action, resource_type, resource_id, metadata)
  values (p_organization_id, p_actor_id, 'product.created', p_kind, admitted_id::text,
          jsonb_build_object('project_id', p_project_id, 'team_id', p_team_id, 'version', 1));
  insert into public.outbox_events(organization_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key)
  values (p_organization_id, 'product_record', admitted_id, 'product.created',
          jsonb_build_object('kind', p_kind, 'version', 1),
          'product:create:' || p_organization_id::text || ':' || p_kind || ':' || p_idempotency_key);
  return next admitted;
end
$$;

create or replace function public.product_update_record(
  p_kind text,
  p_record_id uuid,
  p_organization_id uuid,
  p_project_id uuid,
  p_team_id uuid,
  p_actor_id uuid,
  p_expected_version bigint,
  p_state text default null,
  p_payload jsonb default null
)
returns setof public.product_records
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare updated public.product_records%rowtype;
begin
  if p_kind in ('agent_version', 'output_version', 'citation', 'retrieval', 'review_decision',
                'automation_version', 'automation_execution', 'realtime_hint') then
    raise exception 'append_only_record';
  end if;
  if not exists (
    select 1 from public.organization_memberships
    where organization_id = p_organization_id and profile_id = p_actor_id and state = 'active'
  ) then raise exception 'scope_denied'; end if;

  update public.product_records
  set state = coalesce(p_state, state), payload = case when p_payload is null then payload else payload || p_payload end,
      version = version + 1, updated_by = p_actor_id, updated_at = now()
  where id = p_record_id and kind = p_kind and organization_id = p_organization_id
    and project_id is not distinct from p_project_id and team_id is not distinct from p_team_id
    and version = p_expected_version
  returning * into updated;

  if updated.id is null then
    if exists (
      select 1 from public.product_records where id = p_record_id and kind = p_kind
        and organization_id = p_organization_id and project_id is not distinct from p_project_id
        and team_id is not distinct from p_team_id
    ) then raise exception 'stale_version'; else raise exception 'not_found'; end if;
  end if;

  insert into public.audit_events(organization_id, actor_profile_id, action, resource_type, resource_id, metadata)
  values (p_organization_id, p_actor_id, 'product.updated', p_kind, p_record_id::text,
          jsonb_build_object('project_id', p_project_id, 'team_id', p_team_id, 'version', updated.version));
  insert into public.outbox_events(organization_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key)
  values (p_organization_id, 'product_record', p_record_id, 'product.updated',
          jsonb_build_object('kind', p_kind, 'version', updated.version),
          'product:update:' || p_record_id::text || ':' || updated.version::text);
  return next updated;
end
$$;

alter table public.product_records enable row level security;
alter table public.product_idempotency_keys enable row level security;

create policy product_records_select on public.product_records for select to authenticated
using (app_private.can_access_product_scope(organization_id, project_id, team_id));

revoke all on table public.product_records, public.product_idempotency_keys from anon, authenticated;
grant select on table public.product_records to authenticated;
grant select, insert, update, delete on table public.product_records, public.product_idempotency_keys to service_role;

revoke all on function public.product_create_record_once(text, uuid, uuid, uuid, uuid, text, text, text, jsonb, text, uuid) from public, anon, authenticated;
revoke all on function public.product_update_record(text, uuid, uuid, uuid, uuid, uuid, bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.product_create_record_once(text, uuid, uuid, uuid, uuid, text, text, text, jsonb, text, uuid) to service_role;
grant execute on function public.product_update_record(text, uuid, uuid, uuid, uuid, uuid, bigint, text, jsonb) to service_role;
grant execute on function app_private.can_access_product_team(uuid, uuid), app_private.can_access_product_scope(uuid, uuid, uuid) to authenticated, service_role;

comment on table public.product_records is 'Canonical Phase 5-12 aggregate product records across 26 admitted kinds';
comment on table public.product_idempotency_keys is 'Server-only request deduplication for aggregate product writes';

commit;
