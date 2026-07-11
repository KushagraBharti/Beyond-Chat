-- Idempotent hardening for Supabase security advisor findings.
-- Billing tables must remain independently readable only by their owning user.
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
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists reminders_workspace_due_idx
    on public.reminders (workspace_id, due_at asc);
create index if not exists reminders_workspace_status_idx
    on public.reminders (workspace_id, status, due_at asc);

drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at
before update on public.reminders
for each row execute procedure public.set_updated_at();

alter table public.reminders enable row level security;
drop policy if exists reminders_workspace_access on public.reminders;
create policy reminders_workspace_access on public.reminders
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create table if not exists public.user_plans (
    user_id uuid primary key references auth.users(id) on delete cascade,
    stripe_customer_id text unique,
    stripe_subscription_id text unique,
    plan text not null default 'free' check (plan in ('free', 'pro')),
    status text not null default 'active' check (
        status in ('active', 'trialing', 'past_due', 'cancelled', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')
    ),
    current_period_end timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    event_type text not null,
    model text,
    estimated_cost_usd numeric(10, 6) not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists user_plans_stripe_customer_idx
    on public.user_plans (stripe_customer_id) where stripe_customer_id is not null;
create index if not exists user_plans_stripe_subscription_idx
    on public.user_plans (stripe_subscription_id) where stripe_subscription_id is not null;
create index if not exists usage_events_user_month_idx
    on public.usage_events (user_id, created_at desc);
create index if not exists usage_events_workspace_month_idx
    on public.usage_events (workspace_id, created_at desc);

drop trigger if exists set_user_plans_updated_at on public.user_plans;
create trigger set_user_plans_updated_at
before update on public.user_plans
for each row execute procedure public.set_updated_at();

alter table if exists public.user_plans enable row level security;
alter table if exists public.usage_events enable row level security;

drop policy if exists user_plans_self_select on public.user_plans;
create policy user_plans_self_select on public.user_plans
for select
using (user_id = (select auth.uid()));

drop policy if exists usage_events_self_select on public.usage_events;
create policy usage_events_self_select on public.usage_events
for select
using (user_id = (select auth.uid()));

drop policy if exists usage_events_workspace_select on public.usage_events;
create policy usage_events_workspace_select on public.usage_events
for select
using (
    workspace_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_workspace_member(workspace_id::uuid)
);

-- SECURITY DEFINER helper RPCs should not be executable by anonymous users.
-- Authenticated execution is retained because the API bootstraps workspaces through
-- ensure_workspace_for_user with the caller's Supabase access token.
revoke execute on function public.ensure_workspace_for_user(uuid, text, text, jsonb) from public, anon;
grant execute on function public.ensure_workspace_for_user(uuid, text, text, jsonb) to authenticated, service_role;

revoke execute on function public.handle_new_user_workspace() from public, anon;

revoke execute on function public.current_workspace_ids() from public, anon;
grant execute on function public.current_workspace_ids() to authenticated, service_role;

revoke execute on function public.current_admin_workspace_ids() from public, anon;
grant execute on function public.current_admin_workspace_ids() to authenticated, service_role;

revoke execute on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;

revoke execute on function public.can_manage_workspace(uuid) from public, anon;
grant execute on function public.can_manage_workspace(uuid) to authenticated, service_role;

do $$
declare
    fn record;
begin
    for fn in
        select p.oid::regprocedure::text as signature
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'rls_auto_enable'
    loop
        execute format('revoke execute on function %s from public, anon', fn.signature);
    end loop;
end $$;
