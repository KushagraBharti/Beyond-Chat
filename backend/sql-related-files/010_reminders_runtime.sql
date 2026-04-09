create extension if not exists "pgcrypto";

create table if not exists public.reminders (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    created_by uuid references auth.users(id) on delete set null,
    title text not null,
    note text not null,
    due_at timestamptz not null,
    status text not null default 'open' check (status in ('open', 'completed', 'dismissed')),
    source text not null default 'internal',
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists reminders_workspace_due_idx
    on public.reminders (workspace_id, due_at asc);

create index if not exists reminders_workspace_status_idx
    on public.reminders (workspace_id, status, due_at asc);

drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at
before update on public.reminders
for each row
execute procedure public.set_updated_at();

alter table if exists public.reminders enable row level security;

drop policy if exists reminders_workspace_access on public.reminders;
create policy reminders_workspace_access on public.reminders
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
