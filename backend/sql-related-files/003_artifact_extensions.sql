alter table if exists public.artifacts
    add column if not exists summary text,
    add column if not exists content_json jsonb,
    add column if not exists content_format text not null default 'markdown',
    add column if not exists preview_image text,
    add column if not exists source_run_id uuid references public.runs(id) on delete set null,
    add column if not exists is_archived boolean not null default false,
    add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists artifacts_workspace_updated_idx
    on public.artifacts (workspace_id, updated_at desc);

create index if not exists artifacts_workspace_studio_idx
    on public.artifacts (workspace_id, studio, updated_at desc);

create index if not exists artifacts_workspace_type_idx
    on public.artifacts (workspace_id, type, updated_at desc);

create index if not exists artifacts_metadata_gin_idx
    on public.artifacts using gin (metadata);

create index if not exists artifacts_content_json_gin_idx
    on public.artifacts using gin (content_json);

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'artifacts'
          and column_name = 'tags'
          and data_type = 'ARRAY'
    ) then
        create index if not exists artifacts_tags_gin_idx
            on public.artifacts using gin (tags);
    end if;
end $$;
