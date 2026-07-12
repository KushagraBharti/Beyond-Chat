export const MEMORY_SCHEMA_VERSION = "1.0" as const;

export type MemoryScopeKind = "user" | "project" | "team";
export type MemoryEntryType = "episodic_summary" | "semantic_fact" | "procedure" | "preference" | "decision";
export type MemoryStatus = "active" | "superseded" | "expired" | "deleted";
export type ProposalStatus = "proposed" | "accepted" | "rejected";
export type ProposalReason = "explicit_remember" | "runtime_candidate" | "contradiction" | "compaction" | "edit";
export type Sensitivity = "normal" | "sensitive" | "restricted";
export type AgentAudience = "personal" | "shared";

export interface MemoryScope {
  readonly kind: MemoryScopeKind;
  readonly organization_id: string;
  readonly owner_id: string;
  readonly project_id?: string;
  readonly team_id?: string;
}

export interface MemorySpace {
  readonly schema_version: typeof MEMORY_SCHEMA_VERSION;
  readonly id: string;
  readonly scope: MemoryScope;
  readonly label: string;
  readonly enabled: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface MemoryProvenance {
  readonly source_event_ids: readonly string[];
  readonly source_run_id: string | null;
  readonly source_output_id: string | null;
  readonly created_by_user_id: string;
}

export interface MemoryProposal {
  readonly schema_version: typeof MEMORY_SCHEMA_VERSION;
  readonly id: string;
  readonly space_id: string;
  readonly type: MemoryEntryType;
  readonly key: string;
  readonly content: string;
  readonly structured_facts: Readonly<Record<string, string | number | boolean | null>>;
  readonly reason: ProposalReason;
  readonly status: ProposalStatus;
  readonly sensitivity: Sensitivity;
  readonly confidence: number;
  readonly provenance: MemoryProvenance;
  readonly contradicts_entry_id: string | null;
  readonly proposed_at: string;
  readonly decided_at: string | null;
  readonly decided_by_user_id: string | null;
  readonly rejection_reason: string | null;
  readonly expires_at: string | null;
}

export interface MemoryEntry {
  readonly schema_version: typeof MEMORY_SCHEMA_VERSION;
  readonly id: string;
  readonly space_id: string;
  readonly type: MemoryEntryType;
  readonly key: string;
  readonly content: string;
  readonly structured_facts: Readonly<Record<string, string | number | boolean | null>>;
  readonly status: MemoryStatus;
  readonly sensitivity: Sensitivity;
  readonly confidence: number;
  readonly provenance: MemoryProvenance;
  readonly current_revision_id: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly last_used_at: string | null;
  readonly expires_at: string | null;
  readonly deleted_at: string | null;
  readonly embedding_index_version: string | null;
}

export interface MemoryRevision {
  readonly schema_version: typeof MEMORY_SCHEMA_VERSION;
  readonly id: string;
  readonly entry_id: string;
  readonly ordinal: number;
  readonly content: string;
  readonly structured_facts: MemoryEntry["structured_facts"];
  readonly sensitivity: Sensitivity;
  readonly reason: "accepted" | "edited" | "contradiction_resolved";
  readonly created_at: string;
  readonly created_by_user_id: string;
  readonly source_proposal_id: string;
}

export interface MemoryActor {
  readonly organization_id: string;
  readonly user_id: string;
  readonly project_id?: string;
  readonly team_ids: readonly string[];
  readonly agent_audience: AgentAudience;
  /** Personal spaces must be named explicitly for a shared agent. */
  readonly attached_personal_space_ids: readonly string[];
}

export interface RecallRequest {
  readonly query: string;
  readonly actor: MemoryActor;
  readonly limit?: number;
  readonly now: string;
}

export interface RecallExplanation {
  readonly scope: MemoryScopeKind;
  readonly reasons: readonly string[];
  readonly source_event_ids: readonly string[];
  readonly last_updated_at: string;
  readonly sensitivity: Sensitivity;
}

export interface MemoryRecall {
  readonly entry: MemoryEntry;
  readonly score: number;
  readonly explanation: RecallExplanation;
}

export interface MemoryRetrieval {
  readonly schema_version: typeof MEMORY_SCHEMA_VERSION;
  readonly id: string;
  readonly actor: MemoryActor;
  readonly query_digest: string;
  readonly requested_at: string;
  readonly candidate_count: number;
  readonly recalled_entry_ids: readonly string[];
  readonly denied: ReadonlyArray<{ readonly entry_id: string; readonly reason: string }>;
}

export interface DurableEventReference {
  readonly event_id: string;
  readonly run_id: string;
  readonly sequence: number;
  readonly occurred_at: string;
  readonly summary_fragment: string;
}

export interface MemoryPolicy {
  readonly team_memory_enabled: boolean;
  readonly allow_sensitive_memory: boolean;
  readonly allow_restricted_memory: boolean;
  readonly default_retention_days: number | null;
  readonly max_recall_age_days: number | null;
}

export interface CleanupRequest {
  readonly entry_id: string;
  readonly space_id: string;
  readonly reason: "deleted" | "expired";
  readonly requested_at: string;
  readonly targets: readonly ["embedding_index", "retrieval_cache"];
}

export interface MemorySnapshot {
  readonly spaces: readonly MemorySpace[];
  readonly proposals: readonly MemoryProposal[];
  readonly entries: readonly MemoryEntry[];
  readonly revisions: readonly MemoryRevision[];
  readonly retrievals: readonly MemoryRetrieval[];
}

export interface MemoryPersistencePort {
  load(): Promise<MemorySnapshot>;
  save(snapshot: MemorySnapshot): Promise<void>;
  requestDerivedCleanup(request: CleanupRequest): Promise<void>;
}

export interface IdentityAuthorizationPort {
  assertCanManageSpace(actor: MemoryActor, scope: MemoryScope): Promise<void>;
  assertCanReadSpace(actor: MemoryActor, scope: MemoryScope): Promise<void>;
}

export interface RuntimeMemoryPort {
  recall(request: RecallRequest): Promise<readonly MemoryRecall[]>;
  propose(input: ProposeMemoryInput): Promise<MemoryProposal>;
}

export interface ProposeMemoryInput {
  readonly actor: MemoryActor;
  readonly space_id: string;
  readonly type: MemoryEntryType;
  readonly key: string;
  readonly content: string;
  readonly structured_facts?: MemoryProposal["structured_facts"];
  readonly reason: ProposalReason;
  readonly sensitivity?: Sensitivity;
  readonly confidence?: number;
  readonly provenance: MemoryProvenance;
  readonly expires_at?: string | null;
  readonly now: string;
}
