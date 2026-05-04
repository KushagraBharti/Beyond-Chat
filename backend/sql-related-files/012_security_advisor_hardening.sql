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
    workspace_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_workspace_member(workspace_id::uuid)
);

-- SECURITY DEFINER helper RPCs should not be executable by anonymous users.
-- Authenticated execution is retained because the API bootstraps workspaces through
-- ensure_workspace_for_user with the caller's Supabase access token.
revoke execute on function public.ensure_workspace_for_user(uuid, text, text, jsonb) from public, anon;
grant execute on function public.ensure_workspace_for_user(uuid, text, text, jsonb) to authenticated, service_role;

revoke execute on function public.handle_new_user_workspace() from public, anon;

revoke execute on function public.current_workspace_ids() from public, anon;
grant execute on function public.current_workspace_ids() to authenticated, service_role;

revoke execute on function public.current_admin_workspace_ids() from public, anon;
grant execute on function public.current_admin_workspace_ids() to authenticated, service_role;

revoke execute on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;

revoke execute on function public.can_manage_workspace(uuid) from public, anon;
grant execute on function public.can_manage_workspace(uuid) to authenticated, service_role;

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
        execute format('revoke execute on function %s from public, anon', fn.signature);
    end loop;
end $$;
