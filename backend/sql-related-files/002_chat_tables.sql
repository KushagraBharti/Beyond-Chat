create extension if not exists "pgcrypto";

create table if not exists public.chat_collections (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    kind text not null check (kind in ('project', 'group', 'chat')),
    title text not null,
    metadata jsonb not null default '{}'::jsonb,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_collections_workspace_idx
    on public.chat_collections (workspace_id, updated_at desc);

create table if not exists public.chat_threads (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    collection_id uuid references public.chat_collections(id) on delete set null,
    collection_type text not null default 'chat' check (collection_type in ('project', 'group', 'chat')),
    studio text not null default 'chat',
    title text not null,
    prompt text,
    model text not null,
    metadata jsonb not null default '{}'::jsonb,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_threads_workspace_idx
    on public.chat_threads (workspace_id, updated_at desc);

create index if not exists chat_threads_collection_idx
    on public.chat_threads (collection_id, updated_at desc);

create table if not exists public.chat_messages (
    id uuid primary key default gen_random_uuid(),
    thread_id uuid not null references public.chat_threads(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    role text not null check (role in ('system', 'user', 'assistant', 'tool')),
    content text not null,
    metadata jsonb not null default '{}'::jsonb,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_messages_thread_idx
    on public.chat_messages (thread_id, created_at asc);

create index if not exists chat_messages_workspace_idx
    on public.chat_messages (workspace_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists chat_collections_set_updated_at on public.chat_collections;
create trigger chat_collections_set_updated_at
before update on public.chat_collections
for each row
execute procedure public.set_updated_at();

drop trigger if exists chat_threads_set_updated_at on public.chat_threads;
create trigger chat_threads_set_updated_at
before update on public.chat_threads
for each row
execute procedure public.set_updated_at();
