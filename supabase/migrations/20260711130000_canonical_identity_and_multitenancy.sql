-- Beyond Chat canonical Phase 2 baseline.
--
-- This is intentionally a destructive empty-environment baseline. The linked
-- production project had no users, public application rows, or storage objects
-- when the pre-reset backup was taken. Do not run this migration against a
-- populated environment without a reviewed data migration.

begin;

drop schema if exists app_private cascade;
drop schema if exists public cascade;

create schema public;
create schema app_private;

comment on schema public is 'Beyond Chat Data API surface';
comment on schema app_private is 'Non-exposed identity, authorization, and integrity helpers';

revoke all on schema public from public;
revoke all on schema app_private from public;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema app_private to authenticated, service_role;

create type public.organization_role as enum ('owner', 'admin', 'builder', 'member', 'viewer');
create type public.membership_state as enum ('invited', 'active', 'suspended', 'revoked');
create type public.record_state as enum ('active', 'disabled', 'archived');
create type public.project_visibility as enum ('private', 'team', 'organization');
create type public.project_access_role as enum ('owner', 'editor', 'contributor', 'viewer');
create type public.invitation_state as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.batch_state as enum ('pending', 'processing', 'completed', 'partially_failed', 'failed', 'cancelled');
create type public.resource_principal_type as enum ('profile', 'team');
create type public.resource_type as enum ('organization', 'team', 'project');
create type public.resource_permission as enum ('view', 'use', 'edit', 'manage');
create type public.webhook_state as enum ('pending', 'processing', 'processed', 'failed', 'dead_letter');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  primary_email text,
  avatar_url text,
  locale text,
  timezone text,
  state public.record_state not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 200),
  constraint profiles_primary_email_normalized check (
    primary_email is null or (primary_email = lower(btrim(primary_email)) and char_length(primary_email) between 3 and 320)
  )
);

create unique index profiles_primary_email_unique
  on public.profiles (primary_email)
  where primary_email is not null;

create table public.external_identities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'workos',
  issuer text not null,
  subject text not null,
  email text,
  email_verified boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_identities_provider check (provider = 'workos'),
  constraint external_identities_issuer_nonempty check (char_length(btrim(issuer)) > 0),
  constraint external_identities_subject_nonempty check (char_length(btrim(subject)) > 0),
  constraint external_identities_email_normalized check (
    email is null or (email = lower(btrim(email)) and char_length(email) between 3 and 320)
  ),
  unique (provider, issuer, subject)
);

create index external_identities_profile_id_idx on public.external_identities (profile_id);
create index external_identities_email_idx on public.external_identities (email) where email is not null;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  workos_organization_id text not null unique,
  name text not null,
  slug text not null unique,
  state public.record_state not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_workos_id_nonempty check (char_length(btrim(workos_organization_id)) > 0),
  constraint organizations_name_length check (char_length(btrim(name)) between 1 and 200),
  constraint organizations_slug_format check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$')
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  workos_membership_id text,
  role public.organization_role not null default 'member',
  state public.membership_state not null default 'active',
  joined_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id),
  constraint organization_memberships_revocation_time check (
    (state = 'revoked' and revoked_at is not null) or state <> 'revoked'
  )
);

create unique index organization_memberships_workos_id_unique
  on public.organization_memberships (workos_membership_id)
  where workos_membership_id is not null;
create index organization_memberships_profile_id_idx on public.organization_memberships (profile_id);
create index organization_memberships_org_state_idx on public.organization_memberships (organization_id, state);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workos_group_id text,
  name text not null,
  slug text not null,
  state public.record_state not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, slug),
  constraint teams_name_length check (char_length(btrim(name)) between 1 and 200),
  constraint teams_slug_format check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$')
);

create unique index teams_workos_group_id_unique
  on public.teams (organization_id, workos_group_id)
  where workos_group_id is not null;
create index teams_created_by_idx on public.teams (created_by) where created_by is not null;

