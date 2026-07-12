import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import {
  EVENT_SCHEMA_VERSION,
  canonicalId,
  type AgentRuntime,
  type CancellationRequest,
  type CheckpointReference,
  type CheckpointRequest,
  type CommandEnvelope,
  type EventEnvelope,
  type JsonObject,
  type RunId,
} from "@beyond/contracts";
import { LocalAppServerCore, type RuntimeFactoryContext } from "../src/protocol.ts";
import { createLocalHttpServer } from "../src/server.ts";
import { AppendOnlyStore } from "../src/store.ts";

function command(): CommandEnvelope {
  return {
    organization_id: canonicalId("org", "01HX7W2J8P4XW3D9CZV3"),
    project_id: canonicalId("prj", "01HX7W2J8P4XW3D9CZV3"),
    thread_id: canonicalId("thr", "01HX7W2J8P4XW3D9CZV3"),
    run_id: canonicalId("run", "01HX7W2J8P4XW3D9CZV3"),
    command_id: canonicalId("cmd", crypto.randomUUID().replaceAll("-", "")),
    command_type: "run.start",
    schema_version: "1.0",
    actor: { type: "user", id: canonicalId("act", "01HX7W2J8P4XW3D9CZV3") },
    idempotency_key: "http-start",
    correlation_id: canonicalId("cor", "01HX7W2J8P4XW3D9CZV3"),
    issued_at: new Date().toISOString(),
    payload: { prompt: "document" },
  };
}

class LiveRuntime implements AgentRuntime {
  private readonly context: RuntimeFactoryContext;
  private sequence: number;
  private release!: () => void;
  private readonly gate = new Promise<void>((resolve) => { this.release = resolve; });
  constructor(context: RuntimeFactoryContext) {
    this.context = context;
    this.sequence = context.last_durable_sequence;
  }

  finish(): void { this.release(); }
  start(): AsyncIterable<EventEnvelope> { return this.run(); }
  resume(): AsyncIterable<EventEnvelope> { return this.run(); }
  private async *run(): AsyncIterable<EventEnvelope> {
    yield this.event("run.running", {});
    await this.gate;
    yield this.event("message.delta", { text: "live" });
    yield this.event("run.completing", {});
  }
  async steer(_runId: RunId, _message: string): Promise<void> {}
  async cancel(request: CancellationRequest) { return { run_id: request.run_id, accepted: false, durable_sequence: this.sequence, propagated_to: [] }; }
  async checkpoint(request: CheckpointRequest): Promise<CheckpointReference> {
    const ref = { uri: "data:application/json;base64,e30=", digest: "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a", media_type: "application/json", byte_size: 2 };
    return { checkpoint_id: canonicalId("chk", crypto.randomUUID().replaceAll("-", "")), run_id: request.run_id, event_sequence: request.durable_sequence, runtime_state: ref, working_set_manifest: ref, artifacts: [], runtime_image_digest: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", provider_metadata: {} };
  }
  synchronizeDurableSequence(sequence: number): void { this.sequence = sequence; }
  private event(type: string, payload: JsonObject): EventEnvelope {
    return { event_id: canonicalId("evt", crypto.randomUUID().replaceAll("-", "")), event_type: type, schema_version: EVENT_SCHEMA_VERSION, organization_id: this.context.command.organization_id, project_id: this.context.command.project_id, thread_id: this.context.command.thread_id, run_id: this.context.command.run_id, sequence: ++this.sequence, occurred_at: new Date().toISOString(), actor: { type: "agent", id: canonicalId("act", "01HX7W2J8P4XW3D9CZV8") }, correlation_id: this.context.command.correlation_id, payload, visibility: "project", sensitivity: "normal" };
  }
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "beyond-http-"));
  let runtime!: LiveRuntime;
  const core = new LocalAppServerCore(new AppendOnlyStore(join(directory, "journal.sqlite")), (context) => (runtime = new LiveRuntime(context)));
  await core.init();
  const server = createLocalHttpServer(core, 50);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing address");
  return { core, server, base: `http://127.0.0.1:${address.port}`, runtime: () => runtime };
}

async function readUntil(reader: ReadableStreamDefaultReader<Uint8Array>, expected: RegExp): Promise<string> {
  const decoder = new TextDecoder();
  let text = "";
  for (let index = 0; index < 20; index += 1) {
    const chunk = await reader.read();
    if (chunk.done) break;
    text += decoder.decode(chunk.value, { stream: true });
    if (expected.test(text)) return text;
  }
  throw new Error(`SSE stream never matched ${expected}: ${text}`);
}

async function closeServer(server: ReturnType<typeof createLocalHttpServer>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => { if (error) reject(error); else resolve(); });
    server.closeAllConnections();
  });
}

test("REST start is nonblocking and SSE follows live execution before reconnect replay", async () => {
  const { core, server, base, runtime } = await fixture();
  try {
    const cmd = command();
    const response = await fetch(`${base}/v1/commands`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cmd) });
    assert.equal(response.status, 202);
    const abort = new AbortController();
    const stream = await fetch(`${base}/v1/runs/${cmd.run_id}/events`, { signal: abort.signal });
    const reader = stream.body!.getReader();
    const liveStart = await readUntil(reader, /event: run\.running/u);
    assert.match(liveStart, /event: run\.accepted/u);
    runtime().finish();
    const liveCompletion = await readUntil(reader, /event: run\.completed/u);
    assert.match(liveCompletion, /data:/u);
    abort.abort();
    await core.awaitIdle(cmd.run_id!);

    const reconnectAbort = new AbortController();
    const reconnect = await fetch(`${base}/v1/runs/${cmd.run_id}/events`, { headers: { "Last-Event-ID": "1" }, signal: reconnectAbort.signal });
    const replay = await readUntil(reconnect.body!.getReader(), /id: 2/u);
    reconnectAbort.abort();
    assert.doesNotMatch(replay, /id: 1\n/u);
  } finally {
    await closeServer(server);
    core.close();
  }
});

test("malformed JSON and unsupported protocol map to stable statuses", async () => {
  const { core, server, base } = await fixture();
  try {
    const malformed = await fetch(`${base}/v1/commands`, { method: "POST", body: "{" });
    assert.equal(malformed.status, 400);
    const version = await fetch(`${base}/v1/runs/run_01HX7W2J8P4XW3D9CZV3/snapshot`, { headers: { "x-beyond-protocol-version": "2.0" } });
    assert.equal(version.status, 426);
  } finally {
    await closeServer(server);
    core.close();
  }
});
