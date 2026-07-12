import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  EVENT_SCHEMA_VERSION,
  canonicalId,
  type AgentRuntime,
  type CancellationAcknowledgement,
  type CancellationRequest,
  type CheckpointReference,
  type CheckpointRequest,
  type CommandEnvelope,
  type EventEnvelope,
  type JsonObject,
  type RunId,
} from "@beyond/contracts";
import { createOfflinePiRuntimeFactory } from "../src/pi-runtime.ts";
import { AppendOnlyStore } from "../src/store.ts";
import { LocalAppServerCore, PROTOCOL_VERSION, type RuntimeFactory, type RuntimeFactoryContext } from "../src/protocol.ts";

const ids = {
  organization_id: canonicalId("org", "01HX7W2J8P4XW3D9CZV3"),
  project_id: canonicalId("prj", "01HX7W2J8P4XW3D9CZV3"),
  thread_id: canonicalId("thr", "01HX7W2J8P4XW3D9CZV3"),
  run_id: canonicalId("run", "01HX7W2J8P4XW3D9CZV3"),
};
const agentActor = { type: "agent" as const, id: canonicalId("act", "01HX7W2J8P4XW3D9CZV8") };
const runtimeImageDigest = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const manifest = { uri: "data:application/json;base64,e30=", digest: "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a", media_type: "application/json", byte_size: 2 };
let counter = 0;

function command(
  type: string,
  payload: JsonObject = {},
  key = `key-${++counter}`,
  overrides: Partial<CommandEnvelope> = {},
): CommandEnvelope {
  return {
    ...ids,
    command_id: canonicalId("cmd", crypto.randomUUID().replaceAll("-", "")),
    command_type: type,
    schema_version: "1.0",
    actor: { type: "user", id: canonicalId("act", "01HX7W2J8P4XW3D9CZV3") },
    idempotency_key: key,
    correlation_id: canonicalId("cor", "01HX7W2J8P4XW3D9CZV3"),
    issued_at: new Date().toISOString(),
    payload,
    ...overrides,
  };
}

function runtimeEvent(context: RuntimeFactoryContext, sequence: number, type: string, payload: JsonObject = {}): EventEnvelope {
  return {
    event_id: canonicalId("evt", crypto.randomUUID().replaceAll("-", "")),
    event_type: type,
    schema_version: EVENT_SCHEMA_VERSION,
    organization_id: context.command.organization_id,
    project_id: context.command.project_id,
    thread_id: context.command.thread_id,
    run_id: context.command.run_id,
    sequence,
    occurred_at: new Date().toISOString(),
    actor: agentActor,
    correlation_id: context.command.correlation_id,
    payload,
    visibility: "project",
    sensitivity: "normal",
  };
}

class ControlledRuntime implements AgentRuntime {
  protected readonly context: RuntimeFactoryContext;
  private readonly hold: boolean;
  private readonly rejectAfterRelease: boolean;
  protected sequence: number;
  protected active = false;
  private canceled = false;
  private release!: () => void;
  private readonly gate = new Promise<void>((resolve) => { this.release = resolve; });
  readonly started: Promise<void>;
  private markStarted!: () => void;
  readonly steered: string[] = [];

  constructor(context: RuntimeFactoryContext, hold = true, rejectAfterRelease = false) {
    this.context = context;
    this.hold = hold;
    this.rejectAfterRelease = rejectAfterRelease;
    this.sequence = context.last_durable_sequence;
    this.started = new Promise<void>((resolve) => { this.markStarted = resolve; });
  }

  start(): AsyncIterable<EventEnvelope> { return this.run(false); }
  resume(): AsyncIterable<EventEnvelope> { return this.run(true); }

