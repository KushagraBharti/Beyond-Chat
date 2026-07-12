import type { AccessGrant, Citation, FederatedQuery, GovernedQuery, KnowledgeConnection, Scope, SourceDelta, SyncCursor, SyncJob } from "./contracts.ts";

const SHA_256 = /^[a-f0-9]{64}$/;
const OPAQUE_IDENTIFIER = /^\S+$/;
const SQL_SHAPED_QUERY = /\b(?:select|insert|update|delete|drop|alter|create|grant|revoke|copy|merge|truncate)\b|;|--|\/\*/i;
const PRINCIPAL_KINDS = new Set(["organization", "project", "user", "team", "external_group"]);
const GRANT_EFFECTS = new Set(["allow", "deny"]);
const CONNECTION_STATES = new Set(["pending", "connected", "degraded", "reauth_required", "disconnected", "deleted"]);
const SYNC_STATES = new Set(["queued", "running", "succeeded", "retrying", "failed", "dead_letter", "cancelled"]);

function requireText(value: string, label: string): void {
  if (!OPAQUE_IDENTIFIER.test(value)) throw new Error(`${label} must be a non-empty whitespace-free identifier`);
}

function requireTimestamp(value: string, label: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${label} must be an ISO-8601 timestamp`);
}

export function assertScope(scope: Scope): void {
  if (scope.schema_version !== "1.0") throw new Error("Knowledge scope has an unsupported schema version");
  requireText(scope.organization_id, "organization_id");
  for (const [label, value] of [["project_id", scope.project_id], ["user_id", scope.user_id]] as const) {
    if (value !== undefined) requireText(value, label);
  }
  for (const [label, values] of [["team_ids", scope.team_ids], ["external_group_ids", scope.external_group_ids]] as const) {
    if (values?.some((value) => !OPAQUE_IDENTIFIER.test(value))) throw new Error(`${label} must contain non-empty identifiers`);
  }
}

export function assertAccessGrant(grant: AccessGrant): void {
  if (grant.schema_version !== "1.0") throw new Error("Access grants have an unsupported schema version");
  requireText(grant.id, "access_grant.id");
  requireText(grant.resource_id, "access_grant.resource_id");
  requireText(grant.principal_id, "access_grant.principal_id");
  if (!PRINCIPAL_KINDS.has(grant.principal_kind) || !GRANT_EFFECTS.has(grant.effect)) throw new Error("Access grant has an unsupported principal kind or effect");
  if (grant.revision_id !== undefined) requireText(grant.revision_id, "access_grant.revision_id");
  if (grant.inherited_from_resource_id !== null) requireText(grant.inherited_from_resource_id, "access_grant.inherited_from_resource_id");
}

export function assertKnowledgeConnection(connection: KnowledgeConnection): void {
  if (connection.schema_version !== "1.0") throw new Error("Knowledge connections have an unsupported schema version");
  requireText(connection.id, "connection.id");
  requireText(connection.definition_id, "connection.definition_id");
  requireText(connection.owner_principal_id, "connection.owner_principal_id");
  assertScope(connection.scope);
  if (!CONNECTION_STATES.has(connection.state)) throw new Error("Knowledge connection has an unsupported state");
  if (connection.credential_reference !== null) requireText(connection.credential_reference, "connection.credential_reference");
  if (connection.last_success_at !== null) requireTimestamp(connection.last_success_at, "connection.last_success_at");
}

export function assertSyncCursor(cursor: SyncCursor): void {
  if (cursor.schema_version !== "1.0") throw new Error("Sync cursors have an unsupported schema version");
  requireText(cursor.connection_id, "cursor.connection_id");
  requireText(cursor.value, "cursor.value");
  requireTimestamp(cursor.observed_at, "cursor.observed_at");
  if (cursor.replay_from !== undefined) requireText(cursor.replay_from, "cursor.replay_from");
}

export function assertSyncJob(job: SyncJob): void {
  if (job.schema_version !== "1.0") throw new Error("Sync jobs have an unsupported schema version");
  requireText(job.id, "sync_job.id");
  requireText(job.connection_id, "sync_job.connection_id");
  requireText(job.idempotency_key, "sync_job.idempotency_key");
  if (!SYNC_STATES.has(job.state)) throw new Error("Sync job has an unsupported state");
  requireTimestamp(job.started_at, "sync_job.started_at");
  if (job.finished_at !== null) requireTimestamp(job.finished_at, "sync_job.finished_at");
  if (job.cursor !== null) {
    assertSyncCursor(job.cursor);
    if (job.cursor.connection_id !== job.connection_id) throw new Error("Sync job cursor belongs to a different connection");
  }
}

export function assertSourceDelta(delta: SourceDelta): void {
  if (delta.schema_version !== "1.0") throw new Error("Source deltas have an unsupported schema version");
  for (const [label, value] of [["event_id", delta.event_id], ["external_id", delta.external_id], ["external_revision_id", delta.external_revision_id], ["cursor", delta.cursor]] as const) requireText(value, label);
  for (const grant of delta.acl) {
    requireText(grant.principal_id, "source_acl.principal_id");
    if (!PRINCIPAL_KINDS.has(grant.principal_kind) || !GRANT_EFFECTS.has(grant.effect)) throw new Error("Source ACL has an unsupported principal kind or effect");
    if (grant.inherited_from_resource_id !== null) requireText(grant.inherited_from_resource_id, "source_acl.inherited_from_resource_id");
  }
  if (delta.kind !== "upsert") return;
  if (!delta.title.trim() || !delta.content || !SHA_256.test(delta.digest)) throw new Error("Upsert deltas require title, content, and a lowercase SHA-256 digest");
  if (delta.owner_principal_id !== null) requireText(delta.owner_principal_id, "source_owner_principal_id");
  const url = new URL(delta.url);
  if (url.protocol !== "https:") throw new Error("Upsert source URLs must use HTTPS");
}

export function assertCitation(citation: Citation): void {
  if (citation.schema_version !== "1.0") throw new Error("Citation has an unsupported schema version");
  for (const [label, value] of [["citation.id", citation.id], ["citation.resource_id", citation.resource_id], ["citation.revision_id", citation.revision_id], ["citation.title", citation.title], ["citation.immutable_digest", citation.immutable_digest]] as const) requireText(value, label);
  if (citation.chunk_id !== undefined) requireText(citation.chunk_id, "citation.chunk_id");
  if (!SHA_256.test(citation.immutable_digest)) throw new Error("Citations require a lowercase SHA-256 immutable digest");
  const url = new URL(citation.url);
  if (url.protocol !== "https:") throw new Error("Citation URLs must use HTTPS");
  requireTimestamp(citation.source_observed_at, "citation.source_observed_at");
  requireTimestamp(citation.cited_at, "citation.cited_at");
  if (citation.owner_principal_id !== null) requireText(citation.owner_principal_id, "citation.owner_principal_id");
}

export function assertFederatedQuery(query: FederatedQuery): FederatedQuery {
  if (query.schema_version !== "1.0" || query.mode !== "federated") throw new Error("Federated query has an unsupported contract");
  requireText(query.connection_id, "federated.connection_id");
  if (!query.query.trim()) throw new Error("Federated queries require a non-empty query");
  requireText(query.actor_assertion_id, "federated.actor_assertion_id");
  assertScope(query.scope);
  return Object.freeze({ ...query });
}

export function assertGovernedQuery(query: GovernedQuery): GovernedQuery {
  if (query.schema_version !== "1.0" || query.mode !== "live") throw new Error("Governed query has an unsupported contract");
  requireText(query.connection_id, "governed.connection_id");
  requireText(query.actor_assertion_id, "governed.actor_assertion_id");
  requireText(query.catalog, "governed.catalog");
  requireText(query.schema, "governed.schema");
  if (!query.query.trim() || SQL_SHAPED_QUERY.test(query.query)) throw new Error("Databricks governed queries accept intent, never raw SQL");
  assertScope(query.scope);
  return Object.freeze({ ...query });
}
