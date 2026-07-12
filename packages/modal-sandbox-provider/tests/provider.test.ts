import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { canonicalId, ContractError, type SandboxSpec } from "@beyond/contracts";
import type { App, ContainerProcess, Image, ModalClient, Sandbox, SandboxCreateParams, Volume } from "modal";
import { ModalSandboxProvider, type ModalBoundary } from "../src/index.ts";

class FakeStream extends ReadableStream<string> {
  constructor(value: string) { super({ start(controller) { if (value) controller.enqueue(value); controller.close(); } }); }
  async readText(): Promise<string> { return ""; }
  async readBytes(): Promise<Uint8Array> { return new Uint8Array(); }
}

class FakeProcess {
  stdout = new FakeStream("hello\n");
  stderr = new FakeStream("");
  stdin = new WritableStream<string>() as ContainerProcess<string>["stdin"];
  async wait(): Promise<number> { return 0; }
}

class FakeFilesystem {
  files = new Map<string, Uint8Array>();
  async writeBytes(data: Uint8Array, path: string): Promise<void> { this.files.set(path, data); }
  async readBytes(path: string): Promise<Uint8Array> {
    const value = this.files.get(path);
    if (!value) throw new Error("not found");
    return value;
  }
}

class FakeSandbox {
  readonly filesystem = new FakeFilesystem();
  readonly sandboxId: string;
  terminated = false;
  constructor(sandboxId: string) { this.sandboxId = sandboxId; }
  async waitUntilReady(): Promise<void> {}
  async exec(): Promise<ContainerProcess<string>> { return new FakeProcess() as unknown as ContainerProcess<string>; }
  async terminate(): Promise<number> { this.terminated = true; return 0; }
  async tunnels() { return { 443: { url: "https://example.invalid" } }; }
}

class FakeBoundary implements ModalBoundary {
  readonly client = {} as ModalClient;
  readonly sandboxes = new Map<string, FakeSandbox>();
  readonly names = new Map<string, FakeSandbox>();
  readonly resolvedImageIds = new Map<string, string>();
  readonly missingImages = new Set<string>();
  readonly imageReferences: string[] = [];
  created = 0;
  lastCreateParams?: SandboxCreateParams;
  async app(): Promise<App> { return { appId: "ap-test" } as App; }
  async image(reference: string): Promise<Image> {
    this.imageReferences.push(reference);
    if (this.missingImages.has(reference)) throw new Error("not found");
    return { imageId: this.resolvedImageIds.get(reference) ?? reference } as Image;
  }
  async volumes(): Promise<Record<string, Volume>> { return {}; }
  async create(_app: App, _image: Image, params: SandboxCreateParams): Promise<Sandbox> {
    this.lastCreateParams = params;
    const sandbox = new FakeSandbox(`sb-provider-${++this.created}`);
    this.sandboxes.set(sandbox.sandboxId, sandbox);
    this.names.set(params.name!, sandbox);
    return sandbox as unknown as Sandbox;
  }
  async fromId(id: string): Promise<Sandbox> { return this.sandboxes.get(id)! as unknown as Sandbox; }
  async fromName(name: string): Promise<Sandbox> {
    const value = this.names.get(name);
    if (!value || value.terminated) throw new Error("not found");
    return value as unknown as Sandbox;
  }
  async snapshotImage(): Promise<Image> { return { imageId: "im-checkpoint" } as Image; }
  close(): void {}
}

const runId = canonicalId("run", "0123456789abcdef0123456789abcdef");
function objectReference(value: string, mediaType = "application/octet-stream") {
  const bytes = Buffer.from(value, "utf8");
  return {
    uri: `data:${mediaType};base64,${bytes.toString("base64")}`,
    digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    media_type: mediaType,
    byte_size: bytes.byteLength,
  };
}

const emptyWorkingSet = objectReference(
  JSON.stringify({ schema_version: "1.0", files: [] }),
  "application/vnd.beyond.working-set+json",
);
const spec: SandboxSpec = {
  run_id: runId,
  image_digest: "im-base",
  working_set: emptyWorkingSet,
  resource_limits: { cpu: 1, memory_mb: 512, wall_time_ms: 60_000 },
};