  private async *run(resumed: boolean): AsyncIterable<EventEnvelope> {
    this.active = true;
    yield runtimeEvent(this.context, ++this.sequence, "run.running", { resumed });
    this.markStarted();
    if (this.hold) await this.gate;
    if (this.rejectAfterRelease) throw new Error("runtime aborted during cancellation");
    if (!this.canceled) yield runtimeEvent(this.context, ++this.sequence, "run.completing", {});
    this.active = false;
  }

  async steer(runId: RunId, message: string): Promise<void> {
    assert.equal(runId, this.context.command.run_id);
    this.steered.push(message);
  }

  async cancel(request: CancellationRequest): Promise<CancellationAcknowledgement> {
    const accepted = this.active;
    if (accepted) {
      this.canceled = true;
      this.release();
    }
    return { run_id: request.run_id, accepted, durable_sequence: this.sequence, propagated_to: accepted ? ["runtime"] : [] };
  }

  async checkpoint(request: CheckpointRequest): Promise<CheckpointReference> {
    assert.equal(request.durable_sequence, this.sequence);
    return {
      checkpoint_id: canonicalId("chk", crypto.randomUUID().replaceAll("-", "")),
      run_id: request.run_id,
      event_sequence: request.durable_sequence,
      runtime_state: manifest,
      working_set_manifest: manifest,
      artifacts: [],
      runtime_image_digest: runtimeImageDigest,
      provider_metadata: { logical_only: true, process_memory_restored: false },
    };
  }

  synchronizeDurableSequence(sequence: number): void {
    assert.ok(sequence >= this.sequence);
    this.sequence = sequence;
  }
}

class InterruptedCancelRuntime extends ControlledRuntime {
  readonly cancelStarted: Promise<void>;
  private markCancelStarted!: () => void;
  constructor(context: RuntimeFactoryContext) {
    super(context);
    this.cancelStarted = new Promise<void>((resolve) => { this.markCancelStarted = resolve; });
  }
  override async cancel(_request: CancellationRequest): Promise<CancellationAcknowledgement> {
    this.markCancelStarted();
    return await new Promise<CancellationAcknowledgement>(() => {});
  }
}

class ApprovalRuntime extends ControlledRuntime {
  constructor(context: RuntimeFactoryContext) {
    super(context, false);
  }
  override start(): AsyncIterable<EventEnvelope> { return this.requestApproval(); }
  override resume(): AsyncIterable<EventEnvelope> { return this.finishAfterApproval(); }
  private async *requestApproval(): AsyncIterable<EventEnvelope> {
    this.active = true;
    yield runtimeEvent(this.context, ++this.sequence, "run.running");
    yield runtimeEvent(this.context, ++this.sequence, "approval.requested", { approval_id: "approval:publish", action: "publish" });
  }
  private async *finishAfterApproval(): AsyncIterable<EventEnvelope> {
    this.active = true;
    yield runtimeEvent(this.context, ++this.sequence, "run.running", { resumed: true });
    yield runtimeEvent(this.context, ++this.sequence, "run.completing");
    this.active = false;
  }
  override async cancel(request: CancellationRequest): Promise<CancellationAcknowledgement> {
    const accepted = this.active;
    this.active = false;
    return { run_id: request.run_id, accepted, durable_sequence: this.sequence, propagated_to: accepted ? ["runtime"] : [] };
  }
  override synchronizeDurableSequence(sequence: number): void { this.sequence = sequence; }
}

async function setup(runtimeFactory?: RuntimeFactory, afterPersist?: (event: EventEnvelope) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "beyond-core-"));
  const path = join(directory, "journal.sqlite");
  const factory = runtimeFactory ?? createOfflinePiRuntimeFactory(() => [{ type: "text", text: "offline response" }], { runtimeImageDigest });
  const core = new LocalAppServerCore(new AppendOnlyStore(path), factory, afterPersist);
  await core.init();
  return { core, path, factory };
}

async function waitForRuntime<T extends ControlledRuntime>(getRuntime: () => T | undefined): Promise<T> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const runtime = getRuntime();
    if (runtime) return runtime;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error("Runtime factory was not invoked");
}

