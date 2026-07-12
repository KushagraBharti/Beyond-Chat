begin;

-- Phase 4C additive runtime control-plane schema. This migration is intentionally
-- not applied remotely by automation. The manager must review and apply it.

create table public.runtime_commands (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  command_type text not null,
  schema_version integer not null default 1 check (schema_version > 0),
  idempotency_key text not null check (length(idempotency_key) between 8 and 255),
  correlation_id text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  accepted_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create table public.runtime_runs (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  command_id text references public.runtime_commands(id) on delete restrict,
  agent_version_id text not null,
  state text not null default 'queued' check (state in (
    'accepted', 'queued', 'leased', 'preparing', 'running', 'awaiting_approval',
    'completing', 'retrying', 'paused', 'stalled', 'reconciling',
    'completed', 'failed', 'canceled'
  )),
  attempt integer not null default 0 check (attempt >= 0),
  version integer not null default 1 check (version > 0),
  next_event_sequence bigint not null default 1 check (next_event_sequence > 0),
  idempotency_key text not null check (length(idempotency_key) between 8 and 255),
  correlation_id text not null default '',
  cancel_requested_at timestamptz,
  terminal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  terminal_at timestamptz,
  unique (organization_id, idempotency_key),
  check ((state in ('completed', 'failed', 'canceled')) = (terminal_at is not null))
);

create table public.runtime_run_attempts (
  run_id text not null references public.runtime_runs(id) on delete cascade,
  attempt integer not null check (attempt > 0),
  worker_id text not null,
  provider text,
  provider_execution_id text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  outcome text,
  failure_class text,
  failure_detail jsonb not null default '{}'::jsonb check (jsonb_typeof(failure_detail) = 'object'),
  primary key (run_id, attempt)
);

create table public.runtime_leases (
  id uuid primary key default gen_random_uuid(),
  run_id text not null references public.runtime_runs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  worker_id text not null,
  attempt integer not null check (attempt > 0),
  acquired_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  expires_at timestamptz not null,
  released_at timestamptz,
  unique (run_id, attempt),
  check (expires_at > acquired_at)
);

create unique index runtime_leases_one_active_per_run_idx
  on public.runtime_leases(run_id) where released_at is null;
create index runtime_leases_active_expiry_idx
  on public.runtime_leases(expires_at, organization_id) where released_at is null;

create table public.runtime_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id text not null references public.runtime_runs(id) on delete cascade,
  sequence bigint not null check (sequence > 0),
  event_type text not null,
  schema_version integer not null default 1 check (schema_version > 0),
  actor_type text not null default 'system' check (actor_type in ('user', 'system', 'worker', 'agent', 'provider')),
  actor_id text,
  causation_id text,
  correlation_id text,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null default now(),
  unique (run_id, sequence)
);

create table public.runtime_approvals (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id text not null references public.runtime_runs(id) on delete cascade,
  sequence bigint not null,
  operation text not null,
  argument_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(argument_summary) = 'object'),
  state text not null default 'pending' check (state in ('pending', 'approved', 'denied', 'expired', 'canceled')),
  requested_at timestamptz not null default now(),
  expires_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete restrict,
  resolution_reason text,
  unique (run_id, sequence),
  check ((state = 'pending') = (resolved_at is null))
);

create table public.runtime_outputs (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id text not null references public.runtime_runs(id) on delete cascade,
  uri text not null,
  digest text not null check (digest ~ '^sha256:[0-9a-f]{64}$'),
  media_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  state text not null default 'ready' check (state in ('uploading', 'ready', 'invalid', 'superseded')),
  created_at timestamptz not null default now(),
  unique (run_id, digest, uri)
);

create table public.runtime_cost_ledger (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id text not null references public.runtime_runs(id) on delete cascade,
  attempt integer not null check (attempt >= 0),
  provider text not null,
  category text not null check (category in ('model', 'tool', 'sandbox', 'storage', 'render', 'realtime')),
  amount_usd numeric(20, 10) not null check (amount_usd >= 0),
  provider_usage_id text not null,
  rate_version text not null,
  outcome text not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  unique (run_id, attempt, provider, provider_usage_id)
);

