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

create table if not exists public.user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    display_name text,
    avatar_url text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspaces (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid references auth.users(id) on delete set null,
    name text not null,
    slug text unique,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_members (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    unique (workspace_id, user_id)
);

create index if not exists workspaces_owner_idx
    on public.workspaces (owner_id, updated_at desc);

create index if not exists workspace_members_user_idx
    on public.workspace_members (user_id, workspace_id);

create index if not exists workspace_members_workspace_idx
    on public.workspace_members (workspace_id, user_id);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute procedure public.set_updated_at();

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row
execute procedure public.set_updated_at();

drop trigger if exists workspace_members_set_updated_at on public.workspace_members;
create trigger workspace_members_set_updated_at
before update on public.workspace_members
for each row
execute procedure public.set_updated_at();