test("real Pi adapter runs behind the canonical protocol and duplicate execution is suppressed", async () => {
  const { core } = await setup();
  const start = command("run.start", { prompt: "document" }, "start-once");
  const accepted = await core.command(PROTOCOL_VERSION, start);
  assert.equal(accepted.outcome, "accepted");
  const duplicate = await core.command(PROTOCOL_VERSION, { ...start, command_id: canonicalId("cmd", crypto.randomUUID().replaceAll("-", "")) });
  assert.equal(duplicate.duplicate, true);
  await core.awaitIdle(ids.run_id);
  const events = core.replay(PROTOCOL_VERSION, ids.run_id, 0).events;
  assert.equal(core.snapshot(PROTOCOL_VERSION, ids.run_id).status, "completed");
  assert.deepEqual(events.map((event) => event.sequence), events.map((_event, index) => index + 1));
  assert.ok(events.some((event) => event.event_type === "message.delta"));
  assert.equal(events.find((event) => event.event_type === "run.running")?.actor.type, "agent");
  assert.equal(events[0].actor.type, "service");
});

test("idempotency scope includes the run and a second start cannot reuse one run_id", async () => {
  const { core } = await setup();
  const first = command("run.start", { prompt: "one" }, "shared-key");
  await core.command(PROTOCOL_VERSION, first);
  await core.awaitIdle(first.run_id!);
  const secondRun = canonicalId("run", "01HX7W2J8P4XW3D9CZV9");
  const second = command("run.start", { prompt: "one" }, "shared-key", { run_id: secondRun });
  assert.equal((await core.command(PROTOCOL_VERSION, second)).duplicate, false);
  await core.awaitIdle(secondRun);
  await assert.rejects(
    () => core.command(PROTOCOL_VERSION, command("run.start", { prompt: "other" }, "different-key")),
    /reuse/u,
  );
});

test("cancellation is honest, terminal, and cannot race into failure or success", async () => {
  let runtime!: ControlledRuntime;
  const factory: RuntimeFactory = (context) => (runtime = new ControlledRuntime(context, true, true));
  const { core } = await setup(factory);
  const start = command("run.start", { prompt: "slow" });
  await core.command(PROTOCOL_VERSION, start);
  runtime = await waitForRuntime(() => runtime);
  await runtime.started;
  const steer = command("run.steer", { message: "prioritize primary sources" }, "steer-once");
  assert.equal((await core.command(PROTOCOL_VERSION, steer)).duplicate, false);
  assert.equal((await core.command(PROTOCOL_VERSION, {
    ...steer,
    command_id: canonicalId("cmd", crypto.randomUUID().replaceAll("-", "")),
  })).duplicate, true);
  assert.deepEqual(runtime.steered, ["prioritize primary sources"]);
  const canceled = await core.command(PROTOCOL_VERSION, command("run.cancel", { reason: "user request" }));
  assert.deepEqual(canceled.propagated_to, ["runtime"]);
  await core.awaitIdle(ids.run_id);
  assert.equal(core.snapshot(PROTOCOL_VERSION, ids.run_id).status, "canceled");
  const types = core.replay(PROTOCOL_VERSION, ids.run_id, 0).events.map((event) => event.event_type);
  assert.equal(types.at(-1), "run.canceled");
  assert.equal(types.includes("run.failed"), false);
  assert.equal(types.includes("run.completed"), false);
  assert.equal(types.filter((type) => type === "run.steered").length, 1);
  await assert.rejects(() => core.command(PROTOCOL_VERSION, command("run.cancel")), /Terminal/u);
});

