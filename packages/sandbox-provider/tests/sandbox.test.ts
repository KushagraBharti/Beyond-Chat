import assert from "node:assert/strict";
import test from "node:test";
import { writeFile } from "node:fs/promises";
import {
  canonicalId,
  type ObjectReference,
  type ProcessEvent,
  type SandboxSpec,
} from "@beyond/contracts";
import {
  InMemoryObjectStore,
  InMemorySandboxProvider,
  LocalDockerProvider,
  type ProcessBoundary,
} from "../src/index.ts";

const runId = canonicalId("run", "01HX7W2J8P4XW3D9CZV3");

async function manifest(store: InMemoryObjectStore, files: Readonly<Record<string, ObjectReference>> = {}) {
  return await store.write(Buffer.from(JSON.stringify({
    schema_version: "1.0",
    files: Object.entries(files).map(([path, reference]) => ({ path, reference })),
  })), "application/vnd.beyond.working-set+json");
}

async function spec(store: InMemoryObjectStore, wallTime = 1_000): Promise<SandboxSpec> {
  return {
    run_id: runId,
    image_digest: "image@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    working_set: await manifest(store),
    resource_limits: { cpu: 2, memory_mb: 1024, wall_time_ms: wallTime },
  };
}

test("semantic in-memory provider preserves bytes, digests, lifecycle, checkpoint, and restore parity", async () => {
  const store = new InMemoryObjectStore();
  const input = await store.write(Buffer.from("source evidence", "utf8"), "text/plain");
  const provider = new InMemorySandboxProvider({
    store,
    eventSequence: () => 42,
    executor: async (_command, files) => {
      assert.equal(Buffer.from(files.get("/workspace/input.txt")!).toString("utf8"), "source evidence");
      return { stdout: "generated", exit_code: 0, writes: { "/workspace/output.md": "# Output\n\nVerified.\n" } };
    },
  });
  const handle = await provider.create(await spec(store));
  await provider.upload(handle.sandbox_id, [{ source: input, destination: "/workspace/input.txt" }]);
  await provider.start(handle.sandbox_id);
  const processEvents: ProcessEvent[] = [];
  for await (const event of provider.exec(handle.sandbox_id, { argv: ["generate"] })) processEvents.push(event);
  assert.deepEqual(processEvents.map((event) => event.type), ["started", "stdout", "exited"]);
  const [output] = await provider.download(handle.sandbox_id, ["/workspace/output.md"]);
  assert.equal(Buffer.from(await store.read(output)).toString("utf8"), "# Output\n\nVerified.\n");
  assert.match(output.digest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(output.byte_size, Buffer.byteLength("# Output\n\nVerified.\n"));
  assert.match((await provider.exposePort(handle.sandbox_id, 3000)).url, /127\.0\.0\.1:3000/u);
  const checkpoint = await provider.checkpoint(handle.sandbox_id);
  assert.equal(checkpoint.event_sequence, 42);
  assert.equal(checkpoint.provider_metadata.filesystem_snapshot, "durable-object-manifest");
  await provider.stop(handle.sandbox_id);
  await provider.terminate(handle.sandbox_id);
  await provider.terminate(handle.sandbox_id);

  const restored = await provider.restore(checkpoint);
  await provider.start(restored.sandbox_id);
  const [restoredOutput] = await provider.download(restored.sandbox_id, ["/workspace/output.md"]);
  assert.equal(restoredOutput.digest, output.digest);
  assert.equal(Buffer.from(await store.read(restoredOutput)).toString("utf8"), "# Output\n\nVerified.\n");
});

test("in-memory provider enforces lifecycle, path containment, and wall time", async () => {
  const store = new InMemoryObjectStore();
  const provider = new InMemorySandboxProvider({
    store,
    executor: async () => await new Promise((resolve) => setTimeout(() => resolve({ exit_code: 0 }), 50)),
  });
  const handle = await provider.create(await spec(store, 5));
  await assert.rejects(async () => {
    for await (const _event of provider.exec(handle.sandbox_id, { argv: ["not-running"] })) { /* consume */ }
  }, /running/u);
  await provider.start(handle.sandbox_id);
  await assert.rejects(async () => {
    for await (const _event of provider.exec(handle.sandbox_id, { argv: ["slow"] })) { /* consume */ }
  }, /wall-time/u);
  await assert.rejects(() => provider.upload(handle.sandbox_id, [{ source: handle as unknown as ObjectReference, destination: "../escape" }]), /path/u);
});

class FakeDockerBoundary implements ProcessBoundary {
  readonly calls: string[][] = [];
  failCreate = false;
  async run(argv: readonly string[]) {
    this.calls.push([...argv]);
    if (this.failCreate && argv[1] === "create") return { stdout: "", stderr: "daemon offline", code: 1 };
    if (argv[1] === "port") return { stdout: "127.0.0.1:49152\n", stderr: "", code: 0 };
    if (argv[1] === "cp" && argv[2]?.startsWith("sbx_")) await writeFile(argv[3]!, "docker bytes");
    return { stdout: "", stderr: "", code: 0 };
  }
  async *stream(argv: readonly string[]): AsyncIterable<ProcessEvent> {
    this.calls.push([...argv]);
    yield { type: "started", occurred_at: new Date(0).toISOString() };
    yield { type: "exited", exit_code: 0, occurred_at: new Date(0).toISOString() };
  }
}

test("Docker provider validates process results, resources, bytes, published ports, and idempotent teardown", async () => {
  const store = new InMemoryObjectStore();
  const boundary = new FakeDockerBoundary();
  const provider = new LocalDockerProvider({ process: boundary, store, publishedPorts: [3000], eventSequence: () => 9 });
  const handle = await provider.create(await spec(store));
  const source = await store.write(Buffer.from("upload bytes"), "text/plain");
  await provider.upload(handle.sandbox_id, [{ source, destination: "/workspace/input.txt" }]);
  await provider.start(handle.sandbox_id);
  for await (const _event of provider.exec(handle.sandbox_id, { argv: ["node", "run.js"], cwd: "/workspace", environment: { SAFE: "1" } })) { /* consume */ }
  assert.equal((await provider.exposePort(handle.sandbox_id, 3000)).url, "http://127.0.0.1:49152");
  const [download] = await provider.download(handle.sandbox_id, ["/workspace/output.txt"]);
  assert.equal(Buffer.from(await store.read(download)).toString("utf8"), "docker bytes");
  const checkpoint = await provider.checkpoint(handle.sandbox_id);
  assert.equal(checkpoint.event_sequence, 9);
  await provider.stop(handle.sandbox_id);
  await provider.terminate(handle.sandbox_id);
  await provider.terminate(handle.sandbox_id);
  assert.equal(boundary.calls.filter((call) => call[1] === "rm").length, 1);
  const create = boundary.calls.find((call) => call[1] === "create")!;
  assert.ok(create.includes("--network"));
  assert.ok(create.includes("--cpus"));
  assert.ok(create.includes("--memory"));
  assert.ok(create.includes("--pids-limit"));
  assert.ok(create.includes("127.0.0.1::3000"));
});

test("Docker provider rejects a failed create without returning a handle", async () => {
  const store = new InMemoryObjectStore();
  const boundary = new FakeDockerBoundary();
  boundary.failCreate = true;
  const provider = new LocalDockerProvider({ process: boundary, store });
  const sandboxSpec = await spec(store);
  await assert.rejects(() => provider.create(sandboxSpec), /create failed/u);
});