async function provider() {
  const directory = await mkdtemp(join(tmpdir(), "beyond-modal-"));
  const boundary = new FakeBoundary();
  return {
    boundary,
    directory,
    value: new ModalSandboxProvider({
      appName: "beyond-chat-runtime",
      environment: "beyond-chat-production",
      artifactDirectory: directory,
      allowedPorts: [443],
      now: () => new Date("2026-07-11T12:00:00.000Z"),
    }, boundary),
  };
}

test("create is idempotent by run and enforces resource policy", async () => {
  const { value, boundary } = await provider();
  const first = await value.create(spec);
  const second = await value.create(spec);
  assert.equal(first.sandbox_id, second.sandbox_id);
  assert.equal(boundary.created, 1);
  await assert.rejects(() => value.create({ ...spec, run_id: canonicalId("run", "1123456789abcdef0123456789abcdef"), resource_limits: { ...spec.resource_limits, cpu: 99 } }), (error: unknown) => error instanceof ContractError && error.code === "policy.denied");
});

test("create binds a fresh product-issued run identity and rejects mismatched identity", async () => {
  const { boundary, directory } = await provider();
  const identity = {
    run_id: runId,
    organization_id: "org_1",
    project_id: "prj_1",
    actor_id: "act_1",
    agent_version_id: "agv_1",
    audience: "tool-gateway" as const,
    capabilities: ["tool:read", "output:upload"],
    expires_at: "2026-07-11T12:05:00.000Z",
    public_key: "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----",
    token: "header.payload.signature",
  };
  const value = new ModalSandboxProvider({
    appName: "beyond-chat-runtime",
    environment: "beyond-chat-production",
    artifactDirectory: directory,
    now: () => new Date("2026-07-11T12:00:00.000Z"),
    resolveRunIdentity: async () => identity,
  }, boundary);
  await value.create(spec);
  assert.equal(boundary.lastCreateParams?.env?.BEYOND_RUN_ORGANIZATION_ID, "org_1");
  assert.equal(boundary.lastCreateParams?.env?.BEYOND_RUN_CAPABILITIES, '["tool:read","output:upload"]');
  assert.equal(boundary.lastCreateParams?.env?.BEYOND_RUN_TOKEN, identity.token);

  const mismatch = new ModalSandboxProvider({
    appName: "beyond-chat-runtime",
    environment: "beyond-chat-production",
    artifactDirectory: directory,
    now: () => new Date("2026-07-11T12:00:00.000Z"),
    resolveRunIdentity: async () => ({ ...identity, run_id: canonicalId("run", "ffffffffffffffffffffffffffffffff") }),
  }, new FakeBoundary());
  await assert.rejects(() => mismatch.create(spec), (error: unknown) => error instanceof ContractError && error.code === "authorization.denied");

  const noCapabilities = new ModalSandboxProvider({
    appName: "beyond-chat-runtime",
    environment: "beyond-chat-production",
    artifactDirectory: directory,
    resolveRunIdentity: async () => ({ ...identity, capabilities: [] }),
  }, new FakeBoundary());
  await assert.rejects(() => noCapabilities.create(spec), (error: unknown) => error instanceof ContractError && error.code === "authorization.denied");

  for (const capabilities of [["tool:read", "tool:read"], ["tool.read"], ["tool:"]]) {
    const invalidCapabilities = new ModalSandboxProvider({
      appName: "beyond-chat-runtime",
      environment: "beyond-chat-production",
      artifactDirectory: directory,
      resolveRunIdentity: async () => ({ ...identity, capabilities }),
    }, new FakeBoundary());
    await assert.rejects(
      () => invalidCapabilities.create(spec),
      (error: unknown) => error instanceof ContractError && error.code === "authorization.denied",
    );
  }
});

