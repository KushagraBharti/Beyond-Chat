create extension if not exists "pgcrypto";

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'run_steps'
          and column_name = 'timestamp'
    ) and not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'run_steps'
          and column_name = 'created_at'
    ) then
        alter table public.run_steps rename column timestamp to created_at;
    end if;
end $$;

alter table if exists public.runs
    add column if not exists title text,
    add column if not exists model text,
    add column if not exists options jsonb not null default '{}'::jsonb,
    add column if not exists output jsonb not null default '{}'::jsonb,
    add column if not exists error_message text,
    add column if not exists provider_status text,
    add column if not exists completed_at timestamptz,
    add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists runs_workspace_studio_idx
    on public.runs (workspace_id, studio, created_at desc);

create index if not exists runs_workspace_status_idx
    on public.runs (workspace_id, status, created_at desc);

alter table if exists public.run_steps
    add column if not exists status text not null default 'queued',
    add column if not exists input jsonb not null default '{}'::jsonb,
    add column if not exists output jsonb not null default '{}'::jsonb,
    add column if not exists metadata jsonb not null default '{}'::jsonb,
    add column if not exists created_at timestamptz not null default timezone('utc', now());

create index if not exists run_steps_run_idx
    on public.run_steps (run_id, created_at asc);

create index if not exists run_steps_workspace_idx
    on public.run_steps (workspace_id, created_at desc);
