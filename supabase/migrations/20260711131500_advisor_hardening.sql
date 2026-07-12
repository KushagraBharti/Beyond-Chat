-- Post-deploy advisor hardening for the canonical Phase 2 baseline.

begin;

create index if not exists projects_organization_team_idx
  on public.projects (organization_id, team_id)
  where team_id is not null;

create index if not exists outbox_events_organization_id_idx
  on public.outbox_events (organization_id)
  where organization_id is not null;

-- These service-only tables intentionally have no authenticated grants. Explicit
-- deny policies document the boundary and keep RLS advisor output unambiguous.
create policy webhook_inbox_authenticated_deny
  on public.webhook_inbox
  for all
  to authenticated
  using (false)
  with check (false);

create policy outbox_events_authenticated_deny
  on public.outbox_events
  for all
  to authenticated
  using (false)
  with check (false);

commit;
