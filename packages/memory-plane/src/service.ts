import { createHash } from "node:crypto";
import type {
  DurableEventReference, IdentityAuthorizationPort, MemoryActor, MemoryEntry, MemoryPersistencePort, MemoryPolicy,
  MemoryProposal, MemoryRecall, MemoryRetrieval, MemoryRevision, MemoryScope, MemorySnapshot, MemorySpace,
  ProposeMemoryInput, RecallRequest, RuntimeMemoryPort, Sensitivity,
} from "./contracts.ts";
import { MEMORY_SCHEMA_VERSION } from "./contracts.ts";
import { assertScopeShape, canAccessSpace, isExpired, MemoryPolicyError, sensitivityAllowed } from "./policy.ts";

const freeze = <T>(value: T): T => Object.freeze(value);
const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const id = (prefix: string, value: unknown): string => `${prefix}_${digest(value).slice(0, 24)}`;
const words = (value: string): string[] => [...new Set(value.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? [])];
const defaultAuthorization: IdentityAuthorizationPort = {
  async assertCanManageSpace() {},
  async assertCanReadSpace() {},
};

function replace<T extends { readonly id: string }>(items: readonly T[], next: T): readonly T[] {
  return freeze(items.map((item) => item.id === next.id ? next : item));
}

export class MemoryService implements RuntimeMemoryPort {
  private readonly persistence: MemoryPersistencePort;
  private readonly policy: MemoryPolicy;
  private readonly authorization: IdentityAuthorizationPort;
  constructor(
    persistence: MemoryPersistencePort,
    policy: MemoryPolicy,
    authorization: IdentityAuthorizationPort = defaultAuthorization,
  ) { this.persistence = persistence; this.policy = policy; this.authorization = authorization; }

  async createSpace(actor: MemoryActor, input: { readonly scope: MemoryScope; readonly label: string; readonly now: string }): Promise<MemorySpace> {
    assertScopeShape(input.scope);
    if (input.scope.kind === "team" && !this.policy.team_memory_enabled) throw new MemoryPolicyError("team.gated", "Team memory is not enabled");
    await this.authorization.assertCanManageSpace(actor, input.scope);
    const accessProbe: MemorySpace = { schema_version: MEMORY_SCHEMA_VERSION, id: "pending", scope: input.scope, label: input.label, enabled: true, created_at: input.now, updated_at: input.now };
    const access = canAccessSpace(actor, accessProbe, this.policy);
    if (!access.allowed) throw new MemoryPolicyError("scope.denied", access.reason);
    const snapshot = await this.persistence.load();
    const space = freeze({ ...accessProbe, id: id("msp", [input.scope, input.label, input.now]) });
    await this.persistence.save({ ...snapshot, spaces: freeze([...snapshot.spaces, space]) });
    return space;
  }

  async setSpaceEnabled(actor: MemoryActor, spaceId: string, enabled: boolean, now: string): Promise<MemorySpace> {
    const snapshot = await this.persistence.load();
    const space = this.requireSpace(snapshot, spaceId);
    await this.authorization.assertCanManageSpace(actor, space.scope);
    const updated = freeze({ ...space, enabled, updated_at: now });
    await this.persistence.save({ ...snapshot, spaces: replace(snapshot.spaces, updated) });
    return updated;
  }

  async propose(input: ProposeMemoryInput): Promise<MemoryProposal> {
    const snapshot = await this.persistence.load();
    const space = this.requireAccessibleSpace(snapshot, input.space_id, input.actor);
    await this.authorization.assertCanManageSpace(input.actor, space.scope);
    const sensitivity = input.sensitivity ?? "normal";
    if (!sensitivityAllowed(sensitivity, this.policy)) throw new MemoryPolicyError("sensitivity.denied", "Organization policy excludes this sensitivity class");
    if (!input.content.trim() || !input.key.trim()) throw new MemoryPolicyError("proposal.invalid", "Memory key and content are required");
    const confidence = input.confidence ?? 1;
    if (confidence < 0 || confidence > 1) throw new MemoryPolicyError("proposal.invalid", "Confidence must be between zero and one");
    const contradiction = snapshot.entries.find((entry) => entry.space_id === space.id && entry.key === input.key && entry.status === "active" && entry.content !== input.content);
    const proposal: MemoryProposal = freeze({
      schema_version: MEMORY_SCHEMA_VERSION,
      id: id("mpr", [space.id, input.key, input.content, input.now]),
      space_id: space.id, type: input.type, key: input.key.trim(), content: input.content.trim(),
      structured_facts: freeze({ ...(input.structured_facts ?? {}) }),
      reason: contradiction ? "contradiction" : input.reason, status: "proposed", sensitivity, confidence,
      provenance: freeze({ ...input.provenance, source_event_ids: freeze([...input.provenance.source_event_ids]) }),
      contradicts_entry_id: contradiction?.id ?? null, proposed_at: input.now, decided_at: null,
      decided_by_user_id: null, rejection_reason: null,
      expires_at: input.expires_at === undefined ? this.defaultExpiry(input.now) : input.expires_at,
    });
    await this.persistence.save({ ...snapshot, proposals: freeze([...snapshot.proposals, proposal]) });
    return proposal;
  }

