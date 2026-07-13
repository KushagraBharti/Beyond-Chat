begin;

-- Automation executions are durable state machines, not immutable snapshots.
-- Their queued -> running -> completed/failed transitions use the same
-- compare-and-swap contract as other mutable product records.
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
                'automation_version', 'realtime_hint') then
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

revoke all on function public.product_update_record(text, uuid, uuid, uuid, uuid, uuid, bigint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.product_update_record(text, uuid, uuid, uuid, uuid, uuid, bigint, text, jsonb)
  to service_role;

commit;
