begin;

-- Reconcile production with the canonical WorkOS claim contract. These
-- definitions intentionally remain safe to reapply after a clean baseline.
create or replace function app_private.jwt_issuer()
returns text
language sql
stable
security invoker
set search_path = pg_catalog, app_private
as $$
  select nullif(rtrim(app_private.jwt_claims() ->> 'iss', '/'), '')
$$;

create or replace function app_private.is_organization_context(target_organization_id uuid)
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

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated
with check (
  created_by = app_private.current_profile_id()
  and app_private.has_organization_role(
    organization_id,
    array['owner', 'admin', 'builder', 'member']::public.organization_role[]
  )
);

commit;
