-- Idempotent hardening for Supabase security advisor findings.
-- Billing tables must remain independently readable only by their owning user.
alter table if exists public.user_plans enable row level security;
alter table if exists public.usage_events enable row level security;

drop policy if exists user_plans_self_select on public.user_plans;
create policy user_plans_self_select on public.user_plans
for select
using (user_id = (select auth.uid()));

drop policy if exists usage_events_self_select on public.usage_events;
create policy usage_events_self_select on public.usage_events
for select
using (user_id = (select auth.uid()));

drop policy if exists usage_events_workspace_select on public.usage_events;
create policy usage_events_workspace_select on public.usage_events
for select
using (
    workspace_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_workspace_member(workspace_id::uuid)
);

-- SECURITY DEFINER helper RPCs should not be directly executable through the
-- public Data API. The backend bootstraps accounts through its service-role
-- client, while policies can still reference helper functions internally.
revoke execute on function public.ensure_workspace_for_user(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.ensure_workspace_for_user(uuid, text, text, jsonb) to service_role;

revoke execute on function public.handle_new_user_workspace() from public, anon, authenticated;

revoke execute on function public.current_workspace_ids() from public, anon, authenticated;
grant execute on function public.current_workspace_ids() to service_role;

revoke execute on function public.current_admin_workspace_ids() from public, anon, authenticated;
grant execute on function public.current_admin_workspace_ids() to service_role;

revoke execute on function public.is_workspace_member(uuid) from public, anon, authenticated;
grant execute on function public.is_workspace_member(uuid) to service_role;

revoke execute on function public.can_manage_workspace(uuid) from public, anon, authenticated;
grant execute on function public.can_manage_workspace(uuid) to service_role;

do $$
declare
    fn record;
begin
    for fn in
        select p.oid::regprocedure::text as signature
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'rls_auto_enable'
    loop
        execute format('revoke execute on function %s from public, anon, authenticated', fn.signature);
    end loop;
end $$;
