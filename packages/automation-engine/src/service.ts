import { createHash, randomUUID } from "node:crypto";
import type {
  ApprovalRequest,
  AutomationDefinition,
  AutomationExecution,
  AutomationPersistencePort,
  AutomationRuntimePort,
  AutomationVersion,
  Clock,
  ComposioTriggerPort,
  DestinationPort,
  NotificationPort,
  RuntimeResult,
  SchedulerPort,
  ServicePrincipalPort,
  TriggerEnvelope,
} from "./contracts.ts";
import { nextScheduledAt } from "./schedule.ts";
const iso = (clock: Clock) => clock.now().toISOString();
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
    .join(",")}}`;
}
const hash = (value: unknown) =>
  `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}` as const;
export class AutomationEngine {
  private store: AutomationPersistencePort;
  private runtime: AutomationRuntimePort;
  private destinations: DestinationPort;
  private notifications: NotificationPort;
  private principals: ServicePrincipalPort;
  private scheduler: SchedulerPort;
  private clock: Clock;
  constructor(
    store: AutomationPersistencePort,
    runtime: AutomationRuntimePort,
    destinations: DestinationPort,
    notifications: NotificationPort,
    principals: ServicePrincipalPort,
    scheduler: SchedulerPort,
    clock: Clock,
  ) {
    this.store = store;
    this.runtime = runtime;
    this.destinations = destinations;
    this.notifications = notifications;
    this.principals = principals;
    this.scheduler = scheduler;
    this.clock = clock;
  }
  async create(
    input: Omit<
      AutomationDefinition,
      "revision" | "created_at" | "updated_at" | "state" | "active_version_id"
    >,
  ): Promise<AutomationDefinition> {
    const now = iso(this.clock);
    const value = {
      ...input,
      state: "paused" as const,
      revision: 1,
      created_at: now,
      updated_at: now,
    };
    await this.store.createDefinition(value);
    return value;
  }
  async publish(
    automation_id: string,
    input: Omit<
      AutomationVersion,
      | "id"
      | "automation_id"
      | "organization_id"
      | "ordinal"
      | "content_hash"
      | "created_at"
    >,
  ): Promise<AutomationVersion> {
    const definition = await this.requiredDefinition(automation_id);
    const versions = await this.store.listVersions(automation_id);
    if (
      input.budget.max_cost_cents <= 0 ||
      input.budget.max_actions < 0 ||
      input.budget.max_attempts <= 0
    )
      throw new Error("invalid_budget");
    if (input.retry.max_attempts > input.budget.max_attempts)
      throw new Error("retry_exceeds_budget");
    const base = {
      ...input,
      automation_id,
      organization_id: definition.organization_id,
      ordinal: versions.length + 1,
      created_at: iso(this.clock),
    };
    const value = {
      ...base,
      id: `autv_${randomUUID()}`,
      content_hash: hash(base),
    };
    await this.store.saveVersion(value);
    await this.store.saveDefinition(
      {
        ...definition,
        active_version_id: value.id,
        revision: definition.revision + 1,
        updated_at: iso(this.clock),
      },
      definition.revision,
    );
    return value;
  }
  async resume(id: string): Promise<void> {
    const d = await this.requiredDefinition(id);
    if (!d.active_version_id) throw new Error("version_required");
    if (
      d.service_principal_id &&
      !(await this.principals.resolve(
        d.service_principal_id,
        d.organization_id,
      ))
    )
      throw new Error("service_principal_unavailable");
    await this.store.saveDefinition(
      {
        ...d,
        state: "active",
        revision: d.revision + 1,
        updated_at: iso(this.clock),
      },
      d.revision,
    );
    const v = await this.requiredVersion(d.active_version_id);
    if (v.trigger.kind === "schedule" && v.trigger.schedule)
      await this.scheduler.schedule(
        id,
        nextScheduledAt(v.trigger.schedule, this.clock.now()).toISOString(),
      );
  }
  async pause(id: string, actor_id: string): Promise<void> {
    const d = await this.requiredDefinition(id);
    await this.store.saveDefinition(
      {
        ...d,
        state: "paused",
        revision: d.revision + 1,
        updated_at: iso(this.clock),
      },
      d.revision,
    );
    await this.scheduler.unschedule(id);
    await this.notifications.deliver({
      id: `note_${randomUUID()}`,
      organization_id: d.organization_id,
      recipient_id: actor_id,
      kind: "automation_paused",
      subject_id: id,
      created_at: iso(this.clock),
    });
  }
  async ownerOffboarded(
    owner_id: string,
    automation_ids: readonly string[],
  ): Promise<void> {
    for (const id of automation_ids) {
      const d = await this.requiredDefinition(id);
      if (d.owner_id !== owner_id) continue;
      if (
        d.service_principal_id &&
        (await this.principals.resolve(
          d.service_principal_id,
          d.organization_id,
        ))
      )
        continue;
      await this.pause(id, owner_id);
    }
  }
  async ingest(
    envelope: TriggerEnvelope,
  ): Promise<{ execution: AutomationExecution; duplicate: boolean }> {
    const d = await this.requiredDefinition(envelope.automation_id);
    if (d.organization_id !== envelope.organization_id)
      throw new Error("organization_mismatch");
    if (d.state !== "active" && !envelope.test)
      throw new Error(`automation_${d.state}`);
    if (!d.active_version_id) throw new Error("version_required");
    const v = await this.requiredVersion(d.active_version_id);
    const active = await this.store.activeExecutions(d.id);
    if (active.length && v.overlap === "skip")
      return this.skipped(d, v, envelope);
    if (active.length && v.overlap === "cancel_previous")
      for (const item of active) {
        if (item.runtime_run_id)
          await this.runtime.cancel(item.runtime_run_id, "superseded");
        await this.store.saveExecution({
          ...item,
          state: "canceled",
          updated_at: iso(this.clock),
        });
      }
    const key = `${envelope.kind}:${envelope.source}:${envelope.source_event_id}`;
    const now = iso(this.clock);
    const execution: AutomationExecution = {
      id: `aex_${randomUUID()}`,
      organization_id: d.organization_id,
      automation_id: d.id,
      automation_version_id: v.id,
      trigger_key: key,
      state: "queued",
      attempt: 0,
      cost_cents: 0,
      action_count: 0,
      input: envelope.payload,
      pinned: v.pinned,
      correlation_id: envelope.correlation_id,
      test: envelope.test,
      created_at: now,
      updated_at: now,
    };
    return this.store.createExecutionOnce(execution);
  }
  async ingestComposio(
    organization_id: string,
    automation_id: string,
    payload: Readonly<Record<string, unknown>>,
    port: ComposioTriggerPort,
  ): Promise<{ execution: AutomationExecution; duplicate: boolean }> {
    const normalized = await port.normalize(payload, iso(this.clock));
    return this.ingest({
      ...normalized,
      organization_id,
      automation_id,
      test: false,
    });
  }
  async runNext(
    worker_id: string,
    lease_seconds = 60,
  ): Promise<AutomationExecution | undefined> {
    const now = this.clock.now();
    const claimed = await this.store.claim(
      now.toISOString(),
      worker_id,
      new Date(now.getTime() + lease_seconds * 1000).toISOString(),
    );
    if (!claimed) return undefined;
    let execution: AutomationExecution = {
      ...claimed.execution,
      state: "running",
      attempt: claimed.execution.attempt + 1,
      updated_at: iso(this.clock),
    };
    await this.store.saveExecution(execution);
    const d = await this.requiredDefinition(execution.automation_id);
    const v = await this.requiredVersion(execution.automation_version_id);
    try {
      if (d.state !== "active" && !execution.test)
        throw Object.assign(new Error("automation_not_active"), {
          retryable: false,
        });
      if (execution.cost_cents >= v.budget.max_cost_cents)
        throw Object.assign(new Error("budget_exhausted"), {
          retryable: false,
        });
      const actor = d.service_principal_id
        ? (
            await this.principals.resolve(
              d.service_principal_id,
              d.organization_id,
            )
          )?.id
        : d.owner_id;
      if (!actor)
        throw Object.assign(new Error("service_principal_unavailable"), {
          retryable: false,
        });
      const result = await this.runtime.start({
        execution_id: execution.id,
        organization_id: d.organization_id,
        project_id: d.project_id,
        actor_id: actor,
        instructions: v.instructions,
        input: execution.input,
        pinned: execution.pinned,
        budget: v.budget,
        idempotency_key: execution.id,
        correlation_id: execution.correlation_id,
        test: execution.test,
      });
      execution = {
        ...execution,
        runtime_run_id: result.run_id,
        cost_cents: execution.cost_cents + result.cost_cents,
        updated_at: iso(this.clock),
      };
      if (execution.cost_cents > v.budget.max_cost_cents)
        throw Object.assign(new Error("budget_exceeded"), { retryable: false });
      for (const destination of v.destinations) {
        if (execution.test && destination.external) continue;
        if (execution.action_count >= v.budget.max_actions)
          throw Object.assign(new Error("action_budget_exhausted"), {
            retryable: false,
          });
        if (destination.approval_required) {
          const approval: ApprovalRequest = {
            id: `apr_${execution.id}_${destination.id}`,
            execution_id: execution.id,
            destination_id: destination.id,
            status: "pending",
            requested_at: iso(this.clock),
            expires_at: new Date(
              this.clock.now().getTime() + 86400000,
            ).toISOString(),
          };
          await this.store.saveApproval(approval);
          await this.notifications.deliver({
            id: `note_${randomUUID()}`,
            organization_id: d.organization_id,
            recipient_id: d.owner_id,
            kind: "approval_requested",
            subject_id: approval.id,
            created_at: iso(this.clock),
          });
          execution = {
            ...execution,
            state: "awaiting_approval",
            updated_at: iso(this.clock),
          };
          await this.store.saveExecution(execution);
          return execution;
        }
        execution = await this.deliverOnce(execution, destination.id, result);
      }
      execution = {
        ...execution,
        state: "completed",
        updated_at: iso(this.clock),
      };
      await this.store.saveExecution(execution);
      return execution;
    } catch (error) {
      return this.fail(execution, v, error);
    }
  }
  async resolveApproval(
    id: string,
    decision: "approved" | "denied",
    actor_id: string,
  ): Promise<AutomationExecution> {
    const approval = await this.store.getApproval(id);
    if (!approval || approval.status !== "pending")
      throw new Error("approval_not_pending");
    const execution = await this.requiredExecution(approval.execution_id);
    const version = await this.requiredVersion(execution.automation_version_id);
    if (new Date(approval.expires_at) <= this.clock.now()) {
      await this.store.saveApproval({ ...approval, status: "expired" });
      await this.store.saveExecution({
        ...execution,
        state: "failed",
        failure_code: "approval_expired",
        failure_message: "The approval window expired before delivery.",
        updated_at: iso(this.clock),
      });
      throw new Error("approval_expired");
    }
    await this.store.saveApproval({
      ...approval,
      status: decision,
      decided_by: actor_id,
      decided_at: iso(this.clock),
    });
    if (decision === "denied") {
      const denied = {
        ...execution,
        state: "failed" as const,
        failure_code: "approval_denied",
        updated_at: iso(this.clock),
      };
      await this.store.saveExecution(denied);
      return denied;
    }
    const destination = version.destinations.find(
      (x) => x.id === approval.destination_id,
    );
    if (!destination) throw new Error("destination_missing");
    if (execution.action_count >= version.budget.max_actions)
      throw new Error("action_budget_exhausted");
    const next = await this.deliverOnce(execution, destination.id, {
      run_id: execution.runtime_run_id ?? "unknown",
      cost_cents: 0,
    });
    const complete = {
      ...next,
      state: "completed" as const,
      updated_at: iso(this.clock),
    };
    await this.store.saveExecution(complete);
    return complete;
  }
  async expireApprovals(organization_id: string): Promise<readonly string[]> {
    const expired: string[] = [];
    for (const approval of await this.store.listApprovals(organization_id)) {
      if (
        approval.status !== "pending" ||
        new Date(approval.expires_at) > this.clock.now()
      )
        continue;
      await this.store.saveApproval({ ...approval, status: "expired" });
      const execution = await this.requiredExecution(approval.execution_id);
      await this.store.saveExecution({
        ...execution,
        state: "failed",
        failure_code: "approval_expired",
        failure_message: "The approval window expired before delivery.",
        updated_at: iso(this.clock),
      });
      expired.push(approval.id);
    }
    return expired;
  }
  async retryDeadLetter(id: string): Promise<AutomationExecution> {
    const e = await this.requiredExecution(id);
    if (!["failed", "dead_letter"].includes(e.state))
      throw new Error("not_retryable_state");
    const next = {
      ...e,
      state: "queued" as const,
      failure_code: undefined,
      failure_message: undefined,
      next_attempt_at: undefined,
      updated_at: iso(this.clock),
    };
    await this.store.saveExecution(next);
    return next;
  }
  private async deliverOnce(
    e: AutomationExecution,
    destination_id: string,
    result: RuntimeResult,
  ) {
    const v = await this.requiredVersion(e.automation_version_id);
    const destination = v.destinations.find((x) => x.id === destination_id);
    if (!destination) throw new Error("destination_missing");
    if (await this.store.recordActionOnce(e.id, destination.id)) {
      await this.destinations.deliver(destination, e, result);
      return { ...e, action_count: e.action_count + 1 };
    }
    return e;
  }
  private async fail(
    e: AutomationExecution,
    v: AutomationVersion,
    error: unknown,
  ) {
    const err = error instanceof Error ? error : new Error("unknown_failure");
    const retryable = (error as { retryable?: boolean })?.retryable !== false;
    await this.store.appendFailure({
      id: `fail_${randomUUID()}`,
      execution_id: e.id,
      attempt: e.attempt,
      code: err.message,
      message: err.message,
      retryable,
      occurred_at: iso(this.clock),
    });
    const retry = retryable && e.attempt < v.retry.max_attempts;
    const state = retry ? ("retrying" as const) : ("dead_letter" as const);
    const delay = Math.min(
      v.retry.max_backoff_seconds,
      v.retry.initial_backoff_seconds * 2 ** Math.max(0, e.attempt - 1),
    );
    const next = {
      ...e,
      state,
      failure_code: err.message,
      failure_message: err.message,
      next_attempt_at: retry
        ? new Date(this.clock.now().getTime() + delay * 1000).toISOString()
        : undefined,
      updated_at: iso(this.clock),
    };
    await this.store.saveExecution(next);
    const d = await this.requiredDefinition(e.automation_id);
    await this.notifications.deliver({
      id: `note_${randomUUID()}`,
      organization_id: d.organization_id,
      recipient_id: d.owner_id,
      kind: retry ? "automation_failed" : "dead_letter",
      subject_id: e.id,
      created_at: iso(this.clock),
    });
    return next;
  }
  private async skipped(
    d: AutomationDefinition,
    v: AutomationVersion,
    envelope: TriggerEnvelope,
  ) {
    const now = iso(this.clock);
    return this.store.createExecutionOnce({
      id: `aex_${randomUUID()}`,
      organization_id: d.organization_id,
      automation_id: d.id,
      automation_version_id: v.id,
      trigger_key: `${envelope.kind}:${envelope.source}:${envelope.source_event_id}`,
      state: "skipped",
      attempt: 0,
      cost_cents: 0,
      action_count: 0,
      input: envelope.payload,
      pinned: v.pinned,
      correlation_id: envelope.correlation_id,
      test: envelope.test,
      created_at: now,
      updated_at: now,
      failure_code: "overlap_skipped",
    });
  }
  private async requiredDefinition(id: string) {
    const x = await this.store.getDefinition(id);
    if (!x) throw new Error("definition_missing");
    return x;
  }
  private async requiredVersion(id: string) {
    const x = await this.store.getVersion(id);
    if (!x) throw new Error("version_missing");
    return x;
  }
  private async requiredExecution(id: string) {
    const x = await this.store.getExecution(id);
    if (!x) throw new Error("execution_missing");
    return x;
  }
}
