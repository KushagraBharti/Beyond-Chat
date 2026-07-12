begin;

-- Generated manually only after the required
-- `supabase migration new internal_gateway_invocation_claims` command failed on
-- this OneDrive checkout with LegacyMigrationNewWriteError/AlreadyExists for
-- supabase/migrations. This is the manager-authorized next canonical version.

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'runtime_runs_organization_id_id_key'
      and conrelid = 'public.runtime_runs'::regclass
  ) then
    alter table public.runtime_runs
      add constraint runtime_runs_organization_id_id_key unique (organization_id, id);
  end if;
end $$;

create table if not exists public.internal_gateway_invocation_claims (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  project_id uuid not null,
  run_id text not null,
  subject text not null,
  attempt integer not null check (attempt > 0),
  lease_id uuid not null,
  idempotency_key text not null check (length(idempotency_key) between 8 and 255),
  request_digest text not null check (request_digest ~ '^sha256:[0-9a-f]{64}$'),
  jti text not null check (length(jti) between 8 and 255),
  expires_at timestamptz not null,
  claimed_at timestamptz not null default clock_timestamp(),
  constraint internal_gateway_claims_run_scope_fkey
    foreign key (organization_id, run_id)
    references public.runtime_runs(organization_id, id) on delete cascade,
  constraint internal_gateway_claims_project_scope_fkey
    foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint internal_gateway_claims_lease_fkey
    foreign key (lease_id) references public.runtime_leases(id) on delete restrict,
  constraint internal_gateway_claims_idempotency_key
    unique (organization_id, run_id, idempotency_key),
  constraint internal_gateway_claims_jti_key unique (jti),
  constraint internal_gateway_claims_expiry_check check (expires_at > claimed_at)
);

create index if not exists internal_gateway_claims_run_idx
  on public.internal_gateway_invocation_claims(run_id);
create index if not exists internal_gateway_claims_expiry_idx
  on public.internal_gateway_invocation_claims(expires_at);

alter table public.internal_gateway_invocation_claims enable row level security;
alter table public.internal_gateway_invocation_claims force row level security;

revoke all on table public.internal_gateway_invocation_claims from public, anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.internal_gateway_invocation_claims from service_role;
revoke all on sequence public.internal_gateway_invocation_claims_id_seq from public, anon, authenticated, service_role;
grant select on table public.internal_gateway_invocation_claims to service_role;

create or replace function public.claim_internal_gateway_invocation(
  p_organization_id uuid,
  p_project_id uuid,
  p_run_id text,
  p_subject text,
  p_attempt integer,
  p_lease_id uuid,
  p_idempotency_key text,
  p_request_digest text,
  p_jti text,
  p_expires_at timestamptz
) returns table(status text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  first_lock bigint;
  second_lock bigint;
  jti_lock bigint;
  scope_lock bigint;
  target public.runtime_runs%rowtype;
  active_lease public.runtime_leases%rowtype;
begin
  if p_organization_id is null
     or p_project_id is null
     or p_run_id is null or length(p_run_id) = 0
     or p_subject is null or length(p_subject) = 0
     or p_attempt is null or p_attempt <= 0
     or p_lease_id is null
     or p_idempotency_key is null or length(p_idempotency_key) not between 8 and 255
     or p_request_digest is null or p_request_digest !~ '^sha256:[0-9a-f]{64}$'
     or p_jti is null or length(p_jti) not between 8 and 255
     or p_expires_at is null or p_expires_at <= clock_timestamp()
     or p_expires_at > clock_timestamp() + interval '5 minutes' then
    raise exception 'invalid internal gateway invocation claim' using errcode = '22023';
  end if;

  -- Row locks fence state/lease mutation until this claim transaction commits.
  select * into target from public.runtime_runs where id = p_run_id for update;
  if target.id is null
     or target.organization_id <> p_organization_id
     or target.project_id <> p_project_id
     or target.attempt <> p_attempt
     or target.state not in ('leased', 'preparing', 'running', 'completing')
     or target.cancel_requested_at is not null then
    return query select 'binding_stale'::text;
    return;
  end if;

  select * into active_lease from public.runtime_leases
  where id = p_lease_id for share;
  if active_lease.id is null
     or active_lease.run_id <> p_run_id
     or active_lease.organization_id <> p_organization_id
     or active_lease.worker_id <> p_subject
     or active_lease.attempt <> p_attempt
     or active_lease.released_at is not null
     or active_lease.expires_at <= clock_timestamp() then
    return query select 'binding_stale'::text;
    return;
  end if;

  -- Serialize both uniqueness domains in a stable order. The constraints remain
  -- the final integrity boundary; these locks make outcome precedence deterministic.
  jti_lock := pg_catalog.hashtextextended('gateway-jti:' || p_jti, 20260712013300);
  scope_lock := pg_catalog.hashtextextended(
    'gateway-idempotency:' || p_organization_id::text || ':' || p_run_id || ':' || p_idempotency_key,
    20260712013300
  );
  first_lock := least(jti_lock, scope_lock);
  second_lock := greatest(jti_lock, scope_lock);
  perform pg_catalog.pg_advisory_xact_lock(first_lock);
  if second_lock <> first_lock then
    perform pg_catalog.pg_advisory_xact_lock(second_lock);
  end if;

  if exists (select 1 from public.internal_gateway_invocation_claims where jti = p_jti) then
    return query select 'token_replayed'::text;
    return;
  end if;

  if exists (
    select 1 from public.internal_gateway_invocation_claims
    where organization_id = p_organization_id
      and run_id = p_run_id
      and idempotency_key = p_idempotency_key
  ) then
    return query select 'idempotency_conflict'::text;
    return;
  end if;

  -- The lease row is locked against release/replacement; recheck wall-clock
  -- expiry after any uniqueness-lock wait and immediately before persistence.
  if active_lease.expires_at <= clock_timestamp() then
    return query select 'binding_stale'::text;
    return;
  end if;

  insert into public.internal_gateway_invocation_claims(
    organization_id, project_id, run_id, subject, attempt, lease_id,
    idempotency_key, request_digest, jti, expires_at
  ) values (
    p_organization_id, p_project_id, p_run_id, p_subject, p_attempt, p_lease_id,
    p_idempotency_key, p_request_digest, p_jti, p_expires_at
  );

  return query select 'claimed'::text;
end $$;

revoke all on function public.claim_internal_gateway_invocation(uuid,uuid,text,text,integer,uuid,text,text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_internal_gateway_invocation(uuid,uuid,text,text,integer,uuid,text,text,text,timestamptz)
  to service_role;

comment on table public.internal_gateway_invocation_claims is
  'Durable service-only one-use token and run-scoped idempotency bindings. Claims are retained until their runtime run is deleted; expires_at is audit/retention metadata and never permits key or JTI reuse.';

commit;