  async remember(input: Omit<ProposeMemoryInput, "reason">): Promise<MemoryProposal> { return this.propose({ ...input, reason: "explicit_remember" }); }

  async accept(actor: MemoryActor, proposalId: string, now: string): Promise<MemoryEntry> {
    const snapshot = await this.persistence.load();
    const proposal = this.requirePendingProposal(snapshot, proposalId);
    const space = this.requireAccessibleSpace(snapshot, proposal.space_id, actor);
    await this.authorization.assertCanManageSpace(actor, space.scope);
    let entries = snapshot.entries;
    let revisions = snapshot.revisions;
    let entry: MemoryEntry;
    const prior = proposal.contradicts_entry_id ? entries.find((candidate) => candidate.id === proposal.contradicts_entry_id) : undefined;
    if (prior) {
      const revision = this.revision(prior, proposal, now, actor.user_id, "contradiction_resolved", revisions.filter((item) => item.entry_id === prior.id).length + 1);
      entry = freeze({ ...prior, content: proposal.content, structured_facts: proposal.structured_facts, sensitivity: proposal.sensitivity, confidence: proposal.confidence, current_revision_id: revision.id, updated_at: now, expires_at: proposal.expires_at });
      entries = replace(entries, entry); revisions = freeze([...revisions, revision]);
    } else {
      const entryId = id("mem", [proposal.id, now]);
      const revisionId = id("mrv", [entryId, 1, proposal.content]);
      entry = freeze({ schema_version: MEMORY_SCHEMA_VERSION, id: entryId, space_id: proposal.space_id, type: proposal.type, key: proposal.key, content: proposal.content, structured_facts: proposal.structured_facts, status: "active", sensitivity: proposal.sensitivity, confidence: proposal.confidence, provenance: proposal.provenance, current_revision_id: revisionId, created_at: now, updated_at: now, last_used_at: null, expires_at: proposal.expires_at, deleted_at: null, embedding_index_version: null });
      revisions = freeze([...revisions, freeze({ schema_version: MEMORY_SCHEMA_VERSION, id: revisionId, entry_id: entryId, ordinal: 1, content: proposal.content, structured_facts: proposal.structured_facts, sensitivity: proposal.sensitivity, reason: "accepted", created_at: now, created_by_user_id: actor.user_id, source_proposal_id: proposal.id })]);
      entries = freeze([...entries, entry]);
    }
    const decided = freeze({ ...proposal, status: "accepted" as const, decided_at: now, decided_by_user_id: actor.user_id });
    await this.persistence.save({ ...snapshot, proposals: replace(snapshot.proposals, decided), entries, revisions });
    return entry;
  }

  async reject(actor: MemoryActor, proposalId: string, reason: string, now: string): Promise<MemoryProposal> {
    const snapshot = await this.persistence.load(); const proposal = this.requirePendingProposal(snapshot, proposalId);
    const space = this.requireAccessibleSpace(snapshot, proposal.space_id, actor); await this.authorization.assertCanManageSpace(actor, space.scope);
    const decided = freeze({ ...proposal, status: "rejected" as const, decided_at: now, decided_by_user_id: actor.user_id, rejection_reason: reason.trim() || "rejected_by_user" });
    await this.persistence.save({ ...snapshot, proposals: replace(snapshot.proposals, decided) }); return decided;
  }

  async edit(actor: MemoryActor, entryId: string, changes: { readonly content: string; readonly structured_facts?: MemoryEntry["structured_facts"]; readonly sensitivity?: Sensitivity }, now: string): Promise<MemoryEntry> {
    const snapshot = await this.persistence.load(); const existing = this.requireActiveEntry(snapshot, entryId);
    const space = this.requireAccessibleSpace(snapshot, existing.space_id, actor); await this.authorization.assertCanManageSpace(actor, space.scope);
    const sensitivity = changes.sensitivity ?? existing.sensitivity;
    if (!sensitivityAllowed(sensitivity, this.policy)) throw new MemoryPolicyError("sensitivity.denied", "Organization policy excludes this sensitivity class");
    const proposal: MemoryProposal = freeze({ schema_version: MEMORY_SCHEMA_VERSION, id: id("mpr", [entryId, changes.content, now]), space_id: existing.space_id, type: existing.type, key: existing.key, content: changes.content.trim(), structured_facts: freeze({ ...(changes.structured_facts ?? existing.structured_facts) }), reason: "edit", status: "accepted", sensitivity, confidence: existing.confidence, provenance: existing.provenance, contradicts_entry_id: existing.id, proposed_at: now, decided_at: now, decided_by_user_id: actor.user_id, rejection_reason: null, expires_at: existing.expires_at });
    const revision = this.revision(existing, proposal, now, actor.user_id, "edited", snapshot.revisions.filter((item) => item.entry_id === existing.id).length + 1);
    const updated = freeze({ ...existing, content: proposal.content, structured_facts: proposal.structured_facts, sensitivity, current_revision_id: revision.id, updated_at: now });
    await this.persistence.save({ ...snapshot, proposals: freeze([...snapshot.proposals, proposal]), entries: replace(snapshot.entries, updated), revisions: freeze([...snapshot.revisions, revision]) }); return updated;
  }

