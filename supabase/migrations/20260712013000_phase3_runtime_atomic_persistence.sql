begin;

create table public.runtime_usage_reservations (
  id text primary key check (length(id) between 8 and 255),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id text not null references public.runtime_runs(id) on delete cascade,
  attempt integer not null check (attempt >= 0),
  amount_usd numeric(20, 10) not null check (amount_usd > 0),
  hard_limit_usd numeric(20, 10) not null check (hard_limit_usd > 0),
  idempotency_key text not null check (length(idempotency_key) between 8 and 255),
  state text not null default 'reserved' check (state in ('reserved', 'released', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  released_at timestamptz,
  release_reason text,
  unique (organization_id, idempotency_key),
  check (expires_at > created_at),
  check ((state = 'reserved') = (released_at is null)),
  check (release_reason is null or length(release_reason) between 1 and 255)
);

create index runtime_usage_reservations_org_active_idx
  on public.runtime_usage_reservations(organization_id, expires_at)
  where state = 'reserved';
create index runtime_usage_reservations_project_idx
  on public.runtime_usage_reservations(project_id);
create index runtime_usage_reservations_run_idx
  on public.runtime_usage_reservations(run_id);

alter table public.runtime_usage_reservations enable row level security;
revoke all on public.runtime_usage_reservations from public, anon, authenticated;
grant select, insert, update, delete on public.runtime_usage_reservations to service_role;

create or replace function public.complete_runtime_cancellation(
  p_run_id text,
  p_attempt integer,
  p_lease_id uuid,
  p_propagation jsonb
)
returns public.runtime_runs
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target public.runtime_runs%rowtype;
  active_lease public.runtime_leases%rowtype;
begin
  if p_attempt < 1 or p_lease_id is null or jsonb_typeof(coalesce(p_propagation, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid runtime cancellation completion parameters' using errcode = '22023';
  end if;

  select * into target from public.runtime_runs where id = p_run_id for update;
  if target.id is null then raise exception 'runtime run not found' using errcode = 'P0002'; end if;
  if target.state = 'canceled' then return target; end if;
  if target.state in ('completed', 'failed') then
    raise exception 'runtime run is terminal' using errcode = '22023';
  end if;
  if target.cancel_requested_at is null then
    raise exception 'runtime cancellation was not requested' using errcode = '22023';
  end if;
  if target.attempt <> p_attempt then
    raise exception 'runtime attempt mismatch' using errcode = '40001';
  end if;

  select * into active_lease from public.runtime_leases
    where id = p_lease_id and run_id = target.id and attempt = p_attempt for update;
  if active_lease.id is null then raise exception 'runtime lease not found' using errcode = 'P0002'; end if;
  if active_lease.released_at is not null then
    raise exception 'runtime lease already released before cancellation completion' using errcode = '40001';
  end if;

  update public.runtime_run_attempts
  set finished_at = clock_timestamp(), outcome = 'canceled',
      failure_class = null,
      failure_detail = jsonb_build_object('cancellation_propagation', coalesce(p_propagation, '{}'::jsonb))
  where run_id = target.id and attempt = p_attempt and finished_at is null;
  if not found then raise exception 'active runtime attempt not found' using errcode = 'P0002'; end if;

  update public.runtime_leases set released_at = clock_timestamp() where id = active_lease.id;
  delete from public.runtime_dispatch_queue where run_id = target.id;
  insert into public.runtime_events(
    organization_id, project_id, run_id, sequence, event_type, actor_type, payload, correlation_id
  ) values (
    target.organization_id, target.project_id, target.id, target.next_event_sequence,
    'run.canceled', 'worker',
    jsonb_build_object('attempt', p_attempt, 'lease_id', p_lease_id, 'propagation', coalesce(p_propagation, '{}'::jsonb)),
    target.correlation_id
  );
  update public.runtime_runs
  set state = 'canceled', version = version + 1,
      next_event_sequence = next_event_sequence + 1, updated_at = clock_timestamp(),
      terminal_at = clock_timestamp(), terminal_reason = 'cancellation_propagated'
  where id = target.id returning * into target;
  return target;
end
$$;

create or replace function public.reserve_runtime_usage(
  p_reservation_id text,
  p_run_id text,
  p_attempt integer,
  p_amount_usd numeric,
  p_hard_limit_usd numeric,
  p_expires_at timestamptz,
  p_idempotency_key text
)
returns public.runtime_usage_reservations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target public.runtime_runs%rowtype;
  reservation public.runtime_usage_reservations%rowtype;
  actual_total numeric(20, 10);
  reserved_total numeric(20, 10);
begin
  if length(p_reservation_id) not between 8 and 255
     or length(p_idempotency_key) not between 8 and 255
     or p_attempt < 0 or p_amount_usd <= 0 or p_hard_limit_usd <= 0
     or p_amount_usd > p_hard_limit_usd or p_expires_at <= clock_timestamp() then
    raise exception 'invalid runtime usage reservation parameters' using errcode = '22023';
  end if;

  select * into target from public.runtime_runs where id = p_run_id;
  if target.id is null then raise exception 'runtime run not found' using errcode = 'P0002'; end if;
  if target.state in ('completed', 'failed', 'canceled') then
    raise exception 'runtime run is terminal' using errcode = '22023';
  end if;

  -- A distinct lock namespace avoids coupling usage admission to queue claims.
  perform pg_advisory_xact_lock(hashtextextended(target.organization_id::text, 20260712013000));

  update public.runtime_usage_reservations
  set state = 'expired', released_at = clock_timestamp(), release_reason = 'expired'
  where organization_id = target.organization_id and state = 'reserved' and expires_at <= clock_timestamp();

  select * into reservation from public.runtime_usage_reservations
    where organization_id = target.organization_id and idempotency_key = p_idempotency_key;
  if reservation.id is not null then
    if reservation.id <> p_reservation_id or reservation.run_id <> target.id
       or reservation.attempt <> p_attempt or reservation.amount_usd <> p_amount_usd
       or reservation.hard_limit_usd <> p_hard_limit_usd or reservation.expires_at <> p_expires_at then
      raise exception 'runtime usage reservation idempotency conflict' using errcode = '23505';
    end if;
    return reservation;
  end if;

  select coalesce(sum(amount_usd), 0) into actual_total
    from public.runtime_cost_ledger where organization_id = target.organization_id;
  select coalesce(sum(amount_usd), 0) into reserved_total
    from public.runtime_usage_reservations
    where organization_id = target.organization_id and state = 'reserved' and expires_at > clock_timestamp();
  if actual_total + reserved_total + p_amount_usd > p_hard_limit_usd then
    raise exception 'runtime organization hard budget exceeded' using errcode = 'P0001';
  end if;

  insert into public.runtime_usage_reservations(
    id, organization_id, project_id, run_id, attempt, amount_usd,
    hard_limit_usd, idempotency_key, expires_at
  ) values (
    p_reservation_id, target.organization_id, target.project_id, target.id, p_attempt,
    p_amount_usd, p_hard_limit_usd, p_idempotency_key, p_expires_at
  ) returning * into reservation;

  -- Lock the run only after the organization budget lock and accounting work.
  select * into target from public.runtime_runs where id = target.id for update;
  insert into public.runtime_events(
    organization_id, project_id, run_id, sequence, event_type, payload, correlation_id
  ) values (
    target.organization_id, target.project_id, target.id, target.next_event_sequence,
    'usage.reserved', jsonb_build_object(
      'reservation_id', reservation.id, 'attempt', reservation.attempt,
      'amount_usd', reservation.amount_usd, 'hard_limit_usd', reservation.hard_limit_usd,
      'expires_at', reservation.expires_at
    ), target.correlation_id
  );
  update public.runtime_runs
  set next_event_sequence = next_event_sequence + 1, updated_at = clock_timestamp()
  where id = target.id;
  return reservation;
end
$$;

create or replace function public.release_runtime_usage_reservation(
  p_reservation_id text,
  p_reason text
)
returns public.runtime_usage_reservations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  reservation public.runtime_usage_reservations%rowtype;
  target public.runtime_runs%rowtype;
  release_state text;
begin
  if length(p_reservation_id) not between 8 and 255 or length(btrim(p_reason)) not between 1 and 255 then
    raise exception 'invalid runtime usage release parameters' using errcode = '22023';
  end if;
  select * into reservation from public.runtime_usage_reservations where id = p_reservation_id;
  if reservation.id is null then raise exception 'runtime usage reservation not found' using errcode = 'P0002'; end if;

  perform pg_advisory_xact_lock(hashtextextended(reservation.organization_id::text, 20260712013000));
  select * into reservation from public.runtime_usage_reservations where id = p_reservation_id for update;
  if reservation.state <> 'reserved' then return reservation; end if;
  release_state := case when reservation.expires_at <= clock_timestamp() then 'expired' else 'released' end;
  update public.runtime_usage_reservations
  set state = release_state, released_at = clock_timestamp(),
      release_reason = case when release_state = 'expired' then 'expired' else btrim(p_reason) end
  where id = reservation.id returning * into reservation;

  select * into target from public.runtime_runs where id = reservation.run_id for update;
  insert into public.runtime_events(
    organization_id, project_id, run_id, sequence, event_type, payload, correlation_id
  ) values (
    target.organization_id, target.project_id, target.id, target.next_event_sequence,
    'usage.reservation_released', jsonb_build_object(
      'reservation_id', reservation.id, 'attempt', reservation.attempt,
      'amount_usd', reservation.amount_usd, 'state', reservation.state,
      'reason', reservation.release_reason
    ), target.correlation_id
  );
  update public.runtime_runs
  set next_event_sequence = next_event_sequence + 1, updated_at = clock_timestamp()
  where id = target.id;
  return reservation;
end
$$;

create or replace function public.adjust_runtime_usage_reservation(
  p_reservation_id text,
  p_amount_usd numeric,
  p_hard_limit_usd numeric
)
returns public.runtime_usage_reservations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  reservation public.runtime_usage_reservations%rowtype;
  target public.runtime_runs%rowtype;
  actual_total numeric(20, 10);
  reserved_total numeric(20, 10);
  prior_amount numeric(20, 10);
begin
  if length(p_reservation_id) not between 8 and 255 or p_amount_usd <= 0
     or p_hard_limit_usd <= 0 or p_amount_usd > p_hard_limit_usd then
    raise exception 'invalid runtime usage adjustment parameters' using errcode = '22023';
  end if;
  select * into reservation from public.runtime_usage_reservations where id = p_reservation_id;
  if reservation.id is null then raise exception 'runtime usage reservation not found' using errcode = 'P0002'; end if;

  perform pg_advisory_xact_lock(hashtextextended(reservation.organization_id::text, 20260712013000));
  select * into reservation from public.runtime_usage_reservations where id = p_reservation_id for update;
  if reservation.state <> 'reserved' or reservation.expires_at <= clock_timestamp() then
    raise exception 'runtime usage reservation is not active' using errcode = '22023';
  end if;
  if reservation.amount_usd = p_amount_usd and reservation.hard_limit_usd = p_hard_limit_usd then
    return reservation;
  end if;

  select coalesce(sum(amount_usd), 0) into actual_total
    from public.runtime_cost_ledger where organization_id = reservation.organization_id;
  select coalesce(sum(amount_usd), 0) into reserved_total
    from public.runtime_usage_reservations
    where organization_id = reservation.organization_id and state = 'reserved'
      and expires_at > clock_timestamp() and id <> reservation.id;
  if actual_total + reserved_total + p_amount_usd > p_hard_limit_usd then
    raise exception 'runtime organization hard budget exceeded' using errcode = 'P0001';
  end if;

  prior_amount := reservation.amount_usd;
  update public.runtime_usage_reservations
  set amount_usd = p_amount_usd, hard_limit_usd = p_hard_limit_usd
  where id = reservation.id returning * into reservation;
  select * into target from public.runtime_runs where id = reservation.run_id for update;
  insert into public.runtime_events(
    organization_id, project_id, run_id, sequence, event_type, payload, correlation_id
  ) values (
    target.organization_id, target.project_id, target.id, target.next_event_sequence,
    'usage.reservation_adjusted', jsonb_build_object(
      'reservation_id', reservation.id, 'attempt', reservation.attempt,
      'prior_amount_usd', prior_amount, 'amount_usd', reservation.amount_usd,
      'hard_limit_usd', reservation.hard_limit_usd
    ), target.correlation_id
  );
  update public.runtime_runs
  set next_event_sequence = next_event_sequence + 1, updated_at = clock_timestamp()
  where id = target.id;
  return reservation;
end
$$;

create or replace function public.record_runtime_attempt_failure(
  p_run_id text,
  p_attempt integer,
  p_lease_id uuid,
  p_failure_class text,
  p_failure_detail jsonb,
  p_retryable boolean,
  p_max_attempts integer,
  p_retry_delay_seconds integer
)
returns public.runtime_runs
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target public.runtime_runs%rowtype;
  active_lease public.runtime_leases%rowtype;
  prior_attempt public.runtime_run_attempts%rowtype;
  will_retry boolean;
  retry_at timestamptz;
begin
  if p_attempt < 1 or p_lease_id is null or length(btrim(p_failure_class)) not between 1 and 100
     or jsonb_typeof(coalesce(p_failure_detail, '{}'::jsonb)) <> 'object'
     or p_max_attempts not between 1 and 100 or p_retry_delay_seconds not between 0 and 3600 then
    raise exception 'invalid runtime attempt failure parameters' using errcode = '22023';
  end if;
  select * into target from public.runtime_runs where id = p_run_id for update;
  if target.id is null then raise exception 'runtime run not found' using errcode = 'P0002'; end if;

  select * into prior_attempt from public.runtime_run_attempts
    where run_id = target.id and attempt = p_attempt for update;
  if prior_attempt.run_id is null then raise exception 'runtime attempt not found' using errcode = 'P0002'; end if;
  if prior_attempt.finished_at is not null then
    if prior_attempt.failure_class is distinct from btrim(p_failure_class)
       or prior_attempt.failure_detail is distinct from coalesce(p_failure_detail, '{}'::jsonb) then
      raise exception 'runtime attempt failure idempotency conflict' using errcode = '23505';
    end if;
    return target;
  end if;
  if target.state in ('completed', 'failed', 'canceled') or target.attempt <> p_attempt then
    raise exception 'runtime attempt is not active' using errcode = '40001';
  end if;
  select * into active_lease from public.runtime_leases
    where id = p_lease_id and run_id = target.id and attempt = p_attempt for update;
  if active_lease.id is null or active_lease.released_at is not null then
    raise exception 'active runtime lease not found' using errcode = 'P0002';
  end if;

  will_retry := p_retryable and p_attempt < p_max_attempts and target.cancel_requested_at is null;
  retry_at := clock_timestamp() + make_interval(secs => p_retry_delay_seconds);
  update public.runtime_run_attempts
  set finished_at = clock_timestamp(), outcome = case when will_retry then 'retry_scheduled' else 'failed' end,
      failure_class = btrim(p_failure_class), failure_detail = coalesce(p_failure_detail, '{}'::jsonb)
  where run_id = target.id and attempt = p_attempt;
  update public.runtime_leases set released_at = clock_timestamp() where id = active_lease.id;
  delete from public.runtime_dispatch_queue where run_id = target.id;
  if will_retry then
    insert into public.runtime_dispatch_queue(run_id, organization_id, available_at)
    values (target.id, target.organization_id, retry_at);
  end if;
  insert into public.runtime_events(
    organization_id, project_id, run_id, sequence, event_type, actor_type, payload, correlation_id
  ) values (
    target.organization_id, target.project_id, target.id, target.next_event_sequence,
    case when will_retry then 'run.retry_scheduled' else 'run.failed' end, 'worker',
    jsonb_build_object(
      'attempt', p_attempt, 'lease_id', p_lease_id, 'failure_class', btrim(p_failure_class),
      'failure_detail', coalesce(p_failure_detail, '{}'::jsonb), 'retryable', p_retryable,
      'max_attempts', p_max_attempts, 'retry_at', case when will_retry then retry_at else null end
    ), target.correlation_id
  );
  update public.runtime_runs
  set state = case when will_retry then 'retrying' else 'failed' end,
      version = version + 1, next_event_sequence = next_event_sequence + 1,
      updated_at = clock_timestamp(),
      terminal_at = case when will_retry then null else clock_timestamp() end,
      terminal_reason = case when will_retry then null else btrim(p_failure_class) end
  where id = target.id returning * into target;
  return target;
end
$$;

revoke all on function public.complete_runtime_cancellation(text, integer, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.reserve_runtime_usage(text, text, integer, numeric, numeric, timestamptz, text) from public, anon, authenticated;
revoke all on function public.adjust_runtime_usage_reservation(text, numeric, numeric) from public, anon, authenticated;
revoke all on function public.release_runtime_usage_reservation(text, text) from public, anon, authenticated;
revoke all on function public.record_runtime_attempt_failure(text, integer, uuid, text, jsonb, boolean, integer, integer) from public, anon, authenticated;
grant execute on function public.complete_runtime_cancellation(text, integer, uuid, jsonb),
  public.reserve_runtime_usage(text, text, integer, numeric, numeric, timestamptz, text),
  public.adjust_runtime_usage_reservation(text, numeric, numeric),
  public.release_runtime_usage_reservation(text, text),
  public.record_runtime_attempt_failure(text, integer, uuid, text, jsonb, boolean, integer, integer)
to service_role;

comment on table public.runtime_usage_reservations is
  'Service-only organization usage holds; actual cost plus active holds enforce a hard budget under an organization lock.';
comment on function public.complete_runtime_cancellation(text, integer, uuid, jsonb) is
  'Atomically records provider cancellation propagation, closes the attempt, releases execution state, and emits run.canceled.';
comment on function public.reserve_runtime_usage(text, text, integer, numeric, numeric, timestamptz, text) is
  'Idempotently reserves organization usage under serialized hard-budget enforcement; service-role only.';
comment on function public.adjust_runtime_usage_reservation(text, numeric, numeric) is
  'Idempotently adjusts an active organization usage hold under serialized hard-budget enforcement; service-role only.';
comment on function public.record_runtime_attempt_failure(text, integer, uuid, text, jsonb, boolean, integer, integer) is
  'Atomically closes a failed attempt and schedules bounded retry or terminal failure; service-role only.';

commit;
