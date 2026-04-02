-- ============================================================
-- 009_cleanup_and_fixes.sql
-- Fixes: search_path on set_updated_at, RLS per-row auth.uid(),
--        user-uploads bucket hardening, duplicate indexes,
--        missing FK indexes.
-- ============================================================

-- 1. Fix set_updated_at: add SET search_path = public
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

-- 2. Fix user_profiles_self_access: evaluate auth.uid() once per query, not per row
drop policy if exists user_profiles_self_access on public.user_profiles;
create policy user_profiles_self_access on public.user_profiles
for all
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- 3. Harden the user-uploads bucket (file size + MIME allowlist)
update storage.buckets
set
    file_size_limit  = 104857600,  -- 100 MB
    allowed_mime_types = array[
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
        'application/pdf',
        'text/markdown',
        'text/plain',
        'text/csv',
        'application/json',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
where id = 'user-uploads';

-- 3a. Workspace-scoped RLS policies for user-uploads (mirrors artifacts bucket)
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
          and policyname = 'user_uploads_bucket_workspace_read'
    ) then
        create policy user_uploads_bucket_workspace_read on storage.objects
        for select
        using (
            bucket_id = 'user-uploads'
            and (storage.foldername(name))[1] in (select public.current_workspace_ids()::text)
        );
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
          and policyname = 'user_uploads_bucket_workspace_write'
    ) then
        create policy user_uploads_bucket_workspace_write on storage.objects
        for insert
        with check (
            bucket_id = 'user-uploads'
            and (storage.foldername(name))[1] in (select public.current_workspace_ids()::text)
        );
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
          and policyname = 'user_uploads_bucket_workspace_update'
    ) then
        create policy user_uploads_bucket_workspace_update on storage.objects
        for update
        using (
            bucket_id = 'user-uploads'
            and (storage.foldername(name))[1] in (select public.current_workspace_ids()::text)
        )
        with check (
            bucket_id = 'user-uploads'
            and (storage.foldername(name))[1] in (select public.current_workspace_ids()::text)
        );
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
          and policyname = 'user_uploads_bucket_workspace_delete'
    ) then
        create policy user_uploads_bucket_workspace_delete on storage.objects
        for delete
        using (
            bucket_id = 'user-uploads'
            and (storage.foldername(name))[1] in (select public.current_workspace_ids()::text)
        );
    end if;
end $$;

-- 4. Drop duplicate indexes

-- artifacts_workspace_idx == artifacts_workspace_updated_idx (both btree workspace_id, updated_at desc)
drop index if exists public.artifacts_workspace_idx;

-- run_steps_run_base_idx == run_steps_run_idx (both btree run_id, created_at)
drop index if exists public.run_steps_run_base_idx;

-- workspaces_slug_key (unconditional unique) is superseded by workspaces_slug_idx (partial, WHERE slug IS NOT NULL)
do $$
begin
    if exists (
        select 1 from information_schema.table_constraints
        where table_schema = 'public'
          and table_name = 'workspaces'
          and constraint_name = 'workspaces_slug_key'
          and constraint_type = 'UNIQUE'
    ) then
        alter table public.workspaces drop constraint workspaces_slug_key;
    else
        drop index if exists public.workspaces_slug_key;
    end if;
end $$;

-- 5. Add missing FK indexes (partial where column is nullable)

create index if not exists artifacts_created_by_idx
    on public.artifacts (created_by)
    where created_by is not null;

create index if not exists artifacts_source_run_id_idx
    on public.artifacts (source_run_id)
    where source_run_id is not null;

create index if not exists chat_collections_created_by_idx
    on public.chat_collections (created_by)
    where created_by is not null;

create index if not exists chat_messages_created_by_idx
    on public.chat_messages (created_by)
    where created_by is not null;

create index if not exists chat_threads_created_by_idx
    on public.chat_threads (created_by)
    where created_by is not null;

create index if not exists integration_connections_user_id_idx
    on public.integration_connections (user_id)
    where user_id is not null;

create index if not exists integration_sync_logs_connection_id_idx
    on public.integration_sync_logs (connection_id);

create index if not exists runs_created_by_idx
    on public.runs (created_by)
    where created_by is not null;