create table public.runtime_dispatch_queue (
  run_id text primary key references public.runtime_runs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  available_at timestamptz not null default now(),
  notified_at timestamptz not null default now()
);

create index runtime_commands_project_time_idx on public.runtime_commands(project_id, accepted_at desc);
create index runtime_commands_actor_idx on public.runtime_commands(actor_id);
create index runtime_runs_org_state_created_idx on public.runtime_runs(organization_id, state, created_at);
create index runtime_runs_project_created_idx on public.runtime_runs(project_id, created_at desc);
create index runtime_runs_actor_idx on public.runtime_runs(actor_id);
create index runtime_runs_command_idx on public.runtime_runs(command_id) where command_id is not null;
create index runtime_attempts_worker_idx on public.runtime_run_attempts(worker_id, started_at desc);
create index runtime_leases_organization_idx on public.runtime_leases(organization_id);
create index runtime_events_org_run_sequence_idx on public.runtime_events(organization_id, run_id, sequence);
create index runtime_events_project_idx on public.runtime_events(project_id);
create index runtime_approvals_pending_idx on public.runtime_approvals(organization_id, requested_at)
  where state = 'pending';
create index runtime_approvals_project_idx on public.runtime_approvals(project_id);
create index runtime_approvals_resolved_by_idx on public.runtime_approvals(resolved_by) where resolved_by is not null;
create index runtime_outputs_run_created_idx on public.runtime_outputs(run_id, created_at);
create index runtime_outputs_organization_idx on public.runtime_outputs(organization_id);
create index runtime_outputs_project_idx on public.runtime_outputs(project_id);
create index runtime_cost_org_time_idx on public.runtime_cost_ledger(organization_id, occurred_at);
create index runtime_cost_project_idx on public.runtime_cost_ledger(project_id);
create index runtime_cost_run_idx on public.runtime_cost_ledger(run_id);
create index runtime_dispatch_available_idx on public.runtime_dispatch_queue(available_at, organization_id);
create index runtime_dispatch_organization_idx on public.runtime_dispatch_queue(organization_id);

alter table public.runtime_commands enable row level security;
alter table public.runtime_runs enable row level security;
alter table public.runtime_run_attempts enable row level security;
alter table public.runtime_leases enable row level security;
alter table public.runtime_events enable row level security;
alter table public.runtime_approvals enable row level security;
alter table public.runtime_outputs enable row level security;
alter table public.runtime_cost_ledger enable row level security;
alter table public.runtime_dispatch_queue enable row level security;

-- Browser/authenticated clients receive read-only access through tenant and
-- project RLS. All authoritative writes are app-server/worker service RPCs.
grant select on public.runtime_commands, public.runtime_runs, public.runtime_events,
  public.runtime_approvals, public.runtime_outputs, public.runtime_cost_ledger to authenticated;
revoke all on public.runtime_run_attempts, public.runtime_leases, public.runtime_dispatch_queue from anon, authenticated;
grant select, insert, update, delete on public.runtime_commands, public.runtime_runs,
  public.runtime_run_attempts, public.runtime_leases, public.runtime_events,
  public.runtime_approvals, public.runtime_outputs, public.runtime_cost_ledger,
  public.runtime_dispatch_queue to service_role;
grant usage, select on sequence public.runtime_events_id_seq, public.runtime_cost_ledger_id_seq to service_role;

create policy runtime_commands_select on public.runtime_commands for select to authenticated using (
  organization_id = app_private.current_organization_id()
  and app_private.can_access_project(project_id)
);
create policy runtime_runs_select on public.runtime_runs for select to authenticated using (
  organization_id = app_private.current_organization_id()
  and app_private.can_access_project(project_id)
);
create policy runtime_events_select on public.runtime_events for select to authenticated using (
  organization_id = app_private.current_organization_id()
  and app_private.can_access_project(project_id)
);
create policy runtime_approvals_select on public.runtime_approvals for select to authenticated using (
  organization_id = app_private.current_organization_id()
  and app_private.can_access_project(project_id)
);
create policy runtime_outputs_select on public.runtime_outputs for select to authenticated using (
  organization_id = app_private.current_organization_id()
  and app_private.can_access_project(project_id)
);
create policy runtime_cost_select on public.runtime_cost_ledger for select to authenticated using (
  organization_id = app_private.current_organization_id()
  and app_private.can_access_project(project_id)
);