test("checkpoint pause and resume use authoritative runtime state and legal transitions", async () => {
  const runtimes: ControlledRuntime[] = [];
  const factory: RuntimeFactory = (context) => {
    const runtime = new ControlledRuntime(context, runtimes.length === 0);
    runtimes.push(runtime);
    return runtime;
  };
  const { core, path } = await setup(factory);
  await core.command(PROTOCOL_VERSION, command("run.start", { prompt: "document" }));
  const firstRuntime = await waitForRuntime(() => runtimes[0]);
  await firstRuntime.started;
  const checkpointResult = await core.command(PROTOCOL_VERSION, command("run.checkpoint", { pause: true, reason: "manual" }));
  assert.equal(typeof checkpointResult.checkpoint_id, "string");
  await core.awaitIdle(ids.run_id);
  assert.equal(core.snapshot(PROTOCOL_VERSION, ids.run_id).status, "paused");
  core.close();

  const restarted = new LocalAppServerCore(new AppendOnlyStore(path), factory);
  await restarted.init();
  assert.equal(restarted.snapshot(PROTOCOL_VERSION, ids.run_id).status, "paused");
  await restarted.command(PROTOCOL_VERSION, command("run.resume"));
  await restarted.awaitIdle(ids.run_id);
  assert.equal(restarted.snapshot(PROTOCOL_VERSION, ids.run_id).status, "completed");
  const types = restarted.replay(PROTOCOL_VERSION, ids.run_id, 0).events.map((event) => event.event_type);
  assert.ok(types.includes("run.checkpointed"));
  assert.ok(types.includes("run.paused"));
  assert.ok(types.includes("run.reconciling"));
  restarted.close();
});

test("restart reconciles a nonterminal run from durable command definition", async () => {
  let stranded!: ControlledRuntime;
  const firstFactory: RuntimeFactory = (context) => (stranded = new ControlledRuntime(context));
  const { core: first, path } = await setup(firstFactory);
  const start = command("run.start", { prompt: "recover me" }, "recovery-start");
  await first.command(PROTOCOL_VERSION, start);
  stranded = await waitForRuntime(() => stranded);
  await stranded.started;
  first.close();

  const recoveryFactory: RuntimeFactory = (context) => new ControlledRuntime(context, false);
  const restarted = new LocalAppServerCore(new AppendOnlyStore(path), recoveryFactory);
  await restarted.init();
  await restarted.awaitIdle(ids.run_id);
  assert.equal(restarted.snapshot(PROTOCOL_VERSION, ids.run_id).status, "completed");
  const types = restarted.replay(PROTOCOL_VERSION, ids.run_id, 0).events.map((event) => event.event_type);
  assert.ok(types.includes("run.reconciling"));
  assert.equal(types.at(-1), "run.completed");
  restarted.close();
});

test("restart completes a cancellation whose durable intent survived before its effect", async () => {
  let interrupted!: InterruptedCancelRuntime;
  const firstFactory: RuntimeFactory = (context) => (interrupted = new InterruptedCancelRuntime(context));
  const { core: first, path } = await setup(firstFactory);
  await first.command(PROTOCOL_VERSION, command("run.start", { prompt: "cancel after crash" }, "cancel-crash-start"));
  interrupted = await waitForRuntime(() => interrupted);
  await interrupted.started;
  void first.command(PROTOCOL_VERSION, command("run.cancel", { reason: "persist this intent" }, "cancel-crash-intent")).catch(() => {});
  await interrupted.cancelStarted;
  assert.ok(first.replay(PROTOCOL_VERSION, ids.run_id, 0).events.some((event) => event.event_type === "run.cancel.requested"));
  first.close();

  const recoveryFactory: RuntimeFactory = (context) => new ControlledRuntime(context);
  const restarted = new LocalAppServerCore(new AppendOnlyStore(path), recoveryFactory);
  await restarted.init();
  await restarted.awaitIdle(ids.run_id);
  assert.equal(restarted.snapshot(PROTOCOL_VERSION, ids.run_id).status, "canceled");
  const types = restarted.replay(PROTOCOL_VERSION, ids.run_id, 0).events.map((event) => event.event_type);
  assert.equal(types.filter((type) => type === "run.cancel.requested").length, 1);
  assert.equal(types.at(-1), "run.canceled");
  restarted.close();
});