create table public.team_memberships (
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

create index team_memberships_profile_id_idx on public.team_memberships (profile_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid,
  name text not null,
  slug text not null,
  description text,
  visibility public.project_visibility not null default 'private',
  state public.record_state not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, slug),
  constraint projects_team_same_organization
    foreign key (organization_id, team_id)
    references public.teams(organization_id, id)
    on delete set null,
  constraint projects_name_length check (char_length(btrim(name)) between 1 and 200),
  constraint projects_slug_format check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  constraint projects_team_visibility_requires_team check (visibility <> 'team' or team_id is not null)
);

create index projects_team_id_idx on public.projects (team_id) where team_id is not null;
create index projects_created_by_idx on public.projects (created_by) where created_by is not null;
create index projects_org_state_idx on public.projects (organization_id, state);

create table public.project_memberships (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.project_access_role not null default 'viewer',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

create index project_memberships_profile_id_idx on public.project_memberships (profile_id);
create index project_memberships_created_by_idx on public.project_memberships (created_by) where created_by is not null;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.organization_role not null default 'member',
  state public.invitation_state not null default 'pending',
  workos_invitation_id text,
  invited_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_email_normalized check (
    email = lower(btrim(email)) and char_length(email) between 3 and 320
  ),
  constraint invitations_expiry_after_create check (expires_at > created_at),
  constraint invitations_acceptance_time check ((state = 'accepted' and accepted_at is not null) or state <> 'accepted'),
  constraint invitations_revocation_time check ((state = 'revoked' and revoked_at is not null) or state <> 'revoked')
);

create unique index invitations_workos_id_unique
  on public.invitations (workos_invitation_id)
  where workos_invitation_id is not null;
create unique index invitations_one_pending_per_email
  on public.invitations (organization_id, email)
  where state = 'pending';
create index invitations_org_state_idx on public.invitations (organization_id, state);
create index invitations_invited_by_idx on public.invitations (invited_by) where invited_by is not null;

create table public.bulk_invite_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  idempotency_key text not null,
  state public.batch_state not null default 'pending',
  total_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (organization_id, idempotency_key),
  constraint bulk_invite_batches_counts_nonnegative check (
    total_count >= 0 and success_count >= 0 and failure_count >= 0
  ),
  constraint bulk_invite_batches_counts_bounded check (success_count + failure_count <= total_count),
  constraint bulk_invite_batches_idempotency_nonempty check (char_length(btrim(idempotency_key)) > 0)
);

create index bulk_invite_batches_requested_by_idx on public.bulk_invite_batches (requested_by) where requested_by is not null;

create table public.bulk_invite_entries (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.bulk_invite_batches(id) on delete cascade,
  invitation_id uuid references public.invitations(id) on delete set null,
  email text not null,
  role public.organization_role not null default 'member',
  state public.invitation_state not null default 'pending',
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, email),
  constraint bulk_invite_entries_email_normalized check (
    email = lower(btrim(email)) and char_length(email) between 3 and 320
  )
);

create index bulk_invite_entries_invitation_id_idx on public.bulk_invite_entries (invitation_id) where invitation_id is not null;

create table public.resource_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  resource_type public.resource_type not null,
  resource_id uuid not null,
  principal_type public.resource_principal_type not null,
  principal_id uuid not null,
  permission public.resource_permission not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (organization_id, resource_type, resource_id, principal_type, principal_id, permission),
  constraint resource_grants_expiry_future check (expires_at is null or expires_at > created_at)
);

create index resource_grants_resource_idx on public.resource_grants (resource_type, resource_id);
create index resource_grants_principal_idx on public.resource_grants (principal_type, principal_id);
create index resource_grants_created_by_idx on public.resource_grants (created_by) where created_by is not null;

