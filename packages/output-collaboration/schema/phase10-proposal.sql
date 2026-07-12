-- Phase 10 proposal only. Do not apply before the canonical schema owner reviews it.
-- UUID defaults, tenant RLS helpers, and updated_at triggers intentionally come from the canonical schema.
create table outputs (id uuid primary key, organization_id uuid not null, project_id uuid not null, kind text not null, title text not null, lifecycle text not null, head_version_id uuid, promoted_branch_id uuid, created_by uuid not null, created_at timestamptz not null, updated_at timestamptz not null);
create table output_versions (id uuid primary key, output_id uuid not null references outputs(id), branch_id uuid not null, ordinal bigint not null, parent_version_id uuid references output_versions(id), payload jsonb not null, content_hash text not null, checkpoint_label text not null, created_by uuid not null, created_at timestamptz not null, unique(output_id, ordinal));
alter table outputs add constraint outputs_head_version_fk foreign key (head_version_id) references output_versions(id);
create table output_renders (id uuid primary key, version_id uuid not null references output_versions(id), capability text not null, media_type text, storage_key text, message text not null, created_at timestamptz not null);
create table output_validations (id uuid primary key, version_id uuid not null references output_versions(id), status text not null, checks jsonb not null, created_at timestamptz not null);
create table project_shares (project_id uuid not null, user_id uuid not null, permissions text[] not null, revision bigint not null, revoked_at timestamptz, primary key(project_id, user_id));
create table comments (id uuid primary key, output_id uuid not null references outputs(id), version_id uuid not null references output_versions(id), parent_comment_id uuid references comments(id), author_id uuid not null, body text not null, anchor jsonb not null, created_at timestamptz not null);
create table mentions (comment_id uuid not null references comments(id), user_id uuid not null, created_at timestamptz not null, primary key(comment_id, user_id));
create table notifications (id uuid primary key, user_id uuid not null, type text not null, resource_id uuid not null, created_at timestamptz not null, read_at timestamptz);
create table review_requests (id uuid primary key, output_id uuid not null references outputs(id), version_id uuid not null references output_versions(id), requested_by uuid not null, reviewer_id uuid not null, status text not null, decision_note text, created_at timestamptz not null, decided_at timestamptz);
create table activity_events (id uuid primary key, output_id uuid not null references outputs(id), actor_id uuid not null, action text not null, detail jsonb not null, created_at timestamptz not null);
create index output_versions_output_created_idx on output_versions(output_id, created_at desc);
create index comments_output_created_idx on comments(output_id, created_at);
create index notifications_user_unread_idx on notifications(user_id, created_at desc) where read_at is null;
create index reviews_reviewer_pending_idx on review_requests(reviewer_id, created_at desc) where status = 'pending';

-- Required policy shape: every table derives organization/project from verified identity and
-- project membership. Realtime channels must use private authorization and remove a subscriber
-- as soon as project_shares.revision changes to a revoked grant.
