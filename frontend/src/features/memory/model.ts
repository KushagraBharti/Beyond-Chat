export type MemoryScopeKind = "user" | "project" | "team";
export type MemorySensitivity = "normal" | "sensitive" | "restricted";

export interface MemoryEntryView {
  readonly id: string;
  readonly spaceId: string;
  readonly scope: MemoryScopeKind;
  readonly type: "episodic_summary" | "semantic_fact" | "procedure" | "preference" | "decision";
  readonly key: string;
  readonly content: string;
  readonly sensitivity: MemorySensitivity;
  readonly updatedAt: string;
  readonly expiresAt: string | null;
  readonly sourceEventIds: readonly string[];
}

export interface MemoryProposalView {
  readonly id: string;
  readonly scope: MemoryScopeKind;
  readonly reason: "explicit_remember" | "runtime_candidate" | "contradiction" | "compaction" | "edit";
  readonly key: string;
  readonly content: string;
  readonly sensitivity: MemorySensitivity;
  readonly contradictsEntryId: string | null;
  readonly proposedAt: string;
}

export interface RecallExplanationView {
  readonly entryId: string;
  readonly scope: MemoryScopeKind;
  readonly reasons: readonly string[];
  readonly sourceEventIds: readonly string[];
  readonly lastUpdatedAt: string;
  readonly score: number;
}

export interface MemoryUiActions {
  readonly onAcceptProposal: (proposalId: string) => void | Promise<void>;
  readonly onRejectProposal: (proposalId: string) => void | Promise<void>;
  readonly onEditEntry: (entryId: string, content: string) => void | Promise<void>;
  readonly onDeleteEntry: (entryId: string) => void | Promise<void>;
  readonly onSetSpaceEnabled: (spaceId: string, enabled: boolean) => void | Promise<void>;
  readonly onExport: () => void | Promise<void>;
}
