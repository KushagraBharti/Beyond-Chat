-- Revoke direct Data API/RPC execution of public SECURITY DEFINER helpers.
-- The backend now calls ensure_workspace_for_user through the service-role
-- client, while RLS/storage policies can still reference these helpers
-- internally.
revoke execute on function public.ensure_workspace_for_user(uuid, text, text, jsonb) from authenticated;
grant execute on function public.ensure_workspace_for_user(uuid, text, text, jsonb) to service_role;

revoke execute on function public.handle_new_user_workspace() from authenticated;

revoke execute on function public.current_workspace_ids() from authenticated;
grant execute on function public.current_workspace_ids() to service_role;

revoke execute on function public.current_admin_workspace_ids() from authenticated;
grant execute on function public.current_admin_workspace_ids() to service_role;

revoke execute on function public.is_workspace_member(uuid) from authenticated;
grant execute on function public.is_workspace_member(uuid) to service_role;

revoke execute on function public.can_manage_workspace(uuid) from authenticated;
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
        execute format('revoke execute on function %s from authenticated', fn.signature);
    end loop;
end $$;
