import { createHash } from "node:crypto";
import {
  COMMAND_SCHEMA_VERSION,
  ContractError,
  EVENT_SCHEMA_VERSION,
  assertCommandEnvelope,
  assertEventEnvelope,
  canTransition,
  canonicalId,
  isTerminalState,
  serializeCanonical,
  toJsonValue,
  transitionExecution,
  type AgentRuntime,
  type CheckpointReference,
  type CommandEnvelope,
  type EventEnvelope,
  type ExecutionSnapshot,
  type ExecutionState,
  type JsonObject,
  type RunId,
} from "@beyond/contracts";
import { AppendOnlyStore, type StoreRecord } from "./store.ts";

export const PROTOCOL_VERSION = "1.0";
const COMMAND_TYPES = new Set(["run.start", "run.steer", "run.cancel", "run.checkpoint", "run.resume", "run.retry", "approval.resolve"]);
const STATE_BY_EVENT: Readonly<Record<string, ExecutionState>> = {
  "run.queued": "queued",
  "run.leased": "leased",
  "run.preparing": "preparing",
  "run.running": "running",
  "run.awaiting_approval": "awaiting_approval",
  "run.completing": "completing",
  "run.retrying": "retrying",
  "run.paused": "paused",
  "run.stalled": "stalled",
  "run.reconciling": "reconciling",
  "run.completed": "completed",
  "run.failed": "failed",
  "run.canceled": "canceled",
};
const EVENT_BY_STATE: Readonly<Record<ExecutionState, string>> = {
  accepted: "run.accepted",
  queued: "run.queued",
  leased: "run.leased",
  preparing: "run.preparing",
  running: "run.running",
  awaiting_approval: "run.awaiting_approval",
  completing: "run.completing",
  retrying: "run.retrying",
  paused: "run.paused",
  stalled: "run.stalled",
  reconciling: "run.reconciling",
  completed: "run.completed",
  failed: "run.failed",
  canceled: "run.canceled",
};

type Subscriber = (event: EventEnvelope) => void;

export interface RuntimeFactoryContext {
  readonly command: CommandEnvelope;
  readonly last_durable_sequence: number;
}

export type RuntimeFactory = (context: RuntimeFactoryContext) => AgentRuntime;

export interface ControlPlaneHooks {
  readonly reserveUsage?: (runId: RunId) => Promise<number>;
  readonly finalizeUsage?: (runId: RunId, disposition: "completed" | "failed" | "canceled") => Promise<void>;
  readonly releaseResources?: (runId: RunId) => Promise<readonly { readonly resource_id: string; readonly provider: string }[]>;
  readonly workerId?: string;
  readonly leaseMs?: number;
  readonly heartbeatMs?: number;
  readonly maxAttempts?: number;
}

interface SequenceAwareRuntime extends AgentRuntime {
  synchronizeDurableSequence(sequence: number): void;
}

interface StoredCommand {
  readonly fingerprint: string;
  readonly command: CommandEnvelope;
  readonly result: JsonObject;
}

interface DurableRun {
  readonly run_id: RunId;
  readonly start_scope: string;
  readonly start_command: CommandEnvelope;
  readonly snapshot: ExecutionSnapshot;
}

function isSequenceAware(runtime: AgentRuntime): runtime is SequenceAwareRuntime {
  return "synchronizeDurableSequence" in runtime
    && typeof (runtime as Partial<SequenceAwareRuntime>).synchronizeDurableSequence === "function";
}

function serviceActorId(runId: string) {
  const suffix = createHash("sha256").update(`beyond-local-app-server:${runId}`).digest("hex").slice(0, 32);
  return canonicalId("act", suffix);
}

function commandResult(command: CommandEnvelope, outcome: string, extra: JsonObject = {}): JsonObject {
  return {
    accepted: true,
    run_id: command.run_id!,
    command_type: command.command_type,
    outcome,
    ...extra,
  };
}

export class LocalAppServerCore {
  private readonly events = new Map<string, EventEnvelope[]>();
  private readonly commands = new Map<string, StoredCommand>();
  private readonly checkpoints = new Map<string, CheckpointReference>();
  private readonly approvals = new Map<string, { readonly approval_id: string; readonly status: "pending" | "approved" | "denied" | "expired" }>();
  private readonly runs = new Map<string, DurableRun>();
  private readonly runtimes = new Map<string, AgentRuntime>();
  private readonly subscribers = new Map<string, Set<Subscriber>>();
  private readonly activeRuns = new Map<string, Promise<void>>();
  private readonly leaseHeartbeats = new Map<string, ReturnType<typeof setInterval>>();
  private readonly deferredSchedules = new Set<string>();
  private readonly executionBarriers = new Map<string, Promise<void>>();
  private commandTail: Promise<void> = Promise.resolve();
  private initialized = false;
  private closed = false;
  readonly store: AppendOnlyStore;
  private readonly runtimeFactory: RuntimeFactory;
  private readonly afterPersist: (event: EventEnvelope) => Promise<void>;
  private readonly hooks: ControlPlaneHooks;

