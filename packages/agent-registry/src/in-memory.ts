import type { AgentRecord, AgentRegistryPersistencePort, AgentVersion, Deployment, MutableAgentDraft, PublicationRequest, ValidationReport } from "./contracts.ts";

export class InMemoryAgentRegistry implements AgentRegistryPersistencePort {
  readonly agents = new Map<string, AgentRecord>(); readonly drafts = new Map<string, MutableAgentDraft>(); readonly reports = new Map<string, ValidationReport>(); readonly versions = new Map<string, AgentVersion>(); readonly deployments = new Map<string, Deployment>(); readonly requests = new Map<string, PublicationRequest>();
  private readonly favorites = new Set<string>(); private readonly usageEvents: { version_id: string; actor_id: string; at: string }[] = [];
  async createAgent(record: AgentRecord, draft: MutableAgentDraft): Promise<void> { if (this.agents.has(record.id) || this.drafts.has(draft.id)) throw new Error("duplicate_agent"); this.agents.set(record.id, structuredClone(record)); this.drafts.set(draft.id, structuredClone(draft)); }
  async getAgent(id: string): Promise<AgentRecord | undefined> { return clone(this.agents.get(id)); }
  async getDraft(id: string): Promise<MutableAgentDraft | undefined> { return clone(this.drafts.get(id)); }
  async saveDraft(draft: MutableAgentDraft, expected_revision: number): Promise<void> { const current = this.drafts.get(draft.id); if (!current || current.revision !== expected_revision) throw new Error("revision_conflict"); this.drafts.set(draft.id, structuredClone(draft)); }
  async saveReport(report: ValidationReport): Promise<void> { this.reports.set(report.id, structuredClone(report)); }
  async getReport(id: string): Promise<ValidationReport | undefined> { return clone(this.reports.get(id)); }
  async saveVersion(version: AgentVersion): Promise<void> { const current = this.versions.get(version.id); if (current && JSON.stringify(current) !== JSON.stringify(version) && !(current.state === "published" && version.state === "deprecated")) throw new Error("immutable_version_conflict"); this.versions.set(version.id, structuredClone(version)); }
  async getVersion(id: string): Promise<AgentVersion | undefined> { return clone(this.versions.get(id)); }
  async listVersions(agent_id: string): Promise<readonly AgentVersion[]> { return [...this.versions.values()].filter((v) => v.agent_id === agent_id).sort((a, b) => a.ordinal - b.ordinal).map((value) => structuredClone(value)); }
  async getDeployment(id: string): Promise<Deployment | undefined> { return clone(this.deployments.get(id)); }
  async saveDeployment(deployment: Deployment, expected_revision?: number): Promise<void> { const current = this.deployments.get(deployment.id); if (current && current.revision !== expected_revision) throw new Error("revision_conflict"); if (!current && expected_revision !== undefined) throw new Error("revision_conflict"); this.deployments.set(deployment.id, structuredClone(deployment)); }
  async listDeployments(agent_id?: string): Promise<readonly Deployment[]> { return [...this.deployments.values()].filter((d) => !agent_id || d.agent_id === agent_id).map((value) => structuredClone(value)); }
  async savePublicationRequest(request: PublicationRequest): Promise<void> { this.requests.set(request.id, structuredClone(request)); }
  async getPublicationRequest(id: string): Promise<PublicationRequest | undefined> { return clone(this.requests.get(id)); }
  async setFavorite(actor_id: string, agent_id: string, value: boolean): Promise<void> { const key = `${actor_id}:${agent_id}`; value ? this.favorites.add(key) : this.favorites.delete(key); }
  async isFavorite(actor_id: string, agent_id: string): Promise<boolean> { return this.favorites.has(`${actor_id}:${agent_id}`); }
  async recordUsage(version_id: string, actor_id: string, at: string): Promise<void> { this.usageEvents.push({ version_id, actor_id, at }); }
  async usage(version_id: string): Promise<{ runs: number; unique_users: number; last_used_at?: string }> { const events = this.usageEvents.filter((e) => e.version_id === version_id); const last = events.map((e) => e.at).sort().at(-1); return { runs: events.length, unique_users: new Set(events.map((e) => e.actor_id)).size, ...(last ? { last_used_at: last } : {}) }; }
  async listAgents(organization_id: string): Promise<readonly AgentRecord[]> { return [...this.agents.values()].filter((a) => a.organization_id === organization_id).map((value) => structuredClone(value)); }
}
function clone<T>(value: T | undefined): T | undefined { return value === undefined ? undefined : structuredClone(value); }
