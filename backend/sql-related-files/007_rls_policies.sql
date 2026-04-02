create or replace function public.current_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
    select wm.workspace_id
    from public.workspace_members wm
    where wm.user_id = auth.uid()
$$;

create or replace function public.current_admin_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
    select wm.workspace_id
    from public.workspace_members wm
    where wm.user_id = auth.uid()
      and wm.role = 'admin'
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = target_workspace_id
          and wm.user_id = auth.uid()
    )
$$;

create or replace function public.can_manage_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = target_workspace_id
          and wm.user_id = auth.uid()
          and wm.role = 'admin'
    )
    or exists (
        select 1
        from public.workspaces w
        where w.id = target_workspace_id
          and w.owner_id = auth.uid()
    )
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

drop policy if exists user_profiles_self_access on public.user_profiles;
create policy user_profiles_self_access on public.user_profiles
for all
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists workspaces_workspace_select on public.workspaces;
create policy workspaces_workspace_select on public.workspaces
for select
using (public.is_workspace_member(id));

drop policy if exists workspaces_workspace_update on public.workspaces;
create policy workspaces_workspace_update on public.workspaces
for update
using (public.can_manage_workspace(id))
with check (public.can_manage_workspace(id));

drop policy if exists workspace_members_workspace_select on public.workspace_members;
create policy workspace_members_workspace_select on public.workspace_members
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_members_workspace_insert on public.workspace_members;
create policy workspace_members_workspace_insert on public.workspace_members
for insert
with check (public.can_manage_workspace(workspace_id));

drop policy if exists workspace_members_workspace_update on public.workspace_members;
create policy workspace_members_workspace_update on public.workspace_members
for update
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

drop policy if exists workspace_members_workspace_delete on public.workspace_members;
create policy workspace_members_workspace_delete on public.workspace_members
for delete
using (public.can_manage_workspace(workspace_id));

drop policy if exists chat_collections_workspace_access on public.chat_collections;
create policy chat_collections_workspace_access on public.chat_collections
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists chat_threads_workspace_access on public.chat_threads;
create policy chat_threads_workspace_access on public.chat_threads
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists chat_messages_workspace_access on public.chat_messages;
create policy chat_messages_workspace_access on public.chat_messages
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists integration_connections_workspace_access on public.integration_connections;
create policy integration_connections_workspace_access on public.integration_connections
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists integration_sync_logs_workspace_access on public.integration_sync_logs;
create policy integration_sync_logs_workspace_access on public.integration_sync_logs
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists artifacts_workspace_access on public.artifacts;
create policy artifacts_workspace_access on public.artifacts
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists runs_workspace_access on public.runs;
create policy runs_workspace_access on public.runs
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists run_steps_workspace_access on public.run_steps;
create policy run_steps_workspace_access on public.run_steps
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