  constructor(
    store: AppendOnlyStore,
    runtimeFactory: RuntimeFactory,
    afterPersist: (event: EventEnvelope) => Promise<void> = async () => {},
    hooks: ControlPlaneHooks = {},
  ) {
    this.store = store;
    this.runtimeFactory = runtimeFactory;
    this.afterPersist = afterPersist;
    this.hooks = hooks;
  }

  async init(): Promise<void> {
    if (this.initialized) throw new ContractError("internal.unexpected", "LocalAppServerCore.init is single-use");
    await this.store.init();
    for (const record of await this.store.read()) this.applyRecord(record, false);
    this.initialized = true;
    for (const run of [...this.runs.values()]) {
      if (isTerminalState(run.snapshot.state) || run.snapshot.state === "paused" || run.snapshot.state === "awaiting_approval") continue;
      await this.prepareRecovery(run.run_id);
      this.scheduleRun(run.run_id, this.checkpoints.has(run.run_id));
    }
    for (const stored of [...this.commands.values()]) {
      if (stored.command.command_type === "run.start" || stored.result.outcome !== "accepted") continue;
      const runtime = await this.waitForRuntime(stored.command.run_id!);
      if (!runtime) {
        await this.commit([this.commandRecord(stored.command, commandResult(stored.command, "failed", { error_code: "checkpoint.unavailable" }))]);
        continue;
      }
      if (stored.command.command_type === "run.steer") await this.steerCommand(stored.command, true);
      else if (stored.command.command_type === "run.cancel") await this.cancelCommand(stored.command, true);
      else if (stored.command.command_type === "run.checkpoint") await this.checkpointCommand(stored.command, true);
    }
  }

  private checkVersion(version: string): void {
    if (version !== PROTOCOL_VERSION) throw new ContractError("schema.unsupported_version", "Unsupported local protocol version");
  }

  private commandScope(command: CommandEnvelope): string {
    return [
      command.organization_id,
      command.project_id ?? "-",
      command.thread_id ?? "-",
      command.run_id ?? "-",
      command.actor.id,
      command.idempotency_key,
    ].join(":");
  }

  private fingerprint(command: CommandEnvelope): string {
    return serializeCanonical({
      organization_id: command.organization_id,
      project_id: command.project_id ?? null,
      thread_id: command.thread_id ?? null,
      run_id: command.run_id ?? null,
      actor: command.actor,
      type: command.command_type,
      schema_version: command.schema_version,
      payload: command.payload,
      expected: command.expected_version ?? null,
    });
  }

  private commandRecord(command: CommandEnvelope, result: JsonObject): StoreRecord {
    return {
      kind: "command",
      scope: this.commandScope(command),
      fingerprint: this.fingerprint(command),
      command,
      result,
    };
  }

  private runRecord(run: DurableRun): StoreRecord {
    return {
      kind: "run",
      run_id: run.run_id,
      start_scope: run.start_scope,
      start_command: run.start_command,
      snapshot: run.snapshot,
    };
  }

  private coreEvent(command: CommandEnvelope, eventType: string, payload: JsonObject): EventEnvelope {
    const runId = command.run_id!;
    const event: EventEnvelope = {
      event_id: canonicalId("evt", crypto.randomUUID().replaceAll("-", "")),
      event_type: eventType,
      schema_version: EVENT_SCHEMA_VERSION,
      organization_id: command.organization_id,
      project_id: command.project_id,
      thread_id: command.thread_id,
      run_id: runId,
      sequence: (this.events.get(runId) ?? []).length + 1,
      occurred_at: new Date().toISOString(),
      actor: { type: "service", id: serviceActorId(runId) },
      causation_id: canonicalId("cau", command.command_id.slice(4)),
      correlation_id: command.correlation_id,
      payload,
      visibility: "project",
      sensitivity: "normal",
    };
    assertEventEnvelope(event);
    return event;
  }

  private async commit(records: readonly StoreRecord[]): Promise<void> {
    if (this.closed) throw new ContractError("internal.unexpected", "Local app server is closed");
    await this.store.append(records);
    const committedEvents: EventEnvelope[] = [];
    for (const record of records) {
      this.applyRecord(record, false);
      if (record.kind === "event") committedEvents.push(record.event);
    }
    for (const event of committedEvents) {
      try { await this.afterPersist(event); } catch { /* durable state remains authoritative */ }
      for (const subscriber of this.subscribers.get(event.run_id!) ?? []) {
        try { subscriber(event); } catch { /* isolate clients */ }
      }
    }
    for (const event of committedEvents) this.synchronizeRuntime(event.run_id!);
  }