test("create verifies immutable image identity and materializes the content-addressed working set", async () => {
  const { boundary, directory } = await provider();
  const file = objectReference("durable state", "text/plain");
  const workingSet = objectReference(
    JSON.stringify({ schema_version: "1.0", files: [{ path: "/workspace/state.txt", reference: file }] }),
    "application/vnd.beyond.working-set+json",
  );
  const value = new ModalSandboxProvider({
    appName: "beyond-chat-runtime",
    environment: "beyond-chat-production",
    artifactDirectory: directory,
    imageAliases: { "release:base": "im-base" },
  }, boundary);
  const handle = await value.create({ ...spec, image_digest: "release:base", working_set: workingSet });
  const remote = boundary.sandboxes.get(value.usage(handle.sandbox_id).provider_sandbox_id)!;
  assert.equal(Buffer.from(remote.filesystem.files.get("/workspace/state.txt")!).toString("utf8"), "durable state");

  await assert.rejects(
    () => value.create({ ...spec, run_id: canonicalId("run", "2123456789abcdef0123456789abcdef"), image_digest: "mutable-name" }),
    (error: unknown) => error instanceof ContractError && error.code === "policy.denied",
  );
  boundary.resolvedImageIds.set("im-base", "im-unexpected");
  await assert.rejects(
    () => value.create({ ...spec, run_id: canonicalId("run", "3123456789abcdef0123456789abcdef") }),
    (error: unknown) => error instanceof ContractError && error.code === "policy.denied",
  );
});

test("exec streams lifecycle events and rejects master credentials", async () => {
  const { value } = await provider();
  const handle = await value.create(spec);
  const events = [];
  for await (const event of value.exec(handle.sandbox_id, { argv: ["echo", "hello"], cwd: "/workspace" })) events.push(event);
  assert.deepEqual(events.map((event) => event.type), ["started", "stdout", "exited"]);
  await assert.rejects(async () => {
    for await (const _event of value.exec(handle.sandbox_id, { argv: ["true"], environment: { OPENROUTER_API_KEY: "forbidden" } })) { /* consume */ }
  }, (error: unknown) => error instanceof ContractError && error.code === "policy.denied");
});

test("upload verifies integrity and download materializes a durable local artifact", async () => {
  const { value, directory } = await provider();
  const handle = await value.create(spec);
  const source = join(directory, "source.txt");
  await mkdir(directory, { recursive: true });
  await writeFile(source, "hello");
  await value.upload(handle.sandbox_id, [{
    source: { uri: pathToFileURL(source).href, digest: "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", media_type: "text/plain", byte_size: 5 },
    destination: "/workspace/hello.txt",
  }]);
  const [artifact] = await value.download(handle.sandbox_id, ["/workspace/hello.txt"]);
  assert.equal((await readFile(new URL(artifact!.uri), "utf8")), "hello");
  assert.equal(artifact!.digest, "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
});

test("checkpoint is filesystem-only and supports restore after source termination", async () => {
  const { value } = await provider();
  const handle = await value.create(spec);
  const checkpoint = await value.checkpoint(handle.sandbox_id);
  assert.equal(checkpoint.provider_metadata.snapshot_kind, "filesystem");
  assert.equal(checkpoint.provider_metadata.memory_snapshot, false);
  await value.terminate(handle.sandbox_id);
  const restored = await value.restore(checkpoint);
  assert.notEqual(restored.sandbox_id, handle.sandbox_id);
  assert.equal(restored.run_id, handle.run_id);
  await assert.rejects(
    () => value.restore({ ...checkpoint, runtime_image_digest: "im-different" }),
    (error: unknown) => error instanceof ContractError && error.code === "checkpoint.unavailable",
  );
});

test("restore falls back to the immutable base image when the filesystem snapshot expired", async () => {
  const { value, boundary } = await provider();
  const handle = await value.create(spec);
  const checkpoint = await value.checkpoint(handle.sandbox_id);
  await value.terminate(handle.sandbox_id);
  boundary.missingImages.add("im-checkpoint");
  const restored = await value.restore(checkpoint);
  assert.equal(restored.run_id, runId);
  assert.deepEqual(boundary.imageReferences.slice(-2), ["im-checkpoint", "im-base"]);
});

test("port exposure is allowlisted and usage is metadata-only", async () => {
  const { value } = await provider();
  const handle = await value.create(spec);
  assert.equal((await value.exposePort(handle.sandbox_id, 443)).url, "https://example.invalid");
  await assert.rejects(() => value.exposePort(handle.sandbox_id, 22), (error: unknown) => error instanceof ContractError && error.code === "policy.denied");
  const usage = value.usage(handle.sandbox_id);
  assert.equal(usage.cpu, 1);
  assert.ok(!JSON.stringify(usage).includes("token"));
});
