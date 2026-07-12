create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  event_id text not null unique,
  event_type text not null,
  livemode boolean not null,
  payload jsonb not null default '{}'::jsonb,
  state text not null check (state in ('pending','processed','failed')),
  failure_reason text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.billing_subscriptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  customer_id text not null,
  subscription_id text not null unique,
  status text not null,
  quantity integer not null check (quantity >= 0),
  provider_event_created bigint not null,
  current_period_end bigint,
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_entitlements (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  state text not null check (state in ('enabled','grace','disabled')),
  reason text not null,
  source_subscription_id text,
  updated_at timestamptz not null default now()
);

alter table public.billing_events enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_entitlements enable row level security;

revoke all on public.billing_events from anon, authenticated;
revoke all on public.billing_subscriptions from anon, authenticated;
revoke all on public.billing_entitlements from anon, authenticated;
grant all on public.billing_events to service_role;
grant all on public.billing_subscriptions to service_role;
grant all on public.billing_entitlements to service_role;
