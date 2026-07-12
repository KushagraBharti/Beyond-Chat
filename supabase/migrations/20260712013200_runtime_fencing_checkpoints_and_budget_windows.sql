begin;

-- `supabase migration new runtime_fencing_checkpoints_and_budget_windows` was attempted
-- first with CLI 2.109.0 and failed on this OneDrive checkout with
-- LegacyMigrationNewWriteError/AlreadyExists for supabase/migrations. The repository
-- owner explicitly authorized this next, fixed timestamp after 20260712013100.

create table public.runtime_budget_accounts (
  id text primary key check (length(id) between 8 and 255),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_key text not null check (length(account_key) between 1 and 100),
  created_at timestamptz not null default clock_timestamp(),
  unique (organization_id, account_key)
);

create table public.runtime_budget_windows (
  id text primary key check (length(id) between 8 and 255),
  account_id text not null references public.runtime_budget_accounts(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  hard_limit_usd numeric(20,10) not null check (hard_limit_usd > 0),
  created_at timestamptz not null default clock_timestamp(),
  unique (account_id, starts_at, ends_at),
  check (ends_at > starts_at)
);

alter table public.runtime_usage_reservations
  add column budget_account_id text references public.runtime_budget_accounts(id) on delete restrict,
  add column budget_window_id text references public.runtime_budget_windows(id) on delete restrict;

create table public.runtime_event_idempotency (
  run_id text not null references public.runtime_runs(id) on delete cascade,
  attempt integer not null check (attempt > 0),
  idempotency_key text not null check (length(idempotency_key) between 8 and 255),
  event_id bigint not null references public.runtime_events(id) on delete cascade,
  event_type text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  primary key (run_id, idempotency_key),
  unique (event_id)
);

create table public.runtime_checkpoints (
  id text primary key check (length(id) between 8 and 255),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id text not null references public.runtime_runs(id) on delete cascade,
  attempt integer not null check (attempt > 0),
  lease_id uuid not null references public.runtime_leases(id) on delete restrict,
  event_sequence bigint not null check (event_sequence >= 0),
  logical_state jsonb not null check (jsonb_typeof(logical_state) = 'object'),
  working_set jsonb not null check (jsonb_typeof(working_set) = 'object'),
  runtime_image_digest text not null,
  state_digest text not null check (state_digest ~ '^sha256:[0-9a-f]{64}$'),
  byte_size bigint not null check (byte_size >= 0),
  created_at timestamptz not null default clock_timestamp(),
  unique (run_id, attempt, state_digest)
);

create index runtime_budget_windows_account_time_idx on public.runtime_budget_windows(account_id, starts_at, ends_at);
create index runtime_usage_reservations_window_active_idx on public.runtime_usage_reservations(budget_window_id, expires_at) where state = 'reserved';
create index runtime_checkpoints_run_created_idx on public.runtime_checkpoints(run_id, created_at desc);

alter table public.runtime_budget_accounts enable row level security;
alter table public.runtime_budget_windows enable row level security;
alter table public.runtime_event_idempotency enable row level security;
alter table public.runtime_checkpoints enable row level security;
revoke all on public.runtime_budget_accounts, public.runtime_budget_windows, public.runtime_event_idempotency, public.runtime_checkpoints from public, anon, authenticated;
grant select, insert, update, delete on public.runtime_budget_accounts, public.runtime_budget_windows, public.runtime_event_idempotency, public.runtime_checkpoints to service_role;

create or replace function public.heartbeat_runtime_lease(
  p_run_id text, p_attempt integer, p_lease_id uuid, p_worker_id text, p_lease_expires_at timestamptz
) returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if p_lease_expires_at <= clock_timestamp() then raise exception 'invalid lease expiry' using errcode = '22023'; end if;
  update public.runtime_leases l set heartbeat_at = clock_timestamp(), expires_at = p_lease_expires_at
  where l.id = p_lease_id and l.run_id = p_run_id and l.attempt = p_attempt
    and l.worker_id = p_worker_id and l.released_at is null and l.expires_at > clock_timestamp()
    and exists (select 1 from public.runtime_runs r where r.id = p_run_id and r.attempt = p_attempt and r.state not in ('completed','failed','canceled'));
  if not found then raise exception 'stale runtime lease' using errcode = '40001'; end if;
  return true;
end $$;

create or replace function public.release_runtime_lease(
  p_run_id text, p_attempt integer, p_lease_id uuid, p_worker_id text, p_reason text
) returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  update public.runtime_leases set released_at = clock_timestamp()
  where id = p_lease_id and run_id = p_run_id and attempt = p_attempt and worker_id = p_worker_id
    and released_at is null and expires_at > clock_timestamp();
  if not found then raise exception 'stale runtime lease' using errcode = '40001'; end if;
  return true;
end $$;

create or replace function public.append_runtime_event_fenced(
  p_run_id text, p_attempt integer, p_lease_id uuid, p_worker_id text,
  p_idempotency_key text, p_event_type text, p_payload jsonb, p_occurred_at timestamptz
) returns table(event_id bigint, sequence bigint) language plpgsql security definer set search_path = pg_catalog, public as $$
declare target public.runtime_runs%rowtype; prior public.runtime_event_idempotency%rowtype; inserted_id bigint; allocated bigint;
begin
  select * into target from public.runtime_runs where id = p_run_id for update;
  if target.id is null then raise exception 'runtime run not found' using errcode = 'P0002'; end if;
  select * into prior from public.runtime_event_idempotency where run_id = p_run_id and idempotency_key = p_idempotency_key;
  if prior.run_id is not null then
    if prior.attempt <> p_attempt or prior.event_type <> p_event_type or prior.payload <> coalesce(p_payload,'{}'::jsonb) then
      raise exception 'runtime event idempotency conflict' using errcode = '23505';
    end if;
    return query select e.id, e.sequence from public.runtime_events e where e.id = prior.event_id; return;
  end if;
  if target.attempt <> p_attempt or target.state in ('completed','failed','canceled') or not exists (
    select 1 from public.runtime_leases l where l.id=p_lease_id and l.run_id=p_run_id and l.attempt=p_attempt
      and l.worker_id=p_worker_id and l.released_at is null and l.expires_at > clock_timestamp()
  ) then raise exception 'stale runtime worker' using errcode = '40001'; end if;
  allocated := target.next_event_sequence;
  insert into public.runtime_events(organization_id,project_id,run_id,sequence,event_type,actor_type,payload,occurred_at,correlation_id)
  values(target.organization_id,target.project_id,target.id,allocated,p_event_type,'worker',coalesce(p_payload,'{}'::jsonb),p_occurred_at,target.correlation_id)
  returning id into inserted_id;
  insert into public.runtime_event_idempotency values(p_run_id,p_attempt,p_idempotency_key,inserted_id,p_event_type,coalesce(p_payload,'{}'::jsonb));
  update public.runtime_runs set next_event_sequence=next_event_sequence+1,updated_at=clock_timestamp() where id=p_run_id;
  return query select inserted_id, allocated;
end $$;

create or replace function public.write_runtime_checkpoint(
  p_checkpoint_id text, p_run_id text, p_attempt integer, p_lease_id uuid, p_worker_id text,
  p_logical_state jsonb, p_working_set jsonb, p_runtime_image_digest text, p_state_digest text, p_byte_size bigint
) returns public.runtime_checkpoints language plpgsql security definer set search_path = pg_catalog, public as $$
declare target public.runtime_runs%rowtype; saved public.runtime_checkpoints%rowtype;
begin
  select * into target from public.runtime_runs where id=p_run_id for update;
  if target.attempt<>p_attempt or not exists(select 1 from public.runtime_leases l where l.id=p_lease_id and l.run_id=p_run_id and l.attempt=p_attempt and l.worker_id=p_worker_id and l.released_at is null and l.expires_at>clock_timestamp()) then
    raise exception 'stale runtime worker' using errcode='40001'; end if;
  insert into public.runtime_checkpoints(id,organization_id,project_id,run_id,attempt,lease_id,event_sequence,logical_state,working_set,runtime_image_digest,state_digest,byte_size)
  values(p_checkpoint_id,target.organization_id,target.project_id,p_run_id,p_attempt,p_lease_id,target.next_event_sequence-1,coalesce(p_logical_state,'{}'),coalesce(p_working_set,'{}'),p_runtime_image_digest,p_state_digest,p_byte_size)
  on conflict (id) do nothing;
  select * into saved from public.runtime_checkpoints where id=p_checkpoint_id;
  if saved.run_id<>p_run_id or saved.attempt<>p_attempt or saved.state_digest<>p_state_digest then raise exception 'checkpoint idempotency conflict' using errcode='23505'; end if;
  return saved;
end $$;

create or replace function public.suspend_runtime_for_approval(
  p_approval_id text, p_checkpoint_id text, p_run_id text, p_attempt integer, p_lease_id uuid, p_worker_id text,
  p_operation text, p_argument_summary jsonb, p_expires_at timestamptz,
  p_logical_state jsonb, p_working_set jsonb, p_runtime_image_digest text, p_state_digest text, p_byte_size bigint
) returns public.runtime_runs language plpgsql security definer set search_path = pg_catalog, public as $$
declare target public.runtime_runs%rowtype; seq bigint;
begin
  select * into target from public.runtime_runs where id=p_run_id for update;
  if target.attempt<>p_attempt or target.state not in ('preparing','running') or not exists(select 1 from public.runtime_leases l where l.id=p_lease_id and l.run_id=p_run_id and l.attempt=p_attempt and l.worker_id=p_worker_id and l.released_at is null and l.expires_at>clock_timestamp()) then raise exception 'stale runtime worker' using errcode='40001'; end if;
  perform public.write_runtime_checkpoint(p_checkpoint_id,p_run_id,p_attempt,p_lease_id,p_worker_id,p_logical_state,p_working_set,p_runtime_image_digest,p_state_digest,p_byte_size);
  seq:=target.next_event_sequence;
  insert into public.runtime_approvals(id,organization_id,project_id,run_id,sequence,operation,argument_summary,expires_at) values(p_approval_id,target.organization_id,target.project_id,p_run_id,seq,p_operation,coalesce(p_argument_summary,'{}'),p_expires_at);
  insert into public.runtime_events(organization_id,project_id,run_id,sequence,event_type,actor_type,payload,correlation_id) values(target.organization_id,target.project_id,p_run_id,seq,'approval.requested','worker',jsonb_build_object('approval_id',p_approval_id,'checkpoint_id',p_checkpoint_id,'operation',p_operation),target.correlation_id);
  update public.runtime_run_attempts set finished_at=clock_timestamp(),outcome='suspended_for_approval' where run_id=p_run_id and attempt=p_attempt and finished_at is null;
  update public.runtime_leases set released_at=clock_timestamp() where id=p_lease_id;
  update public.runtime_usage_reservations set state='released',released_at=clock_timestamp(),release_reason='approval_suspension' where run_id=p_run_id and attempt=p_attempt and state='reserved';
  delete from public.runtime_dispatch_queue where run_id=p_run_id;
  update public.runtime_runs set state='awaiting_approval',version=version+1,next_event_sequence=next_event_sequence+1,updated_at=clock_timestamp() where id=p_run_id returning * into target;
  return target;
end $$;

create or replace function public.complete_runtime_success(
  p_run_id text, p_attempt integer, p_lease_id uuid, p_worker_id text,
  p_output jsonb, p_costs jsonb, p_reservation_id text
) returns public.runtime_runs language plpgsql security definer set search_path = pg_catalog, public as $$
declare target public.runtime_runs%rowtype; item jsonb; seq bigint; existing_output public.runtime_outputs%rowtype;
begin
  select * into target from public.runtime_runs where id=p_run_id for update;
  if target.attempt<>p_attempt or target.state not in ('running','completing') or not exists(select 1 from public.runtime_leases l where l.id=p_lease_id and l.run_id=p_run_id and l.attempt=p_attempt and l.worker_id=p_worker_id and l.released_at is null and l.expires_at>clock_timestamp()) then raise exception 'stale runtime worker' using errcode='40001'; end if;
  if jsonb_typeof(coalesce(p_costs,'[]'))<>'array' then raise exception 'costs must be an array' using errcode='22023'; end if;
  select * into existing_output from public.runtime_outputs where id=p_output->>'output_id' for update;
  if existing_output.id is not null and (existing_output.organization_id<>target.organization_id or existing_output.project_id<>target.project_id or existing_output.run_id<>p_run_id or existing_output.uri<>p_output->>'uri' or existing_output.digest<>p_output->>'digest' or existing_output.media_type<>p_output->>'media_type' or existing_output.byte_size<>(p_output->>'byte_size')::bigint) then raise exception 'runtime output idempotency conflict' using errcode='23505'; end if;
  if existing_output.id is null then insert into public.runtime_outputs(id,organization_id,project_id,run_id,uri,digest,media_type,byte_size) values(p_output->>'output_id',target.organization_id,target.project_id,p_run_id,p_output->>'uri',p_output->>'digest',p_output->>'media_type',(p_output->>'byte_size')::bigint); end if;
  for item in select * from jsonb_array_elements(coalesce(p_costs,'[]')) loop
    insert into public.runtime_cost_ledger(organization_id,project_id,run_id,attempt,provider,category,amount_usd,provider_usage_id,rate_version,outcome,metadata)
    values(target.organization_id,target.project_id,p_run_id,p_attempt,item->>'provider',item->>'category',(item->>'amount_usd')::numeric,item->>'provider_usage_id',item->>'rate_version',item->>'outcome',coalesce(item->'metadata','{}')) on conflict(run_id,attempt,provider,provider_usage_id) do nothing;
  end loop;
  if p_reservation_id is not null then update public.runtime_usage_reservations set state='released',released_at=clock_timestamp(),release_reason='completed' where id=p_reservation_id and run_id=p_run_id and attempt=p_attempt and state='reserved'; if not found then raise exception 'active reservation not found' using errcode='40001'; end if; end if;
  seq:=target.next_event_sequence;
  insert into public.runtime_events(organization_id,project_id,run_id,sequence,event_type,actor_type,payload,correlation_id) values(target.organization_id,target.project_id,p_run_id,seq,'run.completed','worker',jsonb_build_object('attempt',p_attempt,'lease_id',p_lease_id,'output_id',p_output->>'output_id'),target.correlation_id);
  update public.runtime_run_attempts set finished_at=clock_timestamp(),outcome='completed' where run_id=p_run_id and attempt=p_attempt and finished_at is null; if not found then raise exception 'active attempt not found' using errcode='40001'; end if;
  update public.runtime_leases set released_at=clock_timestamp() where id=p_lease_id;
  delete from public.runtime_dispatch_queue where run_id=p_run_id;
  update public.runtime_runs set state='completed',version=version+1,next_event_sequence=next_event_sequence+1,updated_at=clock_timestamp(),terminal_at=clock_timestamp(),terminal_reason='success' where id=p_run_id returning * into target;
  return target;
end $$;

create or replace function public.reserve_runtime_usage_window(
  p_reservation_id text,p_run_id text,p_attempt integer,p_budget_account_id text,p_budget_window_id text,p_amount_usd numeric,p_expires_at timestamptz,p_idempotency_key text
) returns public.runtime_usage_reservations language plpgsql security definer set search_path=pg_catalog,public as $$
declare target public.runtime_runs%rowtype; budget_window public.runtime_budget_windows%rowtype; reservation public.runtime_usage_reservations%rowtype; used numeric(20,10); held numeric(20,10);
begin
  select * into target from public.runtime_runs where id=p_run_id; select * into budget_window from public.runtime_budget_windows where id=p_budget_window_id and account_id=p_budget_account_id for update;
  if target.id is null or budget_window.id is null or target.organization_id<>(select organization_id from public.runtime_budget_accounts where id=p_budget_account_id) or clock_timestamp() not between budget_window.starts_at and budget_window.ends_at or p_expires_at>budget_window.ends_at then raise exception 'invalid budget window binding' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_budget_window_id,20260712013200));
  select * into reservation from public.runtime_usage_reservations where organization_id=target.organization_id and idempotency_key=p_idempotency_key; if reservation.id is not null then return reservation; end if;
  select coalesce(sum(c.amount_usd),0) into used from public.runtime_cost_ledger c where c.organization_id=target.organization_id and c.occurred_at>=budget_window.starts_at and c.occurred_at<budget_window.ends_at;
  select coalesce(sum(r.amount_usd),0) into held from public.runtime_usage_reservations r where r.budget_window_id=budget_window.id and r.state='reserved' and r.expires_at>clock_timestamp();
  if used+held+p_amount_usd>budget_window.hard_limit_usd then raise exception 'runtime budget window exceeded' using errcode='P0001'; end if;
  insert into public.runtime_usage_reservations(id,organization_id,project_id,run_id,attempt,amount_usd,hard_limit_usd,idempotency_key,expires_at,budget_account_id,budget_window_id) values(p_reservation_id,target.organization_id,target.project_id,p_run_id,p_attempt,p_amount_usd,budget_window.hard_limit_usd,p_idempotency_key,p_expires_at,p_budget_account_id,p_budget_window_id) returning * into reservation;
  return reservation;
