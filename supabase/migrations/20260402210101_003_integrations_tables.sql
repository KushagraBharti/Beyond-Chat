create extension if not exists "pgcrypto";

create table if not exists public.integration_connections (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    provider text not null,
    status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'not_configured', 'error')),
    external_account_id text,
    access_token text,
    refresh_token text,
    expires_at timestamptz,
    last_synced_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, provider, user_id),
    constraint integration_connections_id_workspace_provider_unique unique (id, workspace_id, provider)
);

create index if not exists integration_connections_workspace_idx
    on public.integration_connections (workspace_id, provider, updated_at desc);

create table if not exists public.integration_sync_logs (
    id uuid primary key default gen_random_uuid(),
    connection_id uuid not null,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    provider text not null,
    sync_status text not null check (sync_status in ('queued', 'running', 'completed', 'failed')),
    summary text,
    metadata jsonb not null default '{}'::jsonb,
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    foreign key (connection_id, workspace_id, provider)
        references public.integration_connections(id, workspace_id, provider)
        on delete cascade
);

create index if not exists integration_sync_logs_workspace_idx
    on public.integration_sync_logs (workspace_id, started_at desc);

drop trigger if exists integration_connections_set_updated_at on public.integration_connections;
create trigger integration_connections_set_updated_at
before update on public.integration_connections
for each row
execute procedure public.set_updated_at();
