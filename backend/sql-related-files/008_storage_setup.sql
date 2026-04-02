insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'artifacts',
    'artifacts',
    false,
    52428800,
    array[
        'image/png',
        'image/jpeg',
        'image/webp',
        'application/pdf',
        'text/markdown',
        'text/plain',
        'text/csv'
    ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'artifact_bucket_workspace_read'
    ) then
        create policy artifact_bucket_workspace_read on storage.objects
        for select
        using (
            bucket_id = 'artifacts'
            and (storage.foldername(name))[1] in (select current_workspace_ids()::text)
        );
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'artifact_bucket_workspace_write'
    ) then
        create policy artifact_bucket_workspace_write on storage.objects
        for insert
        with check (
            bucket_id = 'artifacts'
            and (storage.foldername(name))[1] in (select current_workspace_ids()::text)
        );
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'artifact_bucket_workspace_update'
    ) then
        create policy artifact_bucket_workspace_update on storage.objects
        for update
        using (
            bucket_id = 'artifacts'
            and (storage.foldername(name))[1] in (select current_workspace_ids()::text)
        )
        with check (
            bucket_id = 'artifacts'
            and (storage.foldername(name))[1] in (select current_workspace_ids()::text)
        );
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'artifact_bucket_workspace_delete'
    ) then
        create policy artifact_bucket_workspace_delete on storage.objects
        for delete
        using (
            bucket_id = 'artifacts'
            and (storage.foldername(name))[1] in (select current_workspace_ids()::text)
        );
    end if;
end $$;
