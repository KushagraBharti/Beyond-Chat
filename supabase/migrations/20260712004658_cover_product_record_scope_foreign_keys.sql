-- Cover the composite same-organization foreign keys used by product records.
-- These indexes support FK checks and organization-scoped project/team lookups.

begin;

create index if not exists product_records_organization_project_idx
  on public.product_records (organization_id, project_id)
  where project_id is not null;

create index if not exists product_records_organization_team_idx
  on public.product_records (organization_id, team_id)
  where team_id is not null;

commit;