  async delete(actor: MemoryActor, entryId: string, now: string): Promise<MemoryEntry> {
    const snapshot = await this.persistence.load(); const existing = this.requireActiveEntry(snapshot, entryId);
    const space = this.requireAccessibleSpace(snapshot, existing.space_id, actor); await this.authorization.assertCanManageSpace(actor, space.scope);
    const deleted = freeze({ ...existing, status: "deleted" as const, content: "", structured_facts: freeze({}), deleted_at: now, updated_at: now });
    await this.persistence.save({ ...snapshot, entries: replace(snapshot.entries, deleted) });
    await this.persistence.requestDerivedCleanup({ entry_id: entryId, space_id: existing.space_id, reason: "deleted", requested_at: now, targets: ["embedding_index", "retrieval_cache"] });
    return deleted;
  }

  /** Backend expiry worker entry point; retrieval also fails closed before this sweep runs. */
  async expireDue(now: string): Promise<readonly MemoryEntry[]> {
    const snapshot = await this.persistence.load();
    const due = snapshot.entries.filter((entry) => entry.status === "active" && entry.expires_at !== null && Date.parse(entry.expires_at) <= Date.parse(now));
    if (!due.length) return freeze([]);
    const expired = due.map((entry) => freeze({ ...entry, status: "expired" as const, updated_at: now }));
    const byId = new Map(expired.map((entry) => [entry.id, entry]));
    await this.persistence.save({ ...snapshot, entries: freeze(snapshot.entries.map((entry) => byId.get(entry.id) ?? entry)) });
    for (const entry of expired) await this.persistence.requestDerivedCleanup({ entry_id: entry.id, space_id: entry.space_id, reason: "expired", requested_at: now, targets: ["embedding_index", "retrieval_cache"] });
    return freeze(expired);
  }

  async recall(request: RecallRequest): Promise<readonly MemoryRecall[]> {
    const snapshot = await this.persistence.load(); const queryWords = words(request.query); const denied: Array<{ entry_id: string; reason: string }> = [];
    const recalls: MemoryRecall[] = [];
    for (const entry of snapshot.entries) {
      if (entry.status !== "active") { denied.push({ entry_id: entry.id, reason: `status_${entry.status}` }); continue; }
      const space = snapshot.spaces.find((candidate) => candidate.id === entry.space_id);
      if (!space) { denied.push({ entry_id: entry.id, reason: "space_missing" }); continue; }
      const access = canAccessSpace(request.actor, space, this.policy);
      if (!access.allowed) { denied.push({ entry_id: entry.id, reason: access.reason }); continue; }
      await this.authorization.assertCanReadSpace(request.actor, space.scope);
      if (!sensitivityAllowed(entry.sensitivity, this.policy)) { denied.push({ entry_id: entry.id, reason: "sensitivity_denied" }); continue; }
      if (isExpired(entry, request.now, this.policy)) { denied.push({ entry_id: entry.id, reason: "expired_or_stale" }); continue; }
      const haystack = new Set(words(`${entry.key} ${entry.content} ${JSON.stringify(entry.structured_facts)}`));
      const overlap = queryWords.filter((word) => haystack.has(word)).length;
      const score = queryWords.length ? overlap / queryWords.length : 0;
      if (score === 0) { denied.push({ entry_id: entry.id, reason: "irrelevant" }); continue; }
      recalls.push(freeze({ entry, score, explanation: freeze({ scope: space.scope.kind, reasons: freeze([access.reason, `${overlap}_query_terms_matched`, "active_and_within_retention"]), source_event_ids: entry.provenance.source_event_ids, last_updated_at: entry.updated_at, sensitivity: entry.sensitivity }) }));
    }
    recalls.sort((left, right) => right.score - left.score || right.entry.updated_at.localeCompare(left.entry.updated_at) || left.entry.id.localeCompare(right.entry.id));
    const selected = freeze(recalls.slice(0, request.limit ?? 8));
    const retrieval: MemoryRetrieval = freeze({ schema_version: MEMORY_SCHEMA_VERSION, id: id("mrt", [request.actor, request.query, request.now]), actor: request.actor, query_digest: digest(request.query), requested_at: request.now, candidate_count: snapshot.entries.length, recalled_entry_ids: freeze(selected.map((item) => item.entry.id)), denied: freeze(denied) });
    await this.persistence.save({ ...snapshot, retrievals: freeze([...snapshot.retrievals, retrieval]) }); return selected;
  }

