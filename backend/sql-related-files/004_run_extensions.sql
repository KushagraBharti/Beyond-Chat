create extension if not exists "pgcrypto";

alter table if exists public.runs
    add column if not exists title text,
    add column if not exists model text,
    add column if not exists options jsonb not null default '{}'::jsonb,
    add column if not exists output jsonb not null default '{}'::jsonb,
    add column if not exists error_message text,
    add column if not exists provider_status text,
    add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists runs_workspace_studio_idx
    on public.runs (workspace_id, studio, created_at desc);

create index if not exists runs_workspace_status_idx
    on public.runs (workspace_id, status, created_at desc);

create table if not exists public.run_steps (
    id uuid primary key default gen_random_uuid(),
    run_id uuid not null references public.runs(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    step_name text not null,
    tool_used text not null,
    status text not null check (status in ('queued', 'running', 'completed', 'failed')),
    input jsonb not null default '{}'::jsonb,
    output jsonb not null default '{}'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists run_steps_run_idx
    on public.run_steps (run_id, created_at asc);

create index if not exists run_steps_workspace_idx
    on public.run_steps (workspace_id, created_at desc);