end $$;

revoke all on function public.heartbeat_runtime_lease(text,integer,uuid,text,timestamptz), public.release_runtime_lease(text,integer,uuid,text,text), public.append_runtime_event_fenced(text,integer,uuid,text,text,text,jsonb,timestamptz), public.write_runtime_checkpoint(text,text,integer,uuid,text,jsonb,jsonb,text,text,bigint), public.suspend_runtime_for_approval(text,text,text,integer,uuid,text,text,jsonb,timestamptz,jsonb,jsonb,text,text,bigint), public.complete_runtime_success(text,integer,uuid,text,jsonb,jsonb,text), public.reserve_runtime_usage_window(text,text,integer,text,text,numeric,timestamptz,text) from public,anon,authenticated;
grant execute on function public.heartbeat_runtime_lease(text,integer,uuid,text,timestamptz), public.release_runtime_lease(text,integer,uuid,text,text), public.append_runtime_event_fenced(text,integer,uuid,text,text,text,jsonb,timestamptz), public.write_runtime_checkpoint(text,text,integer,uuid,text,jsonb,jsonb,text,text,bigint), public.suspend_runtime_for_approval(text,text,text,integer,uuid,text,text,jsonb,timestamptz,jsonb,jsonb,text,text,bigint), public.complete_runtime_success(text,integer,uuid,text,jsonb,jsonb,text), public.reserve_runtime_usage_window(text,text,integer,text,text,numeric,timestamptz,text) to service_role;

commit;