  async proposeCompaction(actor: MemoryActor, spaceId: string, events: readonly DurableEventReference[], summary: string, now: string): Promise<MemoryProposal> {
    if (!events.length) throw new MemoryPolicyError("compaction.invalid", "Compaction must reference durable events");
    const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
    for (let index = 1; index < ordered.length; index += 1) if (ordered[index].run_id === ordered[index - 1].run_id && ordered[index].sequence <= ordered[index - 1].sequence) throw new MemoryPolicyError("compaction.invalid", "Event references must be ordered and unique");
    return this.propose({ actor, space_id: spaceId, type: "episodic_summary", key: `compaction:${ordered[0].run_id}:${ordered[0].sequence}-${ordered.at(-1)?.sequence}`, content: summary, reason: "compaction", structured_facts: { event_count: events.length, first_sequence: ordered[0].sequence, last_sequence: ordered.at(-1)?.sequence ?? ordered[0].sequence }, provenance: { source_event_ids: freeze(ordered.map((event) => event.event_id)), source_run_id: ordered[0].run_id, source_output_id: null, created_by_user_id: actor.user_id }, now });
  }

  async export(actor: MemoryActor, now: string): Promise<Readonly<{ schema_version: string; exported_at: string; spaces: readonly MemorySpace[]; entries: readonly MemoryEntry[]; revisions: readonly MemoryRevision[] }>> {
    const snapshot = await this.persistence.load(); const spaces: MemorySpace[] = [];
    for (const space of snapshot.spaces) { const access = canAccessSpace(actor, space, this.policy); if (access.allowed) { await this.authorization.assertCanReadSpace(actor, space.scope); spaces.push(space); } }
    const ids = new Set(spaces.map((space) => space.id)); const entries = snapshot.entries.filter((entry) => ids.has(entry.space_id) && entry.status !== "deleted"); const entryIds = new Set(entries.map((entry) => entry.id));
    return freeze({ schema_version: MEMORY_SCHEMA_VERSION, exported_at: now, spaces: freeze(spaces), entries: freeze(entries), revisions: freeze(snapshot.revisions.filter((revision) => entryIds.has(revision.entry_id))) });
  }

  async inspect(): Promise<MemorySnapshot> { return this.persistence.load(); }
  private requireSpace(snapshot: MemorySnapshot, spaceId: string): MemorySpace { const space = snapshot.spaces.find((candidate) => candidate.id === spaceId); if (!space) throw new MemoryPolicyError("space.not_found", "Memory space not found"); return space; }
  private requireAccessibleSpace(snapshot: MemorySnapshot, spaceId: string, actor: MemoryActor): MemorySpace { const space = this.requireSpace(snapshot, spaceId); const access = canAccessSpace(actor, space, this.policy); if (!access.allowed) throw new MemoryPolicyError("scope.denied", access.reason); return space; }
  private requirePendingProposal(snapshot: MemorySnapshot, proposalId: string): MemoryProposal { const proposal = snapshot.proposals.find((candidate) => candidate.id === proposalId); if (!proposal) throw new MemoryPolicyError("proposal.not_found", "Memory proposal not found"); if (proposal.status !== "proposed") throw new MemoryPolicyError("proposal.decided", "Memory proposal was already decided"); return proposal; }
  private requireActiveEntry(snapshot: MemorySnapshot, entryId: string): MemoryEntry { const entry = snapshot.entries.find((candidate) => candidate.id === entryId); if (!entry) throw new MemoryPolicyError("entry.not_found", "Memory entry not found"); if (entry.status !== "active") throw new MemoryPolicyError("entry.inactive", "Memory entry is not active"); return entry; }
  private defaultExpiry(now: string): string | null { return this.policy.default_retention_days === null ? null : new Date(Date.parse(now) + this.policy.default_retention_days * 86_400_000).toISOString(); }
  private revision(entry: MemoryEntry, proposal: MemoryProposal, now: string, userId: string, reason: MemoryRevision["reason"], ordinal: number): MemoryRevision { return freeze({ schema_version: MEMORY_SCHEMA_VERSION, id: id("mrv", [entry.id, ordinal, proposal.content, now]), entry_id: entry.id, ordinal, content: proposal.content, structured_facts: proposal.structured_facts, sensitivity: proposal.sensitivity, reason, created_at: now, created_by_user_id: userId, source_proposal_id: proposal.id }); }
}
