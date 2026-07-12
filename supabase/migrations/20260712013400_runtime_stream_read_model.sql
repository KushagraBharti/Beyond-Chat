begin;

-- Generated manually with explicit authorization after
-- `supabase migration new runtime_stream_read_model` failed under OneDrive with
-- LegacyMigrationNewWriteError: AlreadyExists: FileSystem.makeDirectory
-- (...\supabase\migrations).

create index if not exists runtime_events_org_project_run_sequence_idx
  on public.runtime_events (organization_id, project_id, run_id, sequence);

create or replace function public.runtime_stream_snapshot(
  p_organization_id uuid, p_project_id uuid, p_run_id text
)
returns table (
  organization_id text, project_id text, run_id text, state text,
  latest_sequence bigint, minimum_available_sequence bigint, projection jsonb
)
language sql stable security invoker set search_path = pg_catalog, public
as $$
  select target.organization_id::text, target.project_id::text, target.id, target.state,
    target.next_event_sequence - 1,
    coalesce(bounds.minimum_available_sequence, target.next_event_sequence),
    jsonb_build_object(
      'attempt', target.attempt, 'version', target.version,
      'cancel_requested_at', target.cancel_requested_at,
      'terminal_reason', target.terminal_reason, 'created_at', target.created_at,
      'updated_at', target.updated_at, 'terminal_at', target.terminal_at
    )
  from public.runtime_runs as target
  left join lateral (
    select min(event.sequence) as minimum_available_sequence
    from public.runtime_events as event
    where event.organization_id = p_organization_id
      and event.project_id = p_project_id and event.run_id = p_run_id
  ) as bounds on true
  where target.organization_id = p_organization_id
    and target.project_id = p_project_id and target.id = p_run_id;
$$;

create or replace function public.runtime_stream_events_after(
  p_organization_id uuid, p_project_id uuid, p_run_id text,
  p_after_sequence bigint, p_limit integer
)
returns table (
  id bigint, organization_id text, project_id text, run_id text,
  sequence bigint, event_type text, schema_version integer,
  payload jsonb, occurred_at timestamptz
)
language plpgsql stable security invoker set search_path = pg_catalog, public
as $$
begin
  if p_after_sequence is null or p_after_sequence < 0 then
    raise exception 'after sequence must be a non-negative integer' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'limit must be between 1 and 1000' using errcode = '22023';
  end if;
  return query
  select event.id, event.organization_id::text, event.project_id::text,
    event.run_id, event.sequence, event.event_type, event.schema_version,
    event.payload, event.occurred_at
  from public.runtime_events as event
  where event.organization_id = p_organization_id
    and event.project_id = p_project_id and event.run_id = p_run_id
    and event.sequence > p_after_sequence
  order by event.sequence asc limit p_limit;
end
$$;

revoke all on function public.runtime_stream_snapshot(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.runtime_stream_events_after(uuid, uuid, text, bigint, integer) from public, anon, authenticated;
grant execute on function public.runtime_stream_snapshot(uuid, uuid, text) to service_role;
grant execute on function public.runtime_stream_events_after(uuid, uuid, text, bigint, integer) to service_role;

comment on function public.runtime_stream_snapshot(uuid, uuid, text) is
  'Service-only atomic runtime stream snapshot with exact organization, project, and run scope predicates.';
comment on function public.runtime_stream_events_after(uuid, uuid, text, bigint, integer) is
  'Service-only bounded ordered runtime event read with exact organization, project, and run scope predicates.';

commit;
