-- ============================================================
-- 011_billing.sql
-- Stripe subscription state and usage tracking.
-- ============================================================

create table if not exists public.user_plans (
    user_id uuid primary key references auth.users(id) on delete cascade,
    stripe_customer_id text unique,
    stripe_subscription_id text unique,
    plan text not null default 'free',
    status text not null default 'active',
    current_period_end timestamptz,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint user_plans_plan_check check (plan in ('free', 'pro')),
    constraint user_plans_status_check check (
        status in ('active', 'trialing', 'past_due', 'cancelled', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')
    )
);

create table if not exists public.usage_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    event_type text not null,
    model text,
    estimated_cost_usd numeric(10, 6) not null default 0,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_plans_stripe_customer_idx
    on public.user_plans (stripe_customer_id)
    where stripe_customer_id is not null;

create index if not exists user_plans_stripe_subscription_idx
    on public.user_plans (stripe_subscription_id)
    where stripe_subscription_id is not null;

create index if not exists usage_events_user_month_idx
    on public.usage_events (user_id, created_at desc);

create index if not exists usage_events_workspace_month_idx
    on public.usage_events (workspace_id, created_at desc);

drop trigger if exists set_user_plans_updated_at on public.user_plans;
create trigger set_user_plans_updated_at
before update on public.user_plans
for each row execute procedure public.set_updated_at();

alter table public.user_plans enable row level security;
alter table public.usage_events enable row level security;

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
using (public.is_workspace_member(workspace_id));