create table public.webhook_inbox (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'workos',
  event_id text not null,
  event_type text not null,
  organization_external_id text,
  payload jsonb not null,
  state public.webhook_state not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz,
  processed_at timestamptz,
  last_error text,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, event_id),
  constraint webhook_inbox_provider check (provider = 'workos'),
  constraint webhook_inbox_event_nonempty check (char_length(btrim(event_id)) > 0 and char_length(btrim(event_type)) > 0),
  constraint webhook_inbox_attempts_nonnegative check (attempt_count >= 0),
  constraint webhook_inbox_payload_object check (jsonb_typeof(payload) = 'object')
);

create index webhook_inbox_pending_idx on public.webhook_inbox (state, next_attempt_at, received_at)
  where state in ('pending', 'failed');
create index webhook_inbox_org_external_id_idx on public.webhook_inbox (organization_external_id)
  where organization_external_id is not null;

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null,
  idempotency_key text not null unique,
  occurred_at timestamptz not null default now(),
  published_at timestamptz,
  attempt_count integer not null default 0,
  next_attempt_at timestamptz,
  last_error text,
  constraint outbox_events_names_nonempty check (
    char_length(btrim(aggregate_type)) > 0 and char_length(btrim(event_type)) > 0 and char_length(btrim(idempotency_key)) > 0
  ),
  constraint outbox_events_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint outbox_events_attempts_nonnegative check (attempt_count >= 0)
);

create index outbox_events_unpublished_idx on public.outbox_events (next_attempt_at, occurred_at)
  where published_at is null;
create index outbox_events_aggregate_idx on public.outbox_events (aggregate_type, aggregate_id);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  request_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint audit_events_names_nonempty check (char_length(btrim(action)) > 0 and char_length(btrim(resource_type)) > 0),
  constraint audit_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index audit_events_org_time_idx on public.audit_events (organization_id, occurred_at desc);
create index audit_events_actor_time_idx on public.audit_events (actor_profile_id, occurred_at desc)
  where actor_profile_id is not null;
create index audit_events_request_id_idx on public.audit_events (request_id) where request_id is not null;

create function app_private.jwt_claims()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create function app_private.jwt_subject()
returns text
language sql
stable
security invoker
set search_path = pg_catalog, app_private
as $$
  select nullif(app_private.jwt_claims() ->> 'sub', '')
$$;

create function app_private.jwt_issuer()
returns text
language sql
stable
security invoker
set search_path = pg_catalog, app_private
as $$
  select nullif(rtrim(app_private.jwt_claims() ->> 'iss', '/'), '')
$$;

create function app_private.jwt_organization_external_id()
returns text
language sql
stable
security invoker
set search_path = pg_catalog, app_private
as $$
  select nullif(coalesce(
    app_private.jwt_claims() ->> 'org_id',
    app_private.jwt_claims() ->> 'organization_id'
  ), '')
$$;

create function app_private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select identity.profile_id
  from public.external_identities as identity
  join public.profiles as profile on profile.id = identity.profile_id
  where identity.provider = 'workos'
    and identity.issuer = app_private.jwt_issuer()
    and identity.subject = app_private.jwt_subject()
    and profile.state = 'active'
  limit 1
$$;

create function app_private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select organization.id
  from public.organizations as organization
  where organization.workos_organization_id = app_private.jwt_organization_external_id()
    and organization.state = 'active'
  limit 1
$$;