create or replace function public.admit_runtime_run(
  p_run_id text, p_organization_id uuid, p_project_id uuid, p_actor_id uuid,
  p_agent_version_id text, p_idempotency_key text, p_correlation_id text
)
returns public.runtime_runs
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare admitted public.runtime_runs%rowtype; command_id text;
begin
  if length(p_idempotency_key) not between 8 and 255 then
    raise exception 'invalid idempotency key' using errcode = '22023';
  end if;
  select * into admitted from public.runtime_runs
    where organization_id = p_organization_id and idempotency_key = p_idempotency_key;
  if admitted.id is not null then return admitted; end if;
  if not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_organization_id and m.profile_id = p_actor_id
      and m.state = 'active' and m.revoked_at is null
  ) or not exists (
    select 1 from public.projects p where p.id = p_project_id and p.organization_id = p_organization_id
  ) then raise exception 'runtime tenant binding denied' using errcode = '42501'; end if;
  command_id := 'cmd_' || encode(sha256(convert_to(p_organization_id::text || ':' || p_idempotency_key, 'UTF8')), 'hex');
  insert into public.runtime_commands(id, organization_id, project_id, actor_id, command_type,
    idempotency_key, correlation_id, payload)
  values (command_id, p_organization_id, p_project_id, p_actor_id, 'run.start', p_idempotency_key,
    coalesce(nullif(p_correlation_id, ''), p_run_id), jsonb_build_object('run_id', p_run_id, 'agent_version_id', p_agent_version_id));
  insert into public.runtime_runs(id, organization_id, project_id, actor_id, command_id, agent_version_id,
    state, idempotency_key, correlation_id)
  values (p_run_id, p_organization_id, p_project_id, p_actor_id, command_id, p_agent_version_id,
    'queued', p_idempotency_key, coalesce(nullif(p_correlation_id, ''), p_run_id))
  returning * into admitted;
  insert into public.runtime_dispatch_queue(run_id, organization_id) values (admitted.id, admitted.organization_id);
  return admitted;
exception when unique_violation then
  select * into admitted from public.runtime_runs
    where organization_id = p_organization_id and idempotency_key = p_idempotency_key;
  if admitted.id is null then raise; end if;
  return admitted;
end
$$;

