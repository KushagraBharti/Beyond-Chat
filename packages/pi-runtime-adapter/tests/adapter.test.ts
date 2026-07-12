import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalId,
  type AgentRuntime,
  type CheckpointReference,
  type EventEnvelope,
  type JsonObject,
} from "@beyond/contracts";
import {
  PI_REVISION,
  PiRuntimeAdapter,
  createOfflinePiRuntime,
  type PiAgentSurface,
} from "../src/index.ts";
import type { AgentEvent, AgentMessage } from "@earendil-works/pi-agent-core";

const scope = {
  organization_id: canonicalId("org", "01HX7W2J8P4XW3D9CZV3"),
  project_id: canonicalId("prj", "01HX7W2J8P4XW3D9CZV3"),
  thread_id: canonicalId("thr", "01HX7W2J8P4XW3D9CZV3"),
  run_id: canonicalId("run", "01HX7W2J8P4XW3D9CZV3"),
  actor: { type: "agent" as const, id: canonicalId("act", "01HX7W2J8P4XW3D9CZV3") },
  correlation_id: canonicalId("cor", "01HX7W2J8P4XW3D9CZV3"),
};
const manifest = {
  uri: "data:application/json;base64,e30=",
  digest: "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
  media_type: "application/json",
  byte_size: 2,
};
const options = {
  workingSetManifest: manifest,
  runtimeImageDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

async function collect(stream: AsyncIterable<EventEnvelope>): Promise<readonly EventEnvelope[]> {
  const events: EventEnvelope[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

class FakeAgent implements PiAgentSurface {
  private listener?: (event: AgentEvent, signal: AbortSignal) => void | Promise<void>;
  readonly state = { messages: [] as AgentMessage[], isStreaming: false, pendingToolCalls: new Set<string>() };
  readonly steered: AgentMessage[] = [];
  aborted = false;
  duplicateDelivery = false;

  subscribe(listener: (event: AgentEvent, signal: AbortSignal) => void | Promise<void>): () => void {
    this.listener = listener;
    return () => { this.listener = undefined; };
  }

  async prompt(): Promise<void> {
    const signal = new AbortController().signal;
    const start: AgentEvent = { type: "agent_start" };
    const events: AgentEvent[] = [
      start,
      ...(this.duplicateDelivery ? [start] : []),
      { type: "tool_execution_start", toolCallId: "c1", toolName: "write", args: { path: "x" } },
      { type: "tool_execution_end", toolCallId: "c1", toolName: "write", result: { content: [], details: {} }, isError: false },
      { type: "agent_end", messages: [] },
    ];
    for (const event of events) await this.listener?.(event, signal);
  }

  async continue(): Promise<void> {
    const signal = new AbortController().signal;
    await this.listener?.({ type: "agent_start" }, signal);
    await this.listener?.({ type: "agent_end", messages: this.state.messages }, signal);
  }

  steer(message: AgentMessage): void { this.steered.push(message); }
  abort(): void { this.aborted = true; }
}

test("implements AgentRuntime and streams normalized lifecycle events with restored sequence", async () => {
  const adapter: AgentRuntime = new PiRuntimeAdapter(new FakeAgent(), scope, { ...options, lastDurableSequence: 7 });
  const events = await collect(adapter.start({ prompt: "x" }));
  assert.deepEqual(events.map((event) => event.event_type), ["run.running", "tool.started", "tool.completed", "run.completing"]);
  assert.deepEqual(events.map((event) => event.sequence), [8, 9, 10, 11]);
  const checkpoint = await adapter.checkpoint({ run_id: scope.run_id, durable_sequence: 11, reason: "manual" });
  assert.equal(checkpoint.provider_metadata.pi_revision, PI_REVISION);
  assert.equal(checkpoint.runtime_image_digest, options.runtimeImageDigest);
  assert.ok(checkpoint.runtime_state?.digest.startsWith("sha256:"));
});

test("resume restores logical messages and continues sequence", async () => {
  const first = new PiRuntimeAdapter(new FakeAgent(), scope, options);
  await collect(first.start({ prompt: "x" }));
  const checkpoint = await first.checkpoint({ run_id: scope.run_id, durable_sequence: 4, reason: "recovery" });
  const restored = new FakeAgent();
  const second = new PiRuntimeAdapter(restored, scope, { ...options, lastDurableSequence: 4 });
  const events = await collect(second.resume(checkpoint));
  assert.deepEqual(events.map((event) => event.sequence), [5, 6]);
  assert.deepEqual(restored.state.messages, []);
});

test("steer and cancel are run-scoped and cancellation targets are honest", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const fake = new FakeAgent();
  fake.prompt = async () => { await gate; };
  const adapter = new PiRuntimeAdapter(fake, scope, options);
  const stream = adapter.start({ prompt: "x" });
  await adapter.steer(scope.run_id, "new");
  const acknowledgement = await adapter.cancel({ run_id: scope.run_id, requested_at: new Date().toISOString() });
  assert.equal(acknowledgement.accepted, true);
  assert.deepEqual(acknowledgement.propagated_to, ["runtime"]);
  assert.equal(fake.aborted, true);
  release();
  await collect(stream);
  const afterSettlement = await adapter.cancel({ run_id: scope.run_id, requested_at: new Date().toISOString() });
  assert.equal(afterSettlement.accepted, false);
  assert.deepEqual(afterSettlement.propagated_to, []);
  await assert.rejects(() => adapter.steer(canonicalId("run", "01HX7W2J8P4XW3D9CZV9"), "wrong"), /scope/u);
});

test("duplicate delivery of the same Pi event object creates one canonical effect", async () => {
  const fake = new FakeAgent();
  fake.duplicateDelivery = true;
  const adapter = new PiRuntimeAdapter(fake, scope, options);
  const events = await collect(adapter.start({ prompt: "x" }));
  assert.equal(events.filter((event) => event.event_type === "run.running").length, 1);
});

test("real vendored Pi Agent executes an offline tool and emits a generated output", async () => {
  const output: JsonObject = {
    media_type: "text/markdown",
    name: "project-brief.md",
    content: "# Project Brief\n\nA durable document generated through Pi.\n",
  };
  const adapter = createOfflinePiRuntime(scope, options, [
    {
      type: "tool",
      call_id: "write-1",
      tool_name: "write_document",
      arguments: { path: "project-brief.md", content: output.content },
      result_text: "Wrote project-brief.md",
      result_details: { beyond_output: output },
    },
    { type: "text", text: "The project brief is ready." },
  ]);
  const events = await collect(adapter.start({ prompt: "Create the project brief" }));
  assert.ok(events.some((event) => event.event_type === "tool.started"));
  assert.ok(events.some((event) => event.event_type === "tool.completed"));
  assert.equal(events.find((event) => event.event_type === "output.created")?.payload?.content, output.content);
  assert.ok(events.some((event) => event.event_type === "message.delta"));
});

test("rejects stale scope, image, and sequence checkpoint operations", async () => {
  const adapter = new PiRuntimeAdapter(new FakeAgent(), scope, options);
  await collect(adapter.start({ prompt: "x" }));
  await assert.rejects(
    () => adapter.checkpoint({ run_id: scope.run_id, durable_sequence: 3, reason: "manual" }),
    /sequence/u,
  );
  const checkpoint = await adapter.checkpoint({ run_id: scope.run_id, durable_sequence: 4, reason: "manual" });
  const incompatible: CheckpointReference = { ...checkpoint, runtime_image_digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" };
  assert.throws(() => adapter.resume(incompatible), /image/u);
});