create function app_private.is_organization_context(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select target_organization_id is not null
    and app_private.jwt_organization_external_id() is not null
    and target_organization_id = app_private.current_organization_id()
$$;

create function app_private.is_current_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select app_private.is_organization_context(target_organization_id)
    and exists (
      select 1
      from public.organization_memberships as membership
      where membership.organization_id = target_organization_id
        and membership.profile_id = app_private.current_profile_id()
        and membership.state = 'active'
    )
$$;

create function app_private.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select app_private.is_organization_context(target_organization_id)
    and exists (
      select 1
      from public.organization_memberships as membership
      where membership.organization_id = target_organization_id
        and membership.profile_id = app_private.current_profile_id()
        and membership.state = 'active'
        and membership.role = any(allowed_roles)
    )
$$;

create function app_private.shares_current_organization(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select exists (
    select 1
    from public.organization_memberships as mine
    join public.organization_memberships as theirs
      on theirs.organization_id = mine.organization_id
    where mine.profile_id = app_private.current_profile_id()
      and mine.state = 'active'
      and theirs.profile_id = target_profile_id
      and theirs.state = 'active'
      and app_private.is_organization_context(mine.organization_id)
  )
$$;

create function app_private.can_access_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select exists (
    select 1
    from public.teams as team
    where team.id = target_team_id
      and team.state = 'active'
      and app_private.is_current_organization_member(team.organization_id)
  )
$$;

create function app_private.can_access_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select exists (
    select 1
    from public.projects as project
    where project.id = target_project_id
      and project.state = 'active'
      and app_private.is_current_organization_member(project.organization_id)
      and (
        project.visibility = 'organization'
        or app_private.has_organization_role(project.organization_id, array['owner', 'admin', 'builder']::public.organization_role[])
        or exists (
          select 1
          from public.project_memberships as membership
          where membership.project_id = project.id
            and membership.profile_id = app_private.current_profile_id()
        )
        or (
          project.visibility = 'team'
          and exists (
            select 1
            from public.team_memberships as membership
            where membership.team_id = project.team_id
              and membership.profile_id = app_private.current_profile_id()
          )
        )
      )
  )
$$;

create function app_private.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select exists (
    select 1
    from public.projects as project
    where project.id = target_project_id
      and project.state = 'active'
      and app_private.is_organization_context(project.organization_id)
      and (
        app_private.has_organization_role(project.organization_id, array['owner', 'admin', 'builder']::public.organization_role[])
        or exists (
          select 1
          from public.project_memberships as membership
          where membership.project_id = project.id
            and membership.profile_id = app_private.current_profile_id()
            and membership.role in ('owner', 'editor')
        )
      )
  )
$$;

create function app_private.storage_organization_id(object_name text)
returns uuid
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end
$$;

create function app_private.storage_project_id(object_name text)
returns uuid
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select case
    when split_part(object_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 2)::uuid
    else null
  end
$$;

create function app_private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end
$$;

create function app_private.validate_resource_grant()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.resource_type = 'organization' and new.resource_id <> new.organization_id then
    raise exception 'organization grant resource must equal organization_id' using errcode = '23514';
  elsif new.resource_type = 'team' and not exists (
    select 1 from public.teams where id = new.resource_id and organization_id = new.organization_id
  ) then
    raise exception 'team grant resource is outside organization' using errcode = '23514';
  elsif new.resource_type = 'project' and not exists (
    select 1 from public.projects where id = new.resource_id and organization_id = new.organization_id
  ) then
    raise exception 'project grant resource is outside organization' using errcode = '23514';
  end if;

  if new.principal_type = 'profile' and not exists (
    select 1
    from public.organization_memberships
    where organization_id = new.organization_id
      and profile_id = new.principal_id
      and state = 'active'
  ) then
    raise exception 'profile grant principal is not an active organization member' using errcode = '23514';
  elsif new.principal_type = 'team' and not exists (
    select 1 from public.teams where id = new.principal_id and organization_id = new.organization_id
  ) then
    raise exception 'team grant principal is outside organization' using errcode = '23514';
  end if;

  return new;
end
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function app_private.touch_updated_at();
create trigger external_identities_touch_updated_at before update on public.external_identities
for each row execute function app_private.touch_updated_at();
create trigger organizations_touch_updated_at before update on public.organizations
for each row execute function app_private.touch_updated_at();
create trigger organization_memberships_touch_updated_at before update on public.organization_memberships
for each row execute function app_private.touch_updated_at();
create trigger teams_touch_updated_at before update on public.teams
for each row execute function app_private.touch_updated_at();
create trigger projects_touch_updated_at before update on public.projects
for each row execute function app_private.touch_updated_at();
create trigger project_memberships_touch_updated_at before update on public.project_memberships
for each row execute function app_private.touch_updated_at();
create trigger invitations_touch_updated_at before update on public.invitations
for each row execute function app_private.touch_updated_at();
create trigger bulk_invite_entries_touch_updated_at before update on public.bulk_invite_entries
for each row execute function app_private.touch_updated_at();
create trigger webhook_inbox_touch_updated_at before update on public.webhook_inbox
for each row execute function app_private.touch_updated_at();
create trigger resource_grants_validate before insert or update on public.resource_grants
for each row execute function app_private.validate_resource_grant();

alter table public.profiles enable row level security;
alter table public.external_identities enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.projects enable row level security;
alter table public.project_memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.bulk_invite_batches enable row level security;
alter table public.bulk_invite_entries enable row level security;
alter table public.resource_grants enable row level security;
alter table public.webhook_inbox enable row level security;
alter table public.outbox_events enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_select on public.profiles for select to authenticated
using (id = app_private.current_profile_id() or app_private.shares_current_organization(id));
create policy profiles_update_self on public.profiles for update to authenticated
using (id = app_private.current_profile_id())
with check (id = app_private.current_profile_id());

create policy external_identities_select_self on public.external_identities for select to authenticated
using (profile_id = app_private.current_profile_id());

create policy organizations_select on public.organizations for select to authenticated
using (app_private.is_current_organization_member(id));

create policy organization_memberships_select on public.organization_memberships for select to authenticated
using (app_private.is_current_organization_member(organization_id));

create policy teams_select on public.teams for select to authenticated
using (app_private.is_current_organization_member(organization_id));
create policy teams_insert on public.teams for insert to authenticated
with check (
  created_by = app_private.current_profile_id()
  and app_private.has_organization_role(organization_id, array['owner', 'admin', 'builder']::public.organization_role[])
);
create policy teams_update on public.teams for update to authenticated
using (app_private.has_organization_role(organization_id, array['owner', 'admin', 'builder']::public.organization_role[]))
with check (app_private.has_organization_role(organization_id, array['owner', 'admin', 'builder']::public.organization_role[]));
create policy teams_delete on public.teams for delete to authenticated
using (app_private.has_organization_role(organization_id, array['owner', 'admin']::public.organization_role[]));

create policy team_memberships_select on public.team_memberships for select to authenticated
using (app_private.can_access_team(team_id));
create policy team_memberships_insert on public.team_memberships for insert to authenticated
with check (exists (
  select 1 from public.teams as team
  where team.id = team_id
    and app_private.has_organization_role(team.organization_id, array['owner', 'admin', 'builder']::public.organization_role[])
));
create policy team_memberships_delete on public.team_memberships for delete to authenticated
using (exists (
  select 1 from public.teams as team
  where team.id = team_id
    and app_private.has_organization_role(team.organization_id, array['owner', 'admin', 'builder']::public.organization_role[])
));

create policy projects_select on public.projects for select to authenticated
using (app_private.can_access_project(id));
create policy projects_insert on public.projects for insert to authenticated
with check (
  created_by = app_private.current_profile_id()
  and app_private.has_organization_role(organization_id, array['owner', 'admin', 'builder', 'member']::public.organization_role[])
);
create policy projects_update on public.projects for update to authenticated
using (app_private.can_manage_project(id))
with check (app_private.has_organization_role(organization_id, array['owner', 'admin', 'builder']::public.organization_role[]));
create policy projects_delete on public.projects for delete to authenticated
using (app_private.has_organization_role(organization_id, array['owner', 'admin', 'builder']::public.organization_role[]));

create policy project_memberships_select on public.project_memberships for select to authenticated
using (app_private.can_access_project(project_id));
create policy project_memberships_insert on public.project_memberships for insert to authenticated
with check (created_by = app_private.current_profile_id() and app_private.can_manage_project(project_id));
create policy project_memberships_update on public.project_memberships for update to authenticated
using (app_private.can_manage_project(project_id))
with check (app_private.can_manage_project(project_id));
create policy project_memberships_delete on public.project_memberships for delete to authenticated
using (app_private.can_manage_project(project_id));

create policy invitations_select on public.invitations for select to authenticated
using (app_private.has_organization_role(organization_id, array['owner', 'admin']::public.organization_role[]));
create policy invitations_insert on public.invitations for insert to authenticated
with check (
  invited_by = app_private.current_profile_id()
  and app_private.has_organization_role(organization_id, array['owner', 'admin']::public.organization_role[])
);
create policy invitations_update on public.invitations for update to authenticated
using (app_private.has_organization_role(organization_id, array['owner', 'admin']::public.organization_role[]))
with check (app_private.has_organization_role(organization_id, array['owner', 'admin']::public.organization_role[]));
create policy invitations_delete on public.invitations for delete to authenticated
using (app_private.has_organization_role(organization_id, array['owner', 'admin']::public.organization_role[]));

create policy bulk_invite_batches_select on public.bulk_invite_batches for select to authenticated
using (app_private.has_organization_role(organization_id, array['owner', 'admin']::public.organization_role[]));
create policy bulk_invite_batches_insert on public.bulk_invite_batches for insert to authenticated
with check (
  requested_by = app_private.current_profile_id()
  and app_private.has_organization_role(organization_id, array['owner', 'admin']::public.organization_role[])
);
create policy bulk_invite_batches_update on public.bulk_invite_batches for update to authenticated
using (app_private.has_organization_role(organization_id, array['owner', 'admin']::public.organization_role[]))
with check (app_private.has_organization_role(organization_id, array['owner', 'admin']::public.organization_role[]));

create policy bulk_invite_entries_select on public.bulk_invite_entries for select to authenticated
using (exists (
  select 1 from public.bulk_invite_batches as batch
  where batch.id = batch_id
    and app_private.has_organization_role(batch.organization_id, array['owner', 'admin']::public.organization_role[])
));

create policy resource_grants_select on public.resource_grants for select to authenticated
using (app_private.is_current_organization_member(organization_id));
create policy resource_grants_insert on public.resource_grants for insert to authenticated
with check (
  created_by = app_private.current_profile_id()
  and app_private.has_organization_role(organization_id, array['owner', 'admin', 'builder']::public.organization_role[])
);
create policy resource_grants_update on public.resource_grants for update to authenticated
using (app_private.has_organization_role(organization_id, array['owner', 'admin', 'builder']::public.organization_role[]))
with check (app_private.has_organization_role(organization_id, array['owner', 'admin', 'builder']::public.organization_role[]));
create policy resource_grants_delete on public.resource_grants for delete to authenticated
using (app_private.has_organization_role(organization_id, array['owner', 'admin', 'builder']::public.organization_role[]));

create policy audit_events_select on public.audit_events for select to authenticated
using (
  organization_id is not null
  and app_private.has_organization_role(organization_id, array['owner', 'admin']::public.organization_role[])
);

revoke all on all tables in schema public from public, anon, authenticated;
grant all on all tables in schema public to service_role;

grant select, update on public.profiles to authenticated;
grant select on public.external_identities to authenticated;
grant select on public.organizations, public.organization_memberships to authenticated;
grant select, insert, update, delete on public.teams, public.team_memberships to authenticated;
grant select, insert, update, delete on public.projects, public.project_memberships to authenticated;
grant select, insert, update, delete on public.invitations to authenticated;
grant select, insert, update on public.bulk_invite_batches to authenticated;
grant select on public.bulk_invite_entries to authenticated;
grant select, insert, update, delete on public.resource_grants to authenticated;
grant select on public.audit_events to authenticated;

revoke all on all functions in schema app_private from public, anon, authenticated;
grant all on all functions in schema app_private to service_role;
grant execute on function app_private.current_profile_id() to authenticated;
grant execute on function app_private.current_organization_id() to authenticated;
grant execute on function app_private.is_current_organization_member(uuid) to authenticated;
grant execute on function app_private.has_organization_role(uuid, public.organization_role[]) to authenticated;
grant execute on function app_private.shares_current_organization(uuid) to authenticated;
grant execute on function app_private.can_access_team(uuid) to authenticated;
grant execute on function app_private.can_access_project(uuid) to authenticated;
grant execute on function app_private.can_manage_project(uuid) to authenticated;
grant execute on function app_private.storage_organization_id(text) to authenticated;
grant execute on function app_private.storage_project_id(text) to authenticated;

alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema app_private revoke execute on functions from public, anon, authenticated;
alter default privileges in schema app_private grant all on functions to service_role;

do $storage$
declare
  existing_policy record;
begin
  if to_regclass('storage.objects') is null or to_regclass('storage.buckets') is null then
    return;
  end if;

  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy %I on storage.objects', existing_policy.policyname);
  end loop;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    (
      'knowledge',
      'knowledge',
      false,
      104857600,
      array[
        'text/plain', 'text/markdown', 'text/csv', 'text/html', 'application/json', 'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/png', 'image/jpeg', 'image/webp'
      ]::text[]
    ),
    (
      'outputs',
      'outputs',
      false,
      104857600,
      array[
        'text/plain', 'text/markdown', 'text/csv', 'text/html', 'application/json', 'application/pdf',
        'application/zip',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml',
        'audio/mpeg', 'audio/wav', 'video/mp4'
      ]::text[]
    )
  on conflict (id) do update
  set name = excluded.name,
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

  execute $policy$
    create policy beyond_storage_read on storage.objects
    for select to authenticated
    using (
      bucket_id in ('knowledge', 'outputs')
      and app_private.storage_organization_id(name) is not null
      and app_private.storage_project_id(name) is not null
      and app_private.is_current_organization_member(app_private.storage_organization_id(name))
      and app_private.can_access_project(app_private.storage_project_id(name))
    )
  $policy$;

  execute $policy$
    create policy beyond_storage_insert on storage.objects
    for insert to authenticated
    with check (
      bucket_id in ('knowledge', 'outputs')
      and app_private.storage_organization_id(name) is not null
      and app_private.storage_project_id(name) is not null
      and app_private.is_current_organization_member(app_private.storage_organization_id(name))
      and app_private.can_access_project(app_private.storage_project_id(name))
      and (
        bucket_id = 'outputs'
        or app_private.has_organization_role(
          app_private.storage_organization_id(name),
          array['owner', 'admin', 'builder']::public.organization_role[]
        )
      )
    )
  $policy$;

  execute $policy$
    create policy beyond_storage_update on storage.objects
    for update to authenticated
    using (
      bucket_id in ('knowledge', 'outputs')
      and app_private.can_manage_project(app_private.storage_project_id(name))
    )
    with check (
      bucket_id in ('knowledge', 'outputs')
      and app_private.is_current_organization_member(app_private.storage_organization_id(name))
      and app_private.can_manage_project(app_private.storage_project_id(name))
    )
  $policy$;

  execute $policy$
    create policy beyond_storage_delete on storage.objects
    for delete to authenticated
    using (
      bucket_id in ('knowledge', 'outputs')
      and app_private.is_current_organization_member(app_private.storage_organization_id(name))
      and app_private.can_manage_project(app_private.storage_project_id(name))
    )
  $policy$;
end
$storage$;

do $realtime$
declare
  table_name text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  foreach table_name in array array[
    'organization_memberships',
    'teams',
    'team_memberships',
    'projects',
    'project_memberships',
    'invitations',
    'resource_grants'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$realtime$;

comment on table public.external_identities is 'WorkOS issuer/subject to internal profile mapping; never references auth.users';
comment on table public.webhook_inbox is 'Idempotent WorkOS webhook receipt ledger; service-role only';
comment on table public.outbox_events is 'Transactional event delivery ledger; service-role only';
comment on table public.audit_events is 'Append-only security and organization activity events; writes are service-role only';
comment on table public.resource_grants is 'Organization-scoped grants for profile and team principals';

commit;
