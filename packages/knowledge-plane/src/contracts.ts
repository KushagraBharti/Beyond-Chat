/** Schema-independent, versioned contracts. Database mappings belong to Phase 7B. */
export const KNOWLEDGE_SCHEMA_VERSION = "1.0" as const;

export type SchemaVersion = typeof KNOWLEDGE_SCHEMA_VERSION;
export type ConnectorKind = "google_drive" | "sharepoint_onedrive" | "notion" | "confluence" | "glean" | "databricks";
export type RetrievalMode = "synced" | "federated" | "live";
export type GovernedQuerySurface = "unity_catalog" | "genie" | "ai_search" | "function" | "mcp";
export type ConnectionState = "pending" | "connected" | "degraded" | "reauth_required" | "disconnected" | "deleted";
export type SyncState = "queued" | "running" | "succeeded" | "retrying" | "failed" | "dead_letter" | "cancelled";
export type TombstoneReason = "deleted" | "lost_permission" | "retention_expired" | "connector_disconnected";
export type PrincipalKind = "organization" | "project" | "user" | "team" | "external_group";
export type GrantEffect = "allow" | "deny";

export interface Versioned { readonly schema_version: SchemaVersion; }

export interface Scope extends Versioned {
  readonly organization_id: string;
  readonly project_id?: string;
  readonly user_id?: string;
  readonly team_ids?: readonly string[];
  readonly external_group_ids?: readonly string[];
}

export interface Principal extends Versioned { readonly kind: PrincipalKind; readonly id: string; }

export interface ConnectorDefinition extends Versioned {
  readonly id: string;
  readonly kind: ConnectorKind;
  readonly retrieval_mode: RetrievalMode;
  readonly version: string;
  readonly supports: Readonly<{ incremental_sync: boolean; reconciliation: boolean; inherited_acls: boolean; write: false }>;
}

/** Describes an intentionally offline Phase 7A adapter, never a live transport. */
export interface OfflineConnectorManifest extends Versioned {
  readonly definition: ConnectorDefinition;
  readonly transport: "offline_fake";
  readonly source_authority: "connector" | "federated" | "governed_query";
  readonly webhooks_are_wake_signals_only: true;
  readonly credentials: "not_present";
}

export interface KnowledgeConnection extends Versioned {
  readonly id: string;
  readonly definition_id: string;
  readonly scope: Scope;
  readonly owner_principal_id: string;
  /** A backend-owned opaque reference, never a credential value. */
  readonly credential_reference: string | null;
  readonly state: ConnectionState;
  readonly last_success_at: string | null;
  readonly last_error_code: string | null;
}

export interface SyncCursor extends Versioned { readonly connection_id: string; readonly value: string; readonly observed_at: string; readonly replay_from?: string; }
export interface SyncJob extends Versioned { readonly id: string; readonly connection_id: string; readonly idempotency_key: string; readonly state: SyncState; readonly cursor: SyncCursor | null; readonly started_at: string; readonly finished_at: string | null; }
export interface ReconciliationRequest extends Versioned { readonly connection_id: string; readonly requested_at: string; readonly authoritative: true; readonly cursor_replay_from: string | null; }
export interface ReconciliationReport extends Versioned { readonly connection_id: string; readonly started_at: string; readonly finished_at: string; readonly scanned_resources: number; readonly tombstones_created: number; readonly cursor_replayed: boolean; }
export interface DeletionPropagation extends Versioned { readonly resource_id: string; readonly reason: TombstoneReason; readonly detected_at: string; readonly retrieval_disabled_at: string; readonly derived_cleanup_due_at: string; }

export interface Resource extends Versioned {
  readonly id: string;
  readonly connection_id: string;
  readonly scope: Scope;
  readonly external_id: string;
  readonly parent_external_id: string | null;
  readonly title: string;
  readonly url: string;
  readonly owner_principal_id: string | null;
}

export interface Revision extends Versioned {
  readonly id: string;
  readonly resource_id: string;
  readonly external_revision_id: string;
  /** SHA-256 of the immutable source bytes, supplied by source ingestion/storage. */
  readonly immutable_digest: string;
  readonly observed_at: string;
  /** Citation metadata captured with this immutable source revision. */
  readonly source_title: string;
  readonly source_url: string;
  readonly source_owner_principal_id: string | null;
  readonly content: string;
  readonly deleted_at: string | null;
}