test("approval suspension releases compute and an immediate approval resumes exactly once", async () => {
  const runtimes: ApprovalRuntime[] = [];
  let releases = 0;
  const factory: RuntimeFactory = (context) => {
    const runtime = new ApprovalRuntime(context);
    runtimes.push(runtime);
    return runtime;
  };
  const directory = await mkdtemp(join(tmpdir(), "beyond-approval-"));
  const core = new LocalAppServerCore(
    new AppendOnlyStore(join(directory, "journal.sqlite")),
    factory,
    async () => {},
    { releaseResources: async () => [{ resource_id: `sandbox:${++releases}`, provider: "modal" }] },
  );
  await core.init();
  await core.command(PROTOCOL_VERSION, command("run.start", { prompt: "publish" }));
  for (let attempt = 0; attempt < 100 && core.snapshot(PROTOCOL_VERSION, ids.run_id).status !== "awaiting_approval"; attempt += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  assert.equal(core.snapshot(PROTOCOL_VERSION, ids.run_id).status, "awaiting_approval");
  await core.command(PROTOCOL_VERSION, command("approval.resolve", { approval_id: "approval:publish", decision: "approved" }));
  for (let attempt = 0; attempt < 100 && core.snapshot(PROTOCOL_VERSION, ids.run_id).status !== "completed"; attempt += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  assert.equal(core.snapshot(PROTOCOL_VERSION, ids.run_id).status, "completed");
  assert.equal(runtimes.length, 2);
  assert.ok(releases >= 2);
  core.close();
});

test("publish and subscriber failures cannot break committed contiguous sequences", async () => {
  let publishCalls = 0;
  const { core, path, factory } = await setup(undefined, async () => { if (++publishCalls === 2) throw new Error("publish fault"); });
  core.subscribe(PROTOCOL_VERSION, ids.run_id, 0, () => { throw new Error("subscriber fault"); });
  await core.command(PROTOCOL_VERSION, command("run.start", { prompt: "x" }));
  await core.awaitIdle(ids.run_id);
  const before = core.replay(PROTOCOL_VERSION, ids.run_id, 0).events;
  core.close();
  const restarted = new LocalAppServerCore(new AppendOnlyStore(path), factory);
  await restarted.init();
  assert.deepEqual(restarted.replay(PROTOCOL_VERSION, ids.run_id, 0).events.map((event) => event.sequence), before.map((event) => event.sequence));
  restarted.close();
});

test("corrupt SQLite and checksum-tampered journals fail closed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "beyond-corrupt-"));
  const malformed = join(directory, "bad.sqlite");
  await writeFile(malformed, "{bad}");
  const factory = createOfflinePiRuntimeFactory(() => [{ type: "text", text: "x" }]);
  await assert.rejects(async () => {
    const candidate = new LocalAppServerCore(new AppendOnlyStore(malformed), factory);
    await candidate.init();
  }, /journal/u);

  const { core, path } = await setup();
  await core.command(PROTOCOL_VERSION, command("run.start", { prompt: "x" }));
  await core.awaitIdle(ids.run_id);
  core.close();
  const database = new DatabaseSync(path);
  database.exec("UPDATE append_only_journal SET digest = '0' WHERE id = 1");
  database.close();
  await assert.rejects(async () => {
    const candidate = new LocalAppServerCore(new AppendOnlyStore(path), factory);
    await candidate.init();
  }, /checksum/u);
});

test("closed command allowlist and optimistic versions fail before acceptance", async () => {
  const { core } = await setup();
  await assert.rejects(() => core.command(PROTOCOL_VERSION, command("run.delete")), /Unsupported command/u);
  await assert.rejects(() => core.command(PROTOCOL_VERSION, command("run.start", {})), /prompt/u);
});
