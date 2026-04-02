create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

create table if not exists public.artifacts (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    created_by uuid references auth.users(id) on delete set null,
    type text not null,
    title text not null,
    content text not null,
    tags text[] not null default '{}',
    studio text not null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.runs (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    created_by uuid references auth.users(id) on delete set null,
    studio text not null,
    prompt text not null,
    status text not null default 'running' check (status in ('queued', 'running', 'completed', 'failed')),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.run_steps (
    id uuid primary key default gen_random_uuid(),
    run_id uuid not null references public.runs(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    step_name text not null,
    tool_used text not null,
    status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
    input jsonb not null default '{}'::jsonb,
    output jsonb not null default '{}'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists artifacts_workspace_idx
    on public.artifacts (workspace_id, updated_at desc);

create index if not exists runs_workspace_idx
    on public.runs (workspace_id, created_at desc);

create index if not exists run_steps_run_base_idx
    on public.run_steps (run_id, created_at asc);

drop trigger if exists artifacts_set_updated_at on public.artifacts;
create trigger artifacts_set_updated_at
before update on public.artifacts
for each row
execute procedure public.set_updated_at();

drop trigger if exists runs_set_updated_at on public.runs;
create trigger runs_set_updated_at
before update on public.runs
for each row
execute procedure public.set_updated_at();