export interface AccessGrant extends Versioned {
  readonly id: string;
  readonly resource_id: string;
  readonly revision_id?: string;
  readonly principal_kind: PrincipalKind;
  readonly principal_id: string;
  readonly effect: GrantEffect;
  readonly inherited_from_resource_id: string | null;
}

export interface Extraction extends Versioned { readonly id: string; readonly revision_id: string; readonly extractor_version: string; readonly digest: string; readonly risk: ContentRisk; }
export interface ContentChunk extends Versioned { readonly id: string; readonly revision_id: string; readonly ordinal: number; readonly text: string; readonly lexical_terms: readonly string[]; readonly embedding_ref: string | null; readonly vector?: readonly number[]; }
export interface EmbeddingReference extends Versioned { readonly id: string; readonly chunk_id: string; readonly model: string; readonly dimension: number; readonly digest: string; }
export interface Tombstone extends Versioned { readonly resource_id: string; readonly revision_id?: string; readonly reason: TombstoneReason; readonly observed_at: string; readonly source_event_id: string; }

/** A citation pins one immutable, currently accessible source revision; it never advances to a newer revision. */
export interface Citation extends Versioned {
  readonly id: string;
  readonly resource_id: string;
  readonly revision_id: string;
  readonly chunk_id?: string;
  readonly title: string;
  readonly url: string;
  readonly owner_principal_id: string | null;
  readonly immutable_digest: string;
  readonly source_observed_at: string;
  readonly cited_at: string;
}
export interface RetrievalAudit extends Versioned { readonly id: string; readonly actor: Scope; readonly query_digest: string; readonly at: string; readonly candidate_count: number; readonly permitted_count: number; readonly results: readonly RetrievalAuditResult[]; }
export interface RetrievalAuditResult extends Versioned { readonly resource_id: string; readonly revision_id: string; readonly lexical_score: number; readonly vector_score: number; readonly hybrid_score: number; readonly citation_id: string; }

export interface ContentRisk extends Versioned { readonly classification: "clean" | "suspicious" | "malicious"; readonly signals: readonly string[]; readonly safe_boundary: "untrusted_source"; }
export interface FederatedQuery extends Versioned { readonly connection_id: string; readonly scope: Scope; readonly query: string; readonly actor_assertion_id: string; readonly mode: "federated"; }
/**
 * The text is a governed intent, not executable SQL. A Phase 7B gateway resolves
 * it against its current policy and the named Unity Catalog namespace.
 */
export interface GovernedQuery extends Versioned {
  readonly connection_id: string;
  readonly scope: Scope;
  readonly query: string;
  readonly actor_assertion_id: string;
  readonly mode: "live";
  readonly surface: GovernedQuerySurface;
  readonly catalog: string;
  readonly schema: string;
}

export interface SourceDeltaBase extends Versioned {
  readonly event_id: string;
  readonly external_id: string;
  readonly external_revision_id: string;
  readonly cursor: string;
  readonly acl: readonly Omit<AccessGrant, "schema_version" | "id" | "resource_id" | "revision_id">[];
}
export interface SourceUpsertDelta extends SourceDeltaBase {
  readonly kind: "upsert";
  readonly title: string;
  readonly url: string;
  /** Explicit source ownership snapshot; null only when the source cannot expose one. */
  readonly owner_principal_id: string | null;
  readonly content: string;
  readonly digest: string;
  readonly parent_external_id: string | null;
}
export interface SourceAclRefreshDelta extends SourceDeltaBase { readonly kind: "acl_refresh"; }
export interface SourceTombstoneDelta extends SourceDeltaBase { readonly kind: "deleted" | "lost_permission"; }
export type SourceDelta = SourceUpsertDelta | SourceAclRefreshDelta | SourceTombstoneDelta;

export interface ConnectorAdapter {
  readonly definition: ConnectorDefinition;
  readonly enumerate: (cursor: SyncCursor | null) => AsyncIterable<SourceDelta>;
  readonly reconcile: () => AsyncIterable<SourceDelta>;
}
