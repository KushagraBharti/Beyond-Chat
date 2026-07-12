-- Phase 11 proposal only. This file is not a migration and must not be applied
-- before the canonical data-plane owner admits these tables.
create table private.automation_definitions (
  id uuid primary key,
  organization_id uuid not null references private.organizations(id),
  project_id uuid not null references private.projects(id),
  owner_id uuid not null references private.profiles(id),
  service_principal_id uuid,
  name text not null check (length(name) between 1 and 160),
  state text not null check (state in ('active','paused','disabled')),
  active_version_id uuid,
  revision bigint not null check (revision > 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (organization_id, id)
);
create index automation_definitions_org_project_idx on private.automation_definitions (organization_id, project_id);

create table private.automation_versions (
  id uuid primary key,
  organization_id uuid not null references private.organizations(id),
  automation_id uuid not null,
  ordinal integer not null check (ordinal > 0),
  content_hash text not null,
  effective_config jsonb not null,
  created_by uuid not null references private.profiles(id),
  created_at timestamptz not null,
  unique (automation_id, ordinal), unique (organization_id, id),
  foreign key (organization_id, automation_id) references private.automation_definitions (organization_id, id)
);
create index automation_versions_automation_idx on private.automation_versions (automation_id, ordinal desc);

alter table private.automation_definitions
  add foreign key (organization_id, active_version_id)
  references private.automation_versions (organization_id, id);

create table private.automation_executions (
  id uuid primary key,
  organization_id uuid not null references private.organizations(id),
  automation_id uuid not null,
  automation_version_id uuid not null,
  trigger_key text not null,
  state text not null check (state in ('queued','leased','running','awaiting_approval','retrying','completed','failed','dead_letter','canceled','skipped')),
  attempt integer not null default 0 check (attempt >= 0),
  cost_cents integer not null default 0 check (cost_cents >= 0),
  action_count integer not null default 0 check (action_count >= 0),
  input jsonb not null,
  pinned_config jsonb not null,
  lease_id text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz,
  runtime_run_id uuid,
  failure_code text,
  correlation_id uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (organization_id, automation_id, trigger_key),
  unique (organization_id, id),
  foreign key (organization_id, automation_id) references private.automation_definitions (organization_id, id),
  foreign key (organization_id, automation_version_id) references private.automation_versions (organization_id, id)
);
create index automation_execution_history_idx on private.automation_executions (organization_id, automation_id, created_at desc);
create index automation_execution_claim_idx on private.automation_executions (next_attempt_at, created_at) where state in ('queued','retrying');
create index automation_execution_lease_idx on private.automation_executions (lease_expires_at) where state in ('leased','running');

create table private.automation_action_receipts (
  organization_id uuid not null references private.organizations(id),
  execution_id uuid not null,
  destination_id text not null,
  provider_idempotency_key text not null,
  state text not null check (state in ('reserved','delivered','reconciled','failed_unknown')),
  created_at timestamptz not null,
  primary key (execution_id, destination_id),
  unique (organization_id, provider_idempotency_key),
  foreign key (organization_id, execution_id) references private.automation_executions (organization_id, id)
);
create index automation_action_receipts_org_idx on private.automation_action_receipts (organization_id, created_at desc);

-- Claim implementations must atomically UPDATE a row selected with
-- FOR UPDATE SKIP LOCKED and RETURNING. All tables remain in a private schema;
-- any future exposed read model requires RLS, FORCE RLS, tenant indexes, and
-- canonical authorization helpers approved by the identity/data-plane owner.