  private applyRecord(record: StoreRecord, _duringReplay: boolean): void {
    if (record.kind === "command") {
      assertCommandEnvelope(record.command);
      if (record.scope !== this.commandScope(record.command) || record.fingerprint !== this.fingerprint(record.command)) {
        throw new ContractError("validation.invalid_envelope", "Stored command identity does not match its envelope");
      }
      this.commands.set(record.scope, { fingerprint: record.fingerprint, command: record.command, result: record.result });
      return;
    }
    if (record.kind === "run") {
      assertCommandEnvelope(record.start_command);
      if (record.start_command.command_type !== "run.start" || record.start_command.run_id !== record.run_id) {
        throw new ContractError("validation.invalid_envelope", "Stored run start command is invalid");
      }
      const previous = this.runs.get(record.run_id);
      if (record.snapshot.run_id !== record.run_id || record.snapshot.version < 0) {
        throw new ContractError("validation.invalid_envelope", "Stored run snapshot is invalid");
      }
      if (previous) {
        if (record.snapshot.version !== previous.snapshot.version + 1 || !canTransition(previous.snapshot.state, record.snapshot.state)) {
          throw new ContractError("state.invalid_transition", "Stored run history contains an invalid transition", {
            from: previous.snapshot.state,
            to: record.snapshot.state,
          });
        }
      } else if (record.snapshot.state !== "accepted" || record.snapshot.version !== 0) {
        throw new ContractError("state.invalid_transition", "First stored run state must be accepted version zero");
      }
      this.runs.set(record.run_id, {
        run_id: record.run_id as RunId,
        start_scope: record.start_scope,
        start_command: record.start_command,
        snapshot: Object.freeze(record.snapshot),
      });
      return;
    }
    if (record.kind === "event") {
      assertEventEnvelope(record.event);
      if (record.event.run_id !== record.run_id) throw new ContractError("validation.invalid_envelope", "Event record run mismatch");
      const list = this.events.get(record.run_id) ?? [];
      if (record.event.sequence !== list.length + 1) {
        throw new ContractError("event.sequence_conflict", "Noncontiguous durable event log", {
          run_id: record.run_id,
          expected: list.length + 1,
          actual: record.event.sequence,
        });
      }
      list.push(Object.freeze(record.event));
      this.events.set(record.run_id, list);
      return;
    }
    if (record.kind === "checkpoint") {
      if (record.checkpoint.run_id !== record.run_id) throw new ContractError("validation.invalid_envelope", "Checkpoint record run mismatch");
      this.checkpoints.set(record.run_id, Object.freeze(record.checkpoint));
      return;
    }
    if (record.kind === "approval") {
      this.approvals.set(record.run_id, { approval_id: record.approval_id, status: record.status });
      return;
    }
    if (["attempt", "lease", "resource", "usage", "output"].includes(record.kind)) return;
    throw new ContractError("validation.invalid_envelope", "Unknown durable record kind");
  }

  command(version: string, command: CommandEnvelope): Promise<JsonObject> {
    const result = this.commandTail.then(() => this.executeCommand(version, command));
    this.commandTail = result.then(() => {}, () => {});
    return result;
  }

  private validateCommand(command: CommandEnvelope): void {
    assertCommandEnvelope(command);
    if (command.schema_version !== COMMAND_SCHEMA_VERSION) throw new ContractError("schema.unsupported_version", "Unsupported command schema");
    if (!command.run_id || !command.project_id || !command.thread_id) {
      throw new ContractError("validation.invalid_envelope", "project_id, thread_id, and run_id are required");
    }
    if (!COMMAND_TYPES.has(command.command_type)) {
      throw new ContractError("validation.invalid_envelope", "Unsupported command type", { command_type: command.command_type });
    }
    if (command.command_type === "run.start" && (typeof command.payload.prompt !== "string" || !command.payload.prompt.trim())) {
      throw new ContractError("validation.invalid_envelope", "run.start requires a non-empty prompt");
    }
    if (command.command_type === "run.steer" && (typeof command.payload.message !== "string" || !command.payload.message.trim())) {
      throw new ContractError("validation.invalid_envelope", "run.steer requires a non-empty message");
    }
    if (command.command_type === "approval.resolve" && !["approved", "denied"].includes(String(command.payload.decision))) {
      throw new ContractError("validation.invalid_envelope", "approval.resolve requires an approved or denied decision");
    }
  }

  private async executeCommand(version: string, command: CommandEnvelope): Promise<JsonObject> {
    this.checkVersion(version);
    this.validateCommand(command);
    const runId = command.run_id!;
    const scope = this.commandScope(command);
    const fingerprint = this.fingerprint(command);
    const previous = this.commands.get(scope);
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new ContractError("idempotency.conflict", "Idempotency key conflict");
      return { ...previous.result, duplicate: true };
    }

