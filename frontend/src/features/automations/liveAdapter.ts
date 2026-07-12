import { sessionRequest } from "../../lib/sessionClient";
import { getWorkspaceCapabilities, type ProductRecordSummary } from "../workspace/api";
import type {
  AutomationDashboardData,
  AutomationRun,
  AutomationSummary,
  AutomationUiAdapter,
  ExecutionUiState,
} from "./model";

/** Product-API-backed automations adapter. Everything rendered comes from
 * canonical records; integration readiness is reported truthfully (scheduler
 * and Composio remain not_connected until their cron/provider wiring exists). */

const BASE = "/api/v2/product";

function describeTrigger(payload: Record<string, unknown>): string {
  const trigger = payload["trigger"];
  if (trigger && typeof trigger === "object") {
    const spec = trigger as { kind?: string; interval_minutes?: number };
    if (spec.kind === "schedule") return `Every ${spec.interval_minutes ?? "?"} minutes`;
    if (spec.kind === "webhook") return "Signed webhook";
    if (spec.kind === "composio") return "Composio event";
    return spec.kind ?? "Manual";
  }
  return typeof trigger === "string" ? trigger : "Manual";
}

function executionState(record: ProductRecordSummary): ExecutionUiState {
  const state = record.state;
  if (state === "queued" || state === "running" || state === "failed" || state === "dead_letter") return state;
  if (state === "succeeded") return "completed";
  return "queued";
}

function runView(record: ProductRecordSummary): AutomationRun {
  const payload = record.payload ?? {};
  const suppressed = payload["destinations_suppressed"] === true;
  return {
    id: record.id,
    state: executionState(record),
    trigger: String(payload["trigger"] ?? "manual"),
    version: typeof payload["pinned_version_id"] === "string"
      ? `pinned ${(payload["pinned_version_id"] as string).slice(0, 8)}`
      : "unpinned test",
    startedAt: record.created_at,
    attempt: Number(payload["attempt"] ?? 1),
    costCents: 0,
    detail: `${String(payload["trigger_key"] ?? "")}${suppressed ? " · destinations suppressed" : ""}`,
  };
}

export class LiveAutomationAdapter implements AutomationUiAdapter {
  private versions = new Map<string, number>();
  private runOwners = new Map<string, string>();
  private approvalVersions = new Map<string, { version: number; projectId: string }>();

  constructor(private readonly projectId: string) {}

  private path(suffix: string) {
    return `${BASE}/projects/${encodeURIComponent(this.projectId)}${suffix}`;
  }

  async load(): Promise<AutomationDashboardData> {
    const [automations, capabilities, approvals] = await Promise.all([
      sessionRequest<{ items: ProductRecordSummary[] }>(this.path("/automations")),
      getWorkspaceCapabilities().catch(() => null),
      sessionRequest<{ items: ProductRecordSummary[] }>(`${BASE}/organization/recent/approvals`).catch(
        () => ({ items: [] as ProductRecordSummary[] }),
      ),
    ]);
    this.versions = new Map(automations.items.map((record) => [record.id, record.version]));

    const histories = await Promise.all(
      automations.items.slice(0, 10).map((automation) =>
        sessionRequest<{ items: ProductRecordSummary[] }>(
          this.path(`/automations/${encodeURIComponent(automation.id)}/executions`),
        ).then(
          (value) => ({ automation: automation.id, items: value.items }),
          () => ({ automation: automation.id, items: [] as ProductRecordSummary[] }),
        ),
      ),
    );
    this.runOwners = new Map(
      histories.flatMap(({ automation, items }) => items.map((record) => [record.id, automation] as const)),
    );

    const summaries: AutomationSummary[] = automations.items.map((record) => {
      const payload = record.payload ?? {};
      const failureCount = histories
        .find((entry) => entry.automation === record.id)
        ?.items.filter((item) => item.state === "failed" || item.state === "dead_letter").length ?? 0;
      return {
        id: record.id,
        name: String(payload["name"] ?? record.id.slice(0, 8)),
        state: record.state === "active" ? "active" : record.state === "paused" ? "paused" : "disabled",
        trigger: describeTrigger(payload),
        version: `v${record.version}`,
        owner: String(record.created_by ?? "unknown"),
        principal: `service:${String(record.created_by ?? "unknown").slice(0, 8)}`,
        failureCount,
        costCents: 0,
        costLimitCents: Number(payload["max_cost_cents"] ?? 0),
      };
    });

    this.approvalVersions = new Map(
      approvals.items.map((record) => [record.id, {
        version: record.version,
        projectId: record.scope.project_id ?? this.projectId,
      }]),
    );

    return {
      automations: summaries,
      runs: histories.flatMap(({ items }) => items).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map(runView),
      approvals: approvals.items.map((record) => ({
        id: record.id,
        automationName: String(record.payload["name"] ?? "Capability approval"),
        action: String(record.payload["description"] ?? "Requested capability"),
        expiresAt: record.updated_at,
        status: "pending" as const,
      })),
      integrations: {
        persistence: "connected",
        runtime: capabilities?.runtime_execution ? "connected" : "simulated",
        scheduler: "not_connected",
        composio: "not_connected",
        notifications: "in_memory",
      },
    };
  }

  private async stateOperation(id: string, operation: "pause" | "resume"): Promise<void> {
    const version = this.versions.get(id);
    if (version === undefined) throw new Error("Reload before changing automation state.");
    const updated = await sessionRequest<ProductRecordSummary>(
      this.path(`/automations/${encodeURIComponent(id)}/state/${operation}`),
      { method: "POST", headers: { "If-Match": String(version) } },
    );
    this.versions.set(id, updated.version);
  }

  async pause(id: string): Promise<void> {
    await this.stateOperation(id, "pause");
  }

  async resume(id: string): Promise<void> {
    await this.stateOperation(id, "resume");
  }

  async test(id: string): Promise<AutomationRun> {
    const record = await sessionRequest<ProductRecordSummary>(
      this.path(`/automations/${encodeURIComponent(id)}/test`),
      { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } },
    );
    return runView(record);
  }

  async retry(runId: string): Promise<void> {
    const automationId = this.runOwners.get(runId);
    if (!automationId) throw new Error("Reload before retrying this execution.");
    await sessionRequest(
      this.path(`/automations/${encodeURIComponent(automationId)}/executions/${encodeURIComponent(runId)}/retry`),
      { method: "POST" },
    );
  }

  async resolveApproval(id: string, decision: "approved" | "denied"): Promise<void> {
    const known = this.approvalVersions.get(id);
    if (!known) throw new Error("Reload before resolving this approval.");
    await sessionRequest(
      `${BASE}/projects/${encodeURIComponent(known.projectId)}/capability-approvals/${encodeURIComponent(id)}/resolve`,
      {
        method: "POST",
        headers: { "If-Match": String(known.version) },
        body: JSON.stringify({ state: decision }),
      },
    );
  }
}
