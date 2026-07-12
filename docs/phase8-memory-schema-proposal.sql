-- PHASE 8 PROPOSAL ONLY. Do not add this file to the migration chain yet.
-- Identity/RLS/event foreign keys must be resolved against the canonical Phase 2/3 schema.

create type memory_scope_kind as enum ('user', 'project', 'team');
create type memory_entry_status as enum ('active', 'superseded', 'expired', 'deleted');
create type memory_proposal_status as enum ('proposed', 'accepted', 'rejected');
create type memory_sensitivity as enum ('normal', 'sensitive', 'restricted');

create table memory_spaces (
  id uuid primary key,
  organization_id uuid not null,
  scope_kind memory_scope_kind not null,
  owner_id uuid not null,
  project_id uuid,
  team_id uuid,
  label text not null check (length(label) between 1 and 160),
  enabled boolean not null default true,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  check ((scope_kind = 'user' and project_id is null and team_id is null)
      or (scope_kind = 'project' and project_id is not null and team_id is null)
      or (scope_kind = 'team' and team_id is not null and project_id is null))
);

create table memory_entries (
  id uuid primary key,
  space_id uuid not null references memory_spaces(id),
  entry_type text not null,
  memory_key text not null,
  content text not null,
  structured_facts jsonb not null default '{}'::jsonb,
  status memory_entry_status not null,
  sensitivity memory_sensitivity not null,
  confidence double precision not null check (confidence between 0 and 1),
  current_revision_id uuid,
  source_run_id uuid,
  source_output_id uuid,
  created_by_user_id uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  last_used_at timestamptz,
  expires_at timestamptz,
  deleted_at timestamptz,
  embedding_index_version text
);

create unique index memory_entries_one_active_key
  on memory_entries (space_id, memory_key) where status = 'active';
create index memory_entries_recall_candidates
  on memory_entries (space_id, status, expires_at, updated_at desc);

create table memory_proposals (
  id uuid primary key,
  space_id uuid not null references memory_spaces(id),
  entry_type text not null,
  memory_key text not null,
  content text not null,
  structured_facts jsonb not null default '{}'::jsonb,
  reason text not null,
  status memory_proposal_status not null,
  sensitivity memory_sensitivity not null,
  confidence double precision not null check (confidence between 0 and 1),
  contradicts_entry_id uuid references memory_entries(id),
  source_run_id uuid,
  source_output_id uuid,
  created_by_user_id uuid not null,
  proposed_at timestamptz not null,
  decided_at timestamptz,
  decided_by_user_id uuid,
  rejection_reason text,
  expires_at timestamptz
);

create table memory_revisions (
  id uuid primary key,
  entry_id uuid not null references memory_entries(id),
  ordinal integer not null check (ordinal > 0),
  content text not null,
  structured_facts jsonb not null default '{}'::jsonb,
  sensitivity memory_sensitivity not null,
  reason text not null,
  source_proposal_id uuid not null references memory_proposals(id),
  created_at timestamptz not null,
  created_by_user_id uuid not null,
  unique (entry_id, ordinal)
);

alter table memory_entries add constraint memory_entries_current_revision_fk
  foreign key (current_revision_id) references memory_revisions(id) deferrable initially deferred;

create table memory_event_references (
  memory_proposal_id uuid not null references memory_proposals(id),
  event_id uuid not null,
  run_id uuid not null,
  event_sequence bigint not null check (event_sequence > 0),
  primary key (memory_proposal_id, event_id),
  unique (memory_proposal_id, run_id, event_sequence)
);

create table memory_retrievals (
  id uuid primary key,
  organization_id uuid not null,
  actor_user_id uuid not null,
  project_id uuid,
  agent_audience text not null check (agent_audience in ('personal', 'shared')),
  query_digest text not null,
  requested_at timestamptz not null,
  candidate_count integer not null check (candidate_count >= 0),
  recalled_entry_ids uuid[] not null default '{}',
  denial_reasons jsonb not null default '[]'::jsonb
);

create table memory_cleanup_outbox (
  id uuid primary key,
  entry_id uuid not null references memory_entries(id),
  cleanup_reason text not null check (cleanup_reason in ('deleted', 'expired')),
  requested_at timestamptz not null,
  completed_at timestamptz,
  attempts integer not null default 0,
  unique (entry_id, cleanup_reason, requested_at)
);

-- Required before migration admission:
-- 1. Add canonical identity/project/team/run/output/event foreign keys.
-- 2. Enable RLS on every table and add fail-closed policies using Phase 2 helpers.
-- 3. Restrict direct writes; expose transactional command functions for decisions/revisions/deletion.
-- 4. Add a retrieval audit retention policy and outbox worker ownership.
