import type {
  ApprovalRequest,
  AutomationDefinition,
  AutomationExecution,
  AutomationPersistencePort,
  AutomationVersion,
  ClaimedExecution,
  FailureRecord,
} from "./contracts.ts";
const ACTIVE = new Set([
  "queued",
  "leased",
  "running",
  "awaiting_approval",
  "retrying",
]);
const clone = <Value>(value: Value): Value => structuredClone(value);
export class InMemoryAutomationPersistence
  implements AutomationPersistencePort
{
  private definitions = new Map<string, AutomationDefinition>();
  private versions = new Map<string, AutomationVersion>();
  private executions = new Map<string, AutomationExecution>();
  private triggerIndex = new Map<string, string>();
  private actionReceipts = new Set<string>();
  private approvals = new Map<string, ApprovalRequest>();
  private failures: FailureRecord[] = [];
  async createDefinition(value: AutomationDefinition) {
    if (this.definitions.has(value.id)) throw new Error("definition_exists");
    this.definitions.set(value.id, clone(value));
  }
  async getDefinition(id: string) {
    const value = this.definitions.get(id);
    return value && clone(value);
  }
  async saveDefinition(value: AutomationDefinition, expected: number) {
    const current = this.definitions.get(value.id);
    if (!current || current.revision !== expected)
      throw new Error("revision_conflict");
    this.definitions.set(value.id, clone(value));
  }
  async saveVersion(value: AutomationVersion) {
    if (this.versions.has(value.id))
      throw new Error("immutable_version_exists");
    this.versions.set(value.id, clone(value));
  }
  async getVersion(id: string) {
    const value = this.versions.get(id);
    return value && clone(value);
  }
  async listVersions(id: string) {
    return [...this.versions.values()]
      .filter((value) => value.automation_id === id)
      .sort((a, b) => a.ordinal - b.ordinal)
      .map(clone);
  }
  async createExecutionOnce(value: AutomationExecution) {
    const key = `${value.organization_id}:${value.automation_id}:${value.trigger_key}`;
    const existing = this.triggerIndex.get(key);
    if (existing)
      return { execution: clone(this.executions.get(existing)!), duplicate: true };
    this.triggerIndex.set(key, value.id);
    this.executions.set(value.id, clone(value));
    return { execution: clone(value), duplicate: false };
  }
  async getExecution(id: string) {
    const value = this.executions.get(id);
    return value && clone(value);
  }
  async listExecutions(id: string) {
    return [...this.executions.values()]
      .filter((value) => value.automation_id === id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(clone);
  }
  async saveExecution(value: AutomationExecution) {
    if (!this.executions.has(value.id)) throw new Error("execution_missing");
    this.executions.set(value.id, value);
  }
  async claim(
    now: string,
    worker: string,
    expires: string,
  ): Promise<ClaimedExecution | undefined> {
    const value = [...this.executions.values()].find(
      (item) =>
        (item.state === "queued" || item.state === "retrying") &&
        (!item.next_attempt_at || item.next_attempt_at <= now),
    );
    if (!value) return undefined;
    const lease = `${worker}:${value.id}:${value.attempt}`;
    const claimed = {
      ...value,
      state: "leased" as const,
      lease_id: lease,
      lease_expires_at: expires,
      updated_at: now,
    };
    this.executions.set(value.id, claimed);
    return { execution: claimed, lease_id: lease };
  }
  async recoverExpired(now: string) {
    const ids: string[] = [];
    for (const value of this.executions.values())
      if (
        (value.state === "leased" || value.state === "running") &&
        value.lease_expires_at &&
        value.lease_expires_at <= now
      ) {
        this.executions.set(value.id, {
          ...value,
          state: "queued",
          lease_id: undefined,
          lease_expires_at: undefined,
          updated_at: now,
        });
        ids.push(value.id);
      }
    return ids;
  }
  async heartbeat(execution_id: string, lease_id: string, lease_expires_at: string) {
    const value = this.executions.get(execution_id);
    if (
      !value ||
      !["leased", "running"].includes(value.state) ||
      value.lease_id !== lease_id
    )
      return false;
    this.executions.set(execution_id, { ...value, lease_expires_at });
    return true;
  }
  async activeExecutions(id: string) {
    return [...this.executions.values()].filter(
      (value) => value.automation_id === id && ACTIVE.has(value.state),
    );
  }
  async recordActionOnce(execution: string, destination: string) {
    const key = `${execution}:${destination}`;
    if (this.actionReceipts.has(key)) return false;
    this.actionReceipts.add(key);
    return true;
  }
  async saveApproval(value: ApprovalRequest) {
    this.approvals.set(value.id, value);
  }
  async getApproval(id: string) {
    return this.approvals.get(id);
  }
  async listApprovals(org: string) {
    return [...this.approvals.values()].filter(
      (value) =>
        this.executions.get(value.execution_id)?.organization_id === org,
    );
  }
  async appendFailure(value: FailureRecord) {
    this.failures.push(value);
  }
  async listFailures(id: string) {
    return this.failures.filter(
      (value) => this.executions.get(value.execution_id)?.automation_id === id,
    );
  }
}
