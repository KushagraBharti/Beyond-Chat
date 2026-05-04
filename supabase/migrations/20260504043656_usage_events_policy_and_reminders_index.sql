drop policy if exists usage_events_self_select on public.usage_events;
drop policy if exists usage_events_workspace_select on public.usage_events;
drop policy if exists usage_events_select_access on public.usage_events;

create policy usage_events_select_access on public.usage_events
for select
using (
    user_id = (select auth.uid())
    or (
        workspace_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and public.is_workspace_member(workspace_id::uuid)
    )
);

create index if not exists reminders_created_by_idx
    on public.reminders (created_by);