    if (command.command_type === "run.start") return await this.startCommand(command);
    const run = this.runs.get(runId);
    if (!run) throw new ContractError("validation.invalid_id", "Run does not exist");
    if (command.organization_id !== run.start_command.organization_id
      || command.project_id !== run.start_command.project_id
      || command.thread_id !== run.start_command.thread_id) {
      throw new ContractError("authorization.denied", "Command scope does not match the run");
    }
    if (command.expected_version !== undefined && command.expected_version !== run.snapshot.version) {
      throw new ContractError("concurrency.version_conflict", "Run version does not match", {
        expected: command.expected_version,
        actual: run.snapshot.version,
      });
    }
    if (isTerminalState(run.snapshot.state)) throw new ContractError("state.invalid_transition", "Terminal runs reject further commands");

    switch (command.command_type) {
      case "run.steer": return await this.steerCommand(command);
      case "run.cancel": return await this.cancelCommand(command);
      case "run.checkpoint": return await this.checkpointCommand(command);
      case "run.resume": return await this.resumeCommand(command);
      case "run.retry": return await this.resumeCommand(command);
      case "approval.resolve": return await this.resolveApprovalCommand(command);
      default: throw new ContractError("validation.invalid_envelope", "Unsupported command type");
    }
  }

  private async startCommand(command: CommandEnvelope): Promise<JsonObject> {
    const runId = command.run_id!;
    if (this.runs.has(runId)) throw new ContractError("state.invalid_transition", "run.start cannot reuse an existing run_id");
    const result = commandResult(command, "accepted");
    const snapshot: ExecutionSnapshot = Object.freeze({
      run_id: runId,
      state: "accepted",
      version: 0,
      attempt: 1,
      updated_at: new Date().toISOString(),
    });
    const run: DurableRun = {
      run_id: runId,
      start_scope: this.commandScope(command),
      start_command: command,
      snapshot,
    };
    const event = this.coreEvent(command, "run.accepted", { state: "accepted", version: 0 });
    const reservedUnits = await this.hooks.reserveUsage?.(runId) ?? 1;
    await this.commit([
      this.commandRecord(command, result),
      this.runRecord(run),
      { kind: "event", run_id: runId, event },
      { kind: "usage", run_id: runId, status: "reserved", units: reservedUnits, occurred_at: new Date().toISOString() },
    ]);
    this.scheduleRun(runId, false);
    return { ...result, duplicate: false };
  }

  private async steerCommand(command: CommandEnvelope, intentPersisted = false): Promise<JsonObject> {
    const runtime = this.runtimes.get(command.run_id!);
    if (!runtime) throw new ContractError("state.invalid_transition", "Only an active run can be steered");
    const accepted = commandResult(command, "accepted");
    if (!intentPersisted) await this.commit([this.commandRecord(command, accepted)]);
    try {
      await runtime.steer(command.run_id!, String(command.payload.message));
      const event = this.coreEvent(command, "run.steered", { message: command.payload.message });
      const completed = commandResult(command, "completed", { durable_sequence: event.sequence });
      await this.commit([
        { kind: "event", run_id: command.run_id!, event },
        this.commandRecord(command, completed),
      ]);
      return { ...completed, duplicate: false };
    } catch (error) {
      const failed = commandResult(command, "failed", { error_code: "internal.unexpected" });
      await this.commit([this.commandRecord(command, failed)]);
      throw error;
    }
  }

  private async cancelCommand(command: CommandEnvelope, intentPersisted = false): Promise<JsonObject> {
    const runId = command.run_id!;
    const runtime = this.runtimes.get(runId);
    if (!runtime || !this.activeRuns.has(runId)) throw new ContractError("state.invalid_transition", "Only an active run can be canceled");
    const release = this.beginExecutionBarrier(runId);
    try {
      if (!intentPersisted) {
        const requested = this.coreEvent(command, "run.cancel.requested", { requested_at: command.issued_at });
        const accepted = commandResult(command, "accepted", { durable_sequence: requested.sequence });
        await this.commit([
          this.commandRecord(command, accepted),
          { kind: "event", run_id: runId, event: requested },
        ]);
      }
      const acknowledgement = await runtime.cancel({
        run_id: runId,
        requested_at: command.issued_at,
        reason: typeof command.payload.reason === "string" ? command.payload.reason : undefined,
        expected_version: command.expected_version,
      });
      if (!acknowledgement.accepted) {
        const failed = commandResult(command, "failed", { error_code: "run.canceled", propagated_to: [] });
        await this.commit([this.commandRecord(command, failed)]);
        throw new ContractError("state.invalid_transition", "Runtime no longer had an active execution to cancel");
      }
      const completed = commandResult(command, "completed", { propagated_to: acknowledgement.propagated_to });
      await this.transitionRun(runId, "canceled", {
        propagated_to: acknowledgement.propagated_to,
        requested_at: command.issued_at,
      }, [this.commandRecord(command, completed)]);
      await this.releaseResources(runId);
      await this.hooks.finalizeUsage?.(runId, "canceled");
      await this.commit([{ kind: "usage", run_id: runId, status: "released", units: 0, occurred_at: new Date().toISOString() }]);
      return { ...completed, duplicate: false };
    } finally {
      release();
    }
  }

  private async checkpointCommand(command: CommandEnvelope, intentPersisted = false): Promise<JsonObject> {
    const runId = command.run_id!;
    const runtime = this.runtimes.get(runId);
    if (!runtime || !this.activeRuns.has(runId)) throw new ContractError("state.invalid_transition", "Only an active run can be checkpointed");
    const release = command.payload.pause === true ? this.beginExecutionBarrier(runId) : undefined;
    try {
      this.synchronizeRuntime(runId);
      const accepted = commandResult(command, "accepted");
      if (!intentPersisted) await this.commit([this.commandRecord(command, accepted)]);
      const checkpoint = await runtime.checkpoint({
        run_id: runId,
        durable_sequence: (this.events.get(runId) ?? []).length,
        reason: command.payload.reason === "approval_wait" ? "approval_wait" : command.payload.reason === "recovery" ? "recovery" : "manual",
      });
      if (checkpoint.run_id !== runId || checkpoint.event_sequence !== (this.events.get(runId) ?? []).length) {
        throw new ContractError("validation.invalid_envelope", "Runtime returned a checkpoint for the wrong durable position");
      }
      const event = this.coreEvent(command, "run.checkpointed", {
        checkpoint_id: checkpoint.checkpoint_id,
        event_sequence: checkpoint.event_sequence,
        process_memory_restored: false,
      });
      const completed = commandResult(command, "completed", { checkpoint_id: checkpoint.checkpoint_id, durable_sequence: event.sequence });
      await this.commit([
        { kind: "checkpoint", run_id: runId, checkpoint },
        { kind: "event", run_id: runId, event },
        this.commandRecord(command, completed),
      ]);
      if (command.payload.pause === true) {
        const acknowledgement = await runtime.cancel({ run_id: runId, requested_at: new Date().toISOString(), reason: "checkpoint pause" });
        if (!acknowledgement.accepted) throw new ContractError("state.invalid_transition", "Runtime could not pause after checkpoint");
        await this.transitionRun(runId, "paused", { checkpoint_id: checkpoint.checkpoint_id, propagated_to: acknowledgement.propagated_to });
      }
      return { ...completed, duplicate: false };
    } finally {
      release?.();
    }
  }

  private async resumeCommand(command: CommandEnvelope): Promise<JsonObject> {
    const runId = command.run_id!;
    const run = this.runs.get(runId)!;
    if (run.snapshot.state !== "paused" && run.snapshot.state !== "stalled") {
      throw new ContractError("state.invalid_transition", "run.resume requires a paused or stalled run");
    }
    if (!this.checkpoints.has(runId)) throw new ContractError("checkpoint.unavailable", "No checkpoint");
    const accepted = commandResult(command, "accepted");
    const transition = transitionExecution(run.snapshot, {
      to: "reconciling",
      occurred_at: new Date().toISOString(),
      expected_version: command.expected_version,
      reason_code: "manual_resume",
    });
    const nextRun = { ...run, snapshot: transition };
    const event = this.coreEvent(command, "run.reconciling", { from_state: run.snapshot.state, checkpoint_id: this.checkpoints.get(runId)!.checkpoint_id });
    const completed = commandResult(command, "completed", { durable_sequence: event.sequence });
    await this.commit([
      this.commandRecord(command, accepted),
      this.runRecord(nextRun),
      { kind: "event", run_id: runId, event },
      this.commandRecord(command, completed),
    ]);
    this.scheduleRun(runId, true);
    return { ...completed, duplicate: false };
  }

  private async resolveApprovalCommand(command: CommandEnvelope): Promise<JsonObject> {
    const runId = command.run_id!;
    const run = this.runs.get(runId)!;
    const approval = this.approvals.get(runId);
    if (run.snapshot.state !== "awaiting_approval" || !approval || approval.status !== "pending") {
      throw new ContractError("state.invalid_transition", "No pending approval exists for this run");
    }
    if (command.payload.approval_id !== undefined && command.payload.approval_id !== approval.approval_id) {
      throw new ContractError("validation.invalid_id", "Approval ID does not match the pending approval");
    }
    const decision = String(command.payload.decision) as "approved" | "denied";
    const event = this.coreEvent(command, "approval.resolved", { approval_id: approval.approval_id, decision });
    const completed = commandResult(command, "completed", { decision, durable_sequence: event.sequence });
    await this.commit([
      this.commandRecord(command, completed),
      { kind: "approval", run_id: runId, approval_id: approval.approval_id, status: decision, payload: command.payload, occurred_at: new Date().toISOString() },
      { kind: "event", run_id: runId, event },
    ]);
    if (decision === "denied") {
      await this.transitionRun(runId, "failed", { reason_code: "approval_denied" });
      await this.hooks.finalizeUsage?.(runId, "failed");
      await this.releaseResources(runId);
      return { ...completed, duplicate: false };
    }
    if (!this.checkpoints.has(runId)) throw new ContractError("checkpoint.unavailable", "Approval wait has no checkpoint");
    await this.transitionRun(runId, "reconciling", { previous_state: "awaiting_approval", reason_code: "approval_granted" });
    this.scheduleRun(runId, true);
    return { ...completed, duplicate: false };
  }

  private scheduleRun(runId: string, resume: boolean): void {
    if (this.closed) return;
    const current = this.activeRuns.get(runId);
    if (current) {
      if (!this.deferredSchedules.has(runId)) {
        this.deferredSchedules.add(runId);
        void current.finally(() => {
          this.deferredSchedules.delete(runId);
          this.scheduleRun(runId, resume);
        }).catch(() => {});
      }
      return;
    }
    const execution = this.executeRun(runId as RunId, resume);
    this.activeRuns.set(runId, execution);
    execution.finally(() => {
      if (this.activeRuns.get(runId) === execution) this.activeRuns.delete(runId);
      this.runtimes.delete(runId);
    }).catch(() => {});
  }

  private async executeRun(runId: RunId, resume: boolean): Promise<void> {
    const attempt = this.runs.get(runId)!.snapshot.attempt;
    const leaseId = `lease:${crypto.randomUUID()}`;
    const workerId = this.hooks.workerId ?? `worker:${process.pid}`;
    const leaseMs = this.hooks.leaseMs ?? 30_000;
    const leaseRecord = (releasedAt?: string): StoreRecord => ({
      kind: "lease", run_id: runId, lease_id: leaseId, worker_id: workerId,
      expires_at: releasedAt ?? new Date(Date.now() + leaseMs).toISOString(),
      heartbeat_at: new Date().toISOString(), ...(releasedAt ? { released_at: releasedAt } : {}),
    });
    await this.commit([
      { kind: "attempt", run_id: runId, attempt, status: "started", occurred_at: new Date().toISOString() },
      leaseRecord(),
    ]);
    const heartbeat = setInterval(() => { void this.commit([leaseRecord()]).catch(() => {}); }, this.hooks.heartbeatMs ?? 10_000);
    heartbeat.unref();
    this.leaseHeartbeats.set(runId, heartbeat);
    let retry = false;
    let suspendedForApproval = false;
    try {
      let run = this.runs.get(runId)!;
      if (run.snapshot.state === "accepted") await this.transitionRun(runId, "queued", {});
      run = this.runs.get(runId)!;
      if (run.snapshot.state === "queued") await this.transitionRun(runId, "leased", {});
      run = this.runs.get(runId)!;
      if (run.snapshot.state === "leased" || run.snapshot.state === "reconciling" || run.snapshot.state === "retrying") {
        await this.transitionRun(runId, "preparing", { recovery: resume });
      }
      run = this.runs.get(runId)!;
      if (run.snapshot.state !== "preparing") return;
      const runtime = this.runtimeFactory({
        command: run.start_command,
        last_durable_sequence: (this.events.get(runId) ?? []).length,
      });
      this.runtimes.set(runId, runtime);
      const checkpoint = this.checkpoints.get(runId);
      const stream = resume && checkpoint
        ? runtime.resume(checkpoint)
        : runtime.start({ prompt: String(run.start_command.payload.prompt) });
      for await (const candidate of stream) {
        const current = this.runs.get(runId);
        if (!current || current.snapshot.state === "paused" || current.snapshot.state === "awaiting_approval" || isTerminalState(current.snapshot.state)) break;
        await this.acceptRuntimeEvent(current, candidate);
        if (candidate.event_type === "approval.requested") {
          suspendedForApproval = true;
          break;
        }
      }
      if (suspendedForApproval) return;
      await this.waitForExecutionBarrier(runId);
      const settled = this.runs.get(runId);
      if (!settled || settled.snapshot.state === "paused" || settled.snapshot.state === "awaiting_approval" || isTerminalState(settled.snapshot.state)) return;
      if (settled.snapshot.state === "running") await this.transitionRun(runId, "completing", { source: "coordinator" });
      if (this.runs.get(runId)!.snapshot.state === "completing") await this.transitionRun(runId, "completed", {});
      await this.commit([
        { kind: "attempt", run_id: runId, attempt, status: "completed", occurred_at: new Date().toISOString() },
        { kind: "usage", run_id: runId, status: "finalized", units: 0, occurred_at: new Date().toISOString() },
      ]);
      await this.hooks.finalizeUsage?.(runId, "completed");
      await this.releaseResources(runId);
    } catch (error) {
      if (suspendedForApproval) return;
      await this.waitForExecutionBarrier(runId);
      const run = this.runs.get(runId);
      if (!run || run.snapshot.state === "paused" || run.snapshot.state === "awaiting_approval" || isTerminalState(run.snapshot.state)) return;
      const errorCode = error instanceof ContractError ? error.code : "internal.unexpected";
      await this.commit([{ kind: "attempt", run_id: runId, attempt, status: "failed", occurred_at: new Date().toISOString(), reason_code: errorCode }]);
      const retryable = error instanceof ContractError ? error.retryDisposition !== "never" : true;
      if (retryable && attempt < (this.hooks.maxAttempts ?? 3)) {
        await this.releaseResources(runId);
        await this.transitionRun(runId, "retrying", { error_code: errorCode });
        await this.transitionRun(runId, "queued", { retry: true });
        retry = true;
      } else await this.transitionRun(runId, "failed", {
        error_code: errorCode,
        message: error instanceof Error ? error.message : String(error),
      });
      if (!retry) {
        await this.hooks.finalizeUsage?.(runId, "failed");
        await this.releaseResources(runId);
      }
    } finally {
      clearInterval(heartbeat);
      if (this.leaseHeartbeats.get(runId) === heartbeat) this.leaseHeartbeats.delete(runId);
      const releasedAt = new Date().toISOString();
      if (!this.closed) await this.commit([leaseRecord(releasedAt)]);
    }
    if (retry) await this.executeRun(runId, this.checkpoints.has(runId));
  }

  private async acceptRuntimeEvent(run: DurableRun, candidate: EventEnvelope): Promise<void> {
    assertEventEnvelope(candidate);
    const command = run.start_command;
    if (candidate.organization_id !== command.organization_id
      || candidate.project_id !== command.project_id
      || candidate.thread_id !== command.thread_id
      || candidate.run_id !== command.run_id
      || candidate.correlation_id !== command.correlation_id) {
      throw new ContractError("authorization.denied", "Runtime event scope does not match the durable run");
    }
    const expectedSequence = (this.events.get(run.run_id) ?? []).length + 1;
    if (candidate.sequence !== expectedSequence) {
      throw new ContractError("event.sequence_conflict", "Runtime event sequence differs from durable position", {
        expected: expectedSequence,
        actual: candidate.sequence,
      });
    }
    const target = STATE_BY_EVENT[candidate.event_type];
    if (candidate.event_type === "approval.requested") {
      await this.commit([
        { kind: "event", run_id: run.run_id, event: candidate },
        { kind: "approval", run_id: run.run_id, approval_id: typeof candidate.payload?.approval_id === "string" ? candidate.payload.approval_id : `approval:${candidate.event_id}`, status: "pending", payload: candidate.payload ?? {}, occurred_at: candidate.occurred_at },
      ]);
      await this.suspendForApproval(run.run_id, candidate);
    } else if (target) {
      const transition = transitionExecution(run.snapshot, { to: target, occurred_at: candidate.occurred_at });
      await this.commit([
        this.runRecord({ ...run, snapshot: transition }),
        { kind: "event", run_id: run.run_id, event: candidate },
        ...(isTerminalState(target) ? [this.startCommandOutcome(run, target)] : []),
      ]);
    } else {
      await this.commit([
        { kind: "event", run_id: run.run_id, event: candidate },
        ...(candidate.event_type === "output.created" ? [{ kind: "output", run_id: run.run_id, event_sequence: candidate.sequence, reference: candidate.payload ?? {} } as StoreRecord] : []),
      ]);
    }
  }

  private async suspendForApproval(runId: RunId, request: EventEnvelope): Promise<void> {
    const runtime = this.runtimes.get(runId);
    if (!runtime) throw new ContractError("state.invalid_transition", "Approval wait requires an active runtime");
    this.synchronizeRuntime(runId);
    const checkpoint = await runtime.checkpoint({ run_id: runId, durable_sequence: (this.events.get(runId) ?? []).length, reason: "approval_wait" });
    const checkpointed = this.coreEvent(this.runs.get(runId)!.start_command, "run.checkpointed", { checkpoint_id: checkpoint.checkpoint_id, event_sequence: checkpoint.event_sequence, reason: "approval_wait", process_memory_restored: false });
    await this.commit([{ kind: "checkpoint", run_id: runId, checkpoint }, { kind: "event", run_id: runId, event: checkpointed }]);
    const acknowledgement = await runtime.cancel({ run_id: runId, requested_at: new Date().toISOString(), reason: "approval_wait" });
    if (!acknowledgement.accepted) throw new ContractError("state.invalid_transition", "Runtime could not suspend for approval");
    await this.transitionRun(runId, "awaiting_approval", { approval_id: typeof request.payload?.approval_id === "string" ? request.payload.approval_id : `approval:${request.event_id}`, checkpoint_id: checkpoint.checkpoint_id });
    await this.releaseResources(runId);
  }

  private startCommandOutcome(run: DurableRun, outcome: "completed" | "failed" | "canceled"): StoreRecord {
    return this.commandRecord(run.start_command, commandResult(run.start_command, outcome));
  }

  private async transitionRun(
    runId: RunId,
    target: ExecutionState,
    payload: JsonObject,
    additional: readonly StoreRecord[] = [],
  ): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) throw new ContractError("validation.invalid_id", "Run does not exist");
    const occurredAt = new Date().toISOString();
    const snapshot = transitionExecution(run.snapshot, { to: target, occurred_at: occurredAt });
    const event = this.coreEvent(run.start_command, EVENT_BY_STATE[target], {
      state: target,
      version: snapshot.version,
      ...payload,
    });
    const records: StoreRecord[] = [
      this.runRecord({ ...run, snapshot }),
      { kind: "event", run_id: runId, event },
      ...additional,
    ];
    if (isTerminalState(target)) records.push(this.startCommandOutcome(run, target));
    await this.commit(records);
  }

  private async prepareRecovery(runId: RunId): Promise<void> {
    const run = this.runs.get(runId)!;
    if (run.snapshot.state === "accepted" || run.snapshot.state === "queued") return;
    if (!canTransition(run.snapshot.state, "reconciling")) {
      throw new ContractError("state.invalid_transition", "Run cannot enter recovery", { state: run.snapshot.state });
    }
    await this.transitionRun(runId, "reconciling", { previous_state: run.snapshot.state, process_memory_restored: false });
  }

  private synchronizeRuntime(runId: string): void {
    const runtime = this.runtimes.get(runId);
    if (runtime && isSequenceAware(runtime)) runtime.synchronizeDurableSequence((this.events.get(runId) ?? []).length);
  }

  private async releaseResources(runId: RunId): Promise<void> {
    const released = await this.hooks.releaseResources?.(runId) ?? [];
    if (released.length === 0) return;
    await this.commit(released.map((resource) => ({
      kind: "resource" as const,
      run_id: runId,
      resource_id: resource.resource_id,
      provider: resource.provider,
      state: "released" as const,
      occurred_at: new Date().toISOString(),
    })));
  }

  private beginExecutionBarrier(runId: string): () => void {
    if (this.executionBarriers.has(runId)) {
      throw new ContractError("concurrency.version_conflict", "A run control effect is already in progress");
    }
    let resolve!: () => void;
    const barrier = new Promise<void>((done) => { resolve = done; });
    this.executionBarriers.set(runId, barrier);
    return () => {
      if (this.executionBarriers.get(runId) === barrier) this.executionBarriers.delete(runId);
      resolve();
    };
  }

  private async waitForExecutionBarrier(runId: string): Promise<void> {
    await this.executionBarriers.get(runId);
  }

  private async waitForRuntime(runId: string): Promise<AgentRuntime | undefined> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const runtime = this.runtimes.get(runId);
      if (runtime) return runtime;
      const run = this.runs.get(runId);
      if (!run || isTerminalState(run.snapshot.state) || run.snapshot.state === "paused") return undefined;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    return undefined;
  }

  async awaitIdle(runId: string): Promise<void> {
    await this.activeRuns.get(runId);
  }

  replay(version: string, runId: string, after: number): { readonly events: readonly EventEnvelope[]; readonly cursor: number } {
    this.checkVersion(version);
    if (!Number.isSafeInteger(after) || after < 0) throw new ContractError("validation.invalid_envelope", "Invalid cursor");
    const events = this.events.get(runId) ?? [];
    if (after > events.length) throw new ContractError("validation.invalid_envelope", "Cursor exceeds committed sequence");
    return { events: Object.freeze(events.filter((event) => event.sequence > after)), cursor: events.length };
  }

  snapshot(version: string, runId: string): JsonObject {
    this.checkVersion(version);
    const run = this.runs.get(runId);
    if (!run) return { run_id: runId, status: "not_found", last_sequence: 0, checkpoint: null };
    return {
      run_id: runId,
      status: run.snapshot.state,
      version: run.snapshot.version,
      attempt: run.snapshot.attempt,
      last_sequence: (this.events.get(runId) ?? []).length,
      checkpoint: toJsonValue(this.checkpoints.get(runId) ?? null),
      approval: toJsonValue(this.approvals.get(runId) ?? null),
    };
  }

  subscribe(version: string, runId: string, after: number, subscriber: Subscriber): () => void {
    const page = this.replay(version, runId, after);
    const set = this.subscribers.get(runId) ?? new Set<Subscriber>();
    set.add(subscriber);
    this.subscribers.set(runId, set);
    for (const event of page.events) subscriber(event);
    return () => { set.delete(subscriber); };
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const heartbeat of this.leaseHeartbeats.values()) clearInterval(heartbeat);
    this.leaseHeartbeats.clear();
    this.subscribers.clear();
    this.store.close();
  }
}
