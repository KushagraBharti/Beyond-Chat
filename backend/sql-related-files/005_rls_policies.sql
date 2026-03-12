create or replace function public.current_workspace_ids()
returns setof uuid
language sql
stable
as $$
    select wm.workspace_id
    from public.workspace_members wm
    where wm.user_id = auth.uid()
$$;

alter table if exists public.chat_collections enable row level security;
alter table if exists public.chat_threads enable row level security;
alter table if exists public.chat_messages enable row level security;
alter table if exists public.integration_connections enable row level security;
alter table if exists public.integration_sync_logs enable row level security;
alter table if exists public.user_profiles enable row level security;
alter table if exists public.workspaces enable row level security;
alter table if exists public.workspace_members enable row level security;
alter table if exists public.artifacts enable row level security;
alter table if exists public.runs enable row level security;
alter table if exists public.run_steps enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'user_profiles' and policyname = 'user_profiles_self_access'
    ) then
        create policy user_profiles_self_access on public.user_profiles
        using (id = auth.uid())
        with check (id = auth.uid());
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'workspaces' and policyname = 'workspaces_workspace_access'
    ) then
        create policy workspaces_workspace_access on public.workspaces
        using (id in (select public.current_workspace_ids()))
        with check (id in (select public.current_workspace_ids()) or owner_id = auth.uid());
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'workspace_members' and policyname = 'workspace_members_workspace_access'
    ) then
        create policy workspace_members_workspace_access on public.workspace_members
        using (workspace_id in (select public.current_workspace_ids()))
        with check (workspace_id in (select public.current_workspace_ids()) or user_id = auth.uid());
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'chat_collections' and policyname = 'chat_collections_workspace_access'
    ) then
        create policy chat_collections_workspace_access on public.chat_collections
        using (workspace_id in (select public.current_workspace_ids()))
        with check (workspace_id in (select public.current_workspace_ids()));
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'chat_threads' and policyname = 'chat_threads_workspace_access'
    ) then
        create policy chat_threads_workspace_access on public.chat_threads
        using (workspace_id in (select public.current_workspace_ids()))
        with check (workspace_id in (select public.current_workspace_ids()));
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'chat_messages_workspace_access'
    ) then
        create policy chat_messages_workspace_access on public.chat_messages
        using (workspace_id in (select public.current_workspace_ids()))
        with check (workspace_id in (select public.current_workspace_ids()));
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'integration_connections' and policyname = 'integration_connections_workspace_access'
    ) then
        create policy integration_connections_workspace_access on public.integration_connections
        using (workspace_id in (select public.current_workspace_ids()))
        with check (workspace_id in (select public.current_workspace_ids()));
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'integration_sync_logs' and policyname = 'integration_sync_logs_workspace_access'
    ) then
        create policy integration_sync_logs_workspace_access on public.integration_sync_logs
        using (workspace_id in (select public.current_workspace_ids()))
        with check (workspace_id in (select public.current_workspace_ids()));
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'artifacts' and policyname = 'artifacts_workspace_access'
    ) then
        create policy artifacts_workspace_access on public.artifacts
        using (workspace_id in (select public.current_workspace_ids()))
        with check (workspace_id in (select public.current_workspace_ids()));
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'runs' and policyname = 'runs_workspace_access'
    ) then
        create policy runs_workspace_access on public.runs
        using (workspace_id in (select public.current_workspace_ids()))
        with check (workspace_id in (select public.current_workspace_ids()));
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'run_steps' and policyname = 'run_steps_workspace_access'
    ) then
        create policy run_steps_workspace_access on public.run_steps
        using (workspace_id in (select public.current_workspace_ids()))
        with check (workspace_id in (select public.current_workspace_ids()));
    end if;
end $$;