create or replace function public.claim_runtime_run(
  p_worker_id text,
  p_lease_expires_at timestamptz,
  p_organization_limit integer
)
returns table (
  id text, organization_id uuid, project_id uuid, actor_id uuid,
  agent_version_id text, state text, attempt integer, version integer, lease_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claimed public.runtime_runs%rowtype;
  claimed_lease_id uuid;
begin
  if p_worker_id is null or btrim(p_worker_id) = '' or p_organization_limit < 1
     or p_lease_expires_at <= clock_timestamp() then
    raise exception 'invalid runtime claim parameters' using errcode = '22023';
  end if;

  select r.* into claimed
  from public.runtime_runs r
  join public.runtime_dispatch_queue q on q.run_id = r.id
  where r.state in ('queued', 'retrying', 'reconciling')
    and q.available_at <= clock_timestamp()
    and (
      select count(*) from public.runtime_leases l
      where l.organization_id = r.organization_id
        and l.released_at is null and l.expires_at > clock_timestamp()
    ) < p_organization_limit
  order by q.available_at, r.created_at, r.id
  for update of r skip locked
  limit 1;

  if claimed.id is null then return; end if;

  -- Serialize only the short claim transaction for this tenant so two workers
  -- cannot both observe the final available concurrency slot.
  perform pg_advisory_xact_lock(hashtextextended(claimed.organization_id::text, 0));
  if (
    select count(*) from public.runtime_leases l
    where l.organization_id = claimed.organization_id
      and l.released_at is null and l.expires_at > clock_timestamp()
  ) >= p_organization_limit then return; end if;

  update public.runtime_runs r
  set state = 'leased', attempt = r.attempt + 1, version = r.version + 1, updated_at = clock_timestamp()
  where r.id = claimed.id
  returning r.* into claimed;

  insert into public.runtime_leases(run_id, organization_id, worker_id, attempt, expires_at)
  values (claimed.id, claimed.organization_id, p_worker_id, claimed.attempt, p_lease_expires_at)
  returning runtime_leases.id into claimed_lease_id;

  insert into public.runtime_run_attempts(run_id, attempt, worker_id)
  values (claimed.id, claimed.attempt, p_worker_id);
  delete from public.runtime_dispatch_queue where run_id = claimed.id;

  return query select claimed.id, claimed.organization_id, claimed.project_id, claimed.actor_id,
    claimed.agent_version_id, claimed.state, claimed.attempt, claimed.version, claimed_lease_id;
end
$$;

create or replace function public.notify_runtime_run(p_run_id text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare target public.runtime_runs%rowtype;
begin
  select * into target from public.runtime_runs where id = p_run_id;
  if target.id is null then raise exception 'runtime run not found' using errcode = 'P0002'; end if;
  insert into public.runtime_dispatch_queue(run_id, organization_id)
  values (target.id, target.organization_id)
  on conflict (run_id) do update set available_at = least(runtime_dispatch_queue.available_at, excluded.available_at), notified_at = clock_timestamp();
end
$$;

create or replace function public.append_runtime_event(
  p_run_id text, p_sequence bigint, p_event_type text, p_payload jsonb, p_occurred_at timestamptz
)
returns bigint language plpgsql security definer set search_path = pg_catalog, public as $$
declare target public.runtime_runs%rowtype; event_id bigint;
begin
  select * into target from public.runtime_runs where id = p_run_id for update;
  if target.id is null then raise exception 'runtime run not found' using errcode = 'P0002'; end if;
  if p_sequence <> target.next_event_sequence then raise exception 'runtime event sequence conflict' using errcode = '40001'; end if;
  insert into public.runtime_events(organization_id, project_id, run_id, sequence, event_type, payload, occurred_at, correlation_id)
  values (target.organization_id, target.project_id, target.id, p_sequence, p_event_type, coalesce(p_payload, '{}'::jsonb), p_occurred_at, target.correlation_id)
  returning id into event_id;
  update public.runtime_runs set next_event_sequence = next_event_sequence + 1, updated_at = clock_timestamp() where id = target.id;
  return event_id;
end
$$;

create or replace function public.transition_runtime_run(
  p_run_id text, p_expected_version integer, p_state text
)
returns public.runtime_runs language plpgsql security definer set search_path = pg_catalog, public as $$
declare target public.runtime_runs%rowtype; terminal boolean;
begin
  select * into target from public.runtime_runs where id = p_run_id for update;
  if target.id is null then raise exception 'runtime run not found' using errcode = 'P0002'; end if;
  if target.version <> p_expected_version then raise exception 'runtime run version conflict' using errcode = '40001'; end if;
  if target.state in ('completed', 'failed', 'canceled') then raise exception 'runtime run is terminal' using errcode = '22023'; end if;
  if p_state not in ('queued', 'leased', 'preparing', 'running', 'awaiting_approval', 'completing',
    'retrying', 'paused', 'stalled', 'reconciling', 'completed', 'failed', 'canceled') then
    raise exception 'invalid runtime state' using errcode = '22023';
  end if;
  if not (
    (target.state = 'accepted' and p_state in ('queued', 'canceled'))
    or (target.state = 'queued' and p_state in ('leased', 'canceled'))
    or (target.state = 'leased' and p_state in ('preparing', 'running', 'retrying', 'reconciling', 'failed', 'canceled'))
    or (target.state = 'preparing' and p_state in ('running', 'awaiting_approval', 'retrying', 'failed', 'canceled'))
    or (target.state = 'running' and p_state in ('awaiting_approval', 'completing', 'retrying', 'paused', 'stalled', 'failed', 'canceled'))
    or (target.state = 'awaiting_approval' and p_state in ('queued', 'canceled'))
    or (target.state = 'completing' and p_state in ('completed', 'failed', 'canceled'))
    or (target.state = 'retrying' and p_state in ('queued', 'leased', 'failed', 'canceled'))
    or (target.state = 'paused' and p_state in ('queued', 'retrying', 'canceled'))
    or (target.state = 'stalled' and p_state in ('reconciling', 'retrying', 'failed', 'canceled'))
    or (target.state = 'reconciling' and p_state in ('queued', 'retrying', 'failed', 'canceled'))
  ) then raise exception 'invalid runtime state transition' using errcode = '22023'; end if;
  terminal := p_state in ('completed', 'failed', 'canceled');
  insert into public.runtime_events(organization_id, project_id, run_id, sequence, event_type, payload, correlation_id)
  values (target.organization_id, target.project_id, target.id, target.next_event_sequence, 'run.state_changed',
    jsonb_build_object('from', target.state, 'to', p_state, 'attempt', target.attempt), target.correlation_id);
  update public.runtime_runs set state = p_state, version = version + 1,
    next_event_sequence = next_event_sequence + 1, updated_at = clock_timestamp(),
    terminal_at = case when terminal then clock_timestamp() else null end,
    terminal_reason = case when terminal then coalesce(terminal_reason, 'worker_transition') else null end
  where id = target.id returning * into target;
  return target;
end
$$;

create or replace function public.commit_runtime_output(p_output jsonb, p_event jsonb)
returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare target public.runtime_runs%rowtype; output_id text; event_sequence bigint;
begin
  output_id := p_output ->> 'output_id';
  event_sequence := (p_event ->> 'sequence')::bigint;
  select * into target from public.runtime_runs where id = p_output ->> 'run_id' for update;
  if target.id is null then raise exception 'runtime run not found' using errcode = 'P0002'; end if;
  if event_sequence <> target.next_event_sequence then raise exception 'runtime event sequence conflict' using errcode = '40001'; end if;
  insert into public.runtime_outputs(id, organization_id, project_id, run_id, uri, digest, media_type, byte_size)
  values (output_id, target.organization_id, target.project_id, target.id, p_output ->> 'uri', p_output ->> 'digest',
    p_output ->> 'media_type', (p_output ->> 'byte_size')::bigint)
  on conflict (id) do nothing;
  insert into public.runtime_events(organization_id, project_id, run_id, sequence, event_type, payload, occurred_at, correlation_id)
  values (target.organization_id, target.project_id, target.id, event_sequence, p_event ->> 'event_type',
    coalesce(p_event -> 'payload', '{}'::jsonb), (p_event ->> 'occurred_at')::timestamptz, target.correlation_id);
  update public.runtime_runs set next_event_sequence = next_event_sequence + 1, updated_at = clock_timestamp() where id = target.id;
  return output_id;
end
$$;

create or replace function public.finalize_runtime_cost(p_cost jsonb)
returns bigint language plpgsql security definer set search_path = pg_catalog, public as $$
declare target public.runtime_runs%rowtype; ledger_id bigint; existing public.runtime_cost_ledger%rowtype;
begin
  select * into target from public.runtime_runs where id = p_cost ->> 'run_id';
  if target.id is null then raise exception 'runtime run not found' using errcode = 'P0002'; end if;
  select * into existing from public.runtime_cost_ledger
    where run_id = target.id and attempt = (p_cost ->> 'attempt')::integer
      and provider = p_cost ->> 'provider' and provider_usage_id = p_cost ->> 'provider_usage_id';
  if existing.id is not null then
    if existing.amount_usd <> (p_cost ->> 'amount_usd')::numeric or existing.outcome <> p_cost ->> 'outcome' then
      raise exception 'provider usage cost conflict' using errcode = '23505';
    end if;
    return existing.id;
  end if;
  insert into public.runtime_cost_ledger(organization_id, project_id, run_id, attempt, provider, category,
    amount_usd, provider_usage_id, rate_version, outcome, metadata)
  values (target.organization_id, target.project_id, target.id, (p_cost ->> 'attempt')::integer,
    p_cost ->> 'provider', p_cost ->> 'category', (p_cost ->> 'amount_usd')::numeric,
    p_cost ->> 'provider_usage_id', p_cost ->> 'rate_version', p_cost ->> 'outcome', coalesce(p_cost -> 'metadata', '{}'::jsonb))
  returning id into ledger_id;
  return ledger_id;
end
$$;

create or replace function public.reconcile_expired_runtime_leases(p_now timestamptz)
returns table(run_id text) language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  return query
  with expired as (
    update public.runtime_leases l set released_at = p_now
    where l.released_at is null and l.expires_at <= p_now
    returning l.run_id, l.attempt
  ), requeued as (
    update public.runtime_runs r set state = 'reconciling', version = r.version + 1, updated_at = p_now
    from expired e where r.id = e.run_id and r.state not in ('completed', 'failed', 'canceled')
    returning r.id, r.organization_id
  ), queued as (
    insert into public.runtime_dispatch_queue(run_id, organization_id)
    select id, organization_id from requeued on conflict (run_id) do update set available_at = excluded.available_at
  ) select id from requeued;
end
$$;

create or replace function public.request_runtime_cancel(p_run_id text, p_actor_id uuid)
returns public.runtime_runs language plpgsql security definer set search_path = pg_catalog, public as $$
declare target public.runtime_runs%rowtype;
begin
  select * into target from public.runtime_runs where id = p_run_id for update;
  if target.id is null then raise exception 'runtime run not found' using errcode = 'P0002'; end if;
  if target.actor_id <> p_actor_id then raise exception 'runtime actor mismatch' using errcode = '42501'; end if;
  if target.state in ('completed', 'failed', 'canceled') then return target; end if;
  if target.cancel_requested_at is not null then return target; end if;
  insert into public.runtime_events(organization_id, project_id, run_id, sequence, event_type, actor_type, actor_id, payload, correlation_id)
  values (target.organization_id, target.project_id, target.id, target.next_event_sequence,
    'run.cancel_requested', 'user', p_actor_id::text, '{}'::jsonb, target.correlation_id);
  update public.runtime_runs set cancel_requested_at = clock_timestamp(), updated_at = clock_timestamp(),
    state = case when state in ('accepted', 'queued', 'retrying', 'paused', 'reconciling') then 'canceled' else state end,
    terminal_at = case when state in ('accepted', 'queued', 'retrying', 'paused', 'reconciling') then clock_timestamp() else terminal_at end,
    terminal_reason = case when state in ('accepted', 'queued', 'retrying', 'paused', 'reconciling') then 'actor_requested' else terminal_reason end,
    version = version + 1, next_event_sequence = next_event_sequence + 1
  where id = target.id returning * into target;
  delete from public.runtime_dispatch_queue where run_id = target.id and target.state = 'canceled';
  return target;
end
$$;

create or replace function public.request_runtime_approval(
  p_approval_id text, p_run_id text, p_sequence bigint, p_operation text,
  p_argument_summary jsonb, p_expires_at timestamptz default null
)
returns public.runtime_runs language plpgsql security definer set search_path = pg_catalog, public as $$
declare target public.runtime_runs%rowtype;
begin
  select * into target from public.runtime_runs where id = p_run_id for update;
  if target.id is null then raise exception 'runtime run not found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.runtime_approvals where id = p_approval_id) then
    if exists (select 1 from public.runtime_approvals where id = p_approval_id and run_id = target.id) then
      return target;
    end if;
    raise exception 'runtime approval id conflict' using errcode = '23505';
  end if;
  if p_sequence <> target.next_event_sequence then raise exception 'runtime event sequence conflict' using errcode = '40001'; end if;
  if target.state not in ('preparing', 'running') then raise exception 'run cannot request approval' using errcode = '22023'; end if;
  insert into public.runtime_approvals(id, organization_id, project_id, run_id, sequence, operation, argument_summary, expires_at)
  values (p_approval_id, target.organization_id, target.project_id, target.id, p_sequence, p_operation,
    coalesce(p_argument_summary, '{}'::jsonb), p_expires_at);
  insert into public.runtime_events(organization_id, project_id, run_id, sequence, event_type, payload, correlation_id)
  values (target.organization_id, target.project_id, target.id, p_sequence, 'approval.requested',
    jsonb_build_object('approval_id', p_approval_id, 'operation', p_operation, 'expires_at', p_expires_at), target.correlation_id);
  update public.runtime_runs set state = 'awaiting_approval', version = version + 1,
    next_event_sequence = next_event_sequence + 1, updated_at = clock_timestamp()
  where id = target.id returning * into target;
  return target;
end
$$;

create or replace function public.resolve_runtime_approval(
  p_approval_id text, p_organization_id uuid, p_actor_id uuid, p_decision text, p_reason text default null
)
returns public.runtime_runs language plpgsql security definer set search_path = pg_catalog, public as $$
declare approval public.runtime_approvals%rowtype; target public.runtime_runs%rowtype;
begin
  if p_decision not in ('approved', 'denied') then raise exception 'invalid approval decision' using errcode = '22023'; end if;
  select * into approval from public.runtime_approvals where id = p_approval_id for update;
  if approval.id is null then raise exception 'runtime approval not found' using errcode = 'P0002'; end if;
  if approval.organization_id <> p_organization_id then raise exception 'runtime approval not found' using errcode = 'P0002'; end if;
  if approval.state <> 'pending' then
    select * into target from public.runtime_runs where id = approval.run_id;
    return target;
  end if;
  if not exists (
    select 1 from public.organization_memberships m where m.organization_id = approval.organization_id
      and m.profile_id = p_actor_id and m.state = 'active' and m.revoked_at is null
  ) or not exists (
    select 1 from public.projects p
    where p.id = approval.project_id and p.organization_id = approval.organization_id
      and (
        p.visibility = 'organization' or p.created_by = p_actor_id
        or exists (select 1 from public.project_memberships pm where pm.project_id = p.id and pm.profile_id = p_actor_id)
        or (p.team_id is not null and exists (
          select 1 from public.team_memberships tm where tm.team_id = p.team_id and tm.profile_id = p_actor_id
        ))
      )
  ) then
    raise exception 'runtime approval access denied' using errcode = '42501';
  end if;
  update public.runtime_approvals set state = p_decision, resolved_at = clock_timestamp(),
    resolved_by = p_actor_id, resolution_reason = p_reason where id = approval.id;
  select * into target from public.runtime_runs where id = approval.run_id for update;
  insert into public.runtime_events(organization_id, project_id, run_id, sequence, event_type, actor_type, actor_id, payload, correlation_id)
  values (target.organization_id, target.project_id, target.id, target.next_event_sequence,
    'approval.resolved', 'user', p_actor_id::text,
    jsonb_build_object('approval_id', approval.id, 'decision', p_decision, 'reason', p_reason), target.correlation_id);
  update public.runtime_runs set next_event_sequence = next_event_sequence + 1, updated_at = clock_timestamp()
    where id = target.id returning * into target;
  if target.state = 'awaiting_approval' then
    update public.runtime_runs set state = case when p_decision = 'approved' then 'queued' else 'canceled' end,
      terminal_at = case when p_decision = 'denied' then clock_timestamp() else null end,
      terminal_reason = case when p_decision = 'denied' then 'approval_denied' else null end,
      version = version + 1, updated_at = clock_timestamp()
    where id = target.id returning * into target;
    if p_decision = 'approved' then
      insert into public.runtime_dispatch_queue(run_id, organization_id) values (target.id, target.organization_id)
      on conflict (run_id) do update set available_at = excluded.available_at, notified_at = excluded.notified_at;
    end if;
  end if;
  return target;
end
$$;

create or replace function public.recheck_runtime_gateway_policy(
  p_run_id text, p_organization_id uuid, p_project_id uuid, p_actor_id uuid,
  p_agent_version_id text, p_operation text, p_connection_id text default null,
  p_approval_id text default null, p_idempotency_key text default null
)
returns table(allowed boolean, policy_version text, reason text)
language sql security definer set search_path = pg_catalog, public as $$
  select
    case
      when r.id is null then false
      when m.profile_id is null then false
      when r.state in ('completed', 'failed', 'canceled') then false
      when p_operation not in ('model.invoke', 'tool.read', 'output.upload', 'event.append') then false
      when p_approval_id is not null and a.state is distinct from 'approved' then false
      else true
    end,
    'runtime-policy-v1',
    case
      when r.id is null then 'run binding mismatch'
      when m.profile_id is null then 'membership inactive or revoked'
      when r.state in ('completed', 'failed', 'canceled') then 'run is terminal'
      when p_operation not in ('model.invoke', 'tool.read', 'output.upload', 'event.append') then 'operation denied by default'
      when p_approval_id is not null and a.state is distinct from 'approved' then 'approval is not active'
      else 'allowed'
    end
  from (select 1) seed
  left join public.runtime_runs r on r.id = p_run_id and r.organization_id = p_organization_id
    and r.project_id = p_project_id and r.actor_id = p_actor_id and r.agent_version_id = p_agent_version_id
  left join public.organization_memberships m on m.organization_id = p_organization_id
    and m.profile_id = p_actor_id and m.state = 'active' and m.revoked_at is null
  left join public.runtime_approvals a on a.id = p_approval_id and a.run_id = p_run_id;
$$;

revoke all on function public.claim_runtime_run(text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.admit_runtime_run(text, uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.notify_runtime_run(text) from public, anon, authenticated;
revoke all on function public.append_runtime_event(text, bigint, text, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.transition_runtime_run(text, integer, text) from public, anon, authenticated;
revoke all on function public.commit_runtime_output(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.finalize_runtime_cost(jsonb) from public, anon, authenticated;
revoke all on function public.reconcile_expired_runtime_leases(timestamptz) from public, anon, authenticated;
revoke all on function public.request_runtime_cancel(text, uuid) from public, anon, authenticated;
revoke all on function public.request_runtime_approval(text, text, bigint, text, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.resolve_runtime_approval(text, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.recheck_runtime_gateway_policy(text, uuid, uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.admit_runtime_run(text, uuid, uuid, uuid, text, text, text),
  public.claim_runtime_run(text, timestamptz, integer), public.notify_runtime_run(text),
  public.append_runtime_event(text, bigint, text, jsonb, timestamptz), public.commit_runtime_output(jsonb, jsonb),
  public.transition_runtime_run(text, integer, text),
  public.finalize_runtime_cost(jsonb), public.reconcile_expired_runtime_leases(timestamptz),
  public.request_runtime_cancel(text, uuid), public.resolve_runtime_approval(text, uuid, uuid, text, text),
  public.request_runtime_approval(text, text, bigint, text, jsonb, timestamptz),
  public.recheck_runtime_gateway_policy(text, uuid, uuid, uuid, text, text, text, text, text) to service_role;

comment on table public.runtime_events is 'Append-only authoritative runtime event log; writes only through atomic service RPCs.';
comment on table public.runtime_cost_ledger is 'Immutable provider actual-cost ledger retained for every outcome.';
comment on table public.runtime_outputs is 'Authoritative metadata for immutable Storage objects under {organization}/{project}/runs/{run}/...';
comment on function public.claim_runtime_run(text, timestamptz, integer) is 'Short SKIP LOCKED queue claim; service-role only.';

commit;
