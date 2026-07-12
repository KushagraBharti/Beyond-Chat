import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, posix } from "node:path";
import {
  ContractError,
  canonicalId,
  type ArtifactReference,
  type CheckpointReference,
  type CommandSpec,
  type Endpoint,
  type JsonObject,
  type ObjectReference,
  type ProcessEvent,
  type SandboxHandle,
  type SandboxId,
  type SandboxProvider,
  type SandboxSpec,
  type UploadSpec,
} from "@beyond/contracts";

export interface ProcessBoundaryOptions { readonly signal?: AbortSignal }
export interface ProcessBoundary {
  run(argv: readonly string[], options?: ProcessBoundaryOptions): Promise<{ readonly stdout: string; readonly stderr: string; readonly code: number }>;
  stream(argv: readonly string[], options?: ProcessBoundaryOptions): AsyncIterable<ProcessEvent>;
}

export class NodeProcessBoundary implements ProcessBoundary {
  async run(argv: readonly string[], options: ProcessBoundaryOptions = {}) {
    if (!argv[0]) throw new ContractError("validation.invalid_envelope", "Process argv is empty");
    return await new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
      const child = spawn(argv[0], [...argv.slice(1)], { shell: false, windowsHide: true, signal: options.signal });
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk; });
      child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });
      child.once("error", reject);
      child.once("close", (code) => resolve({ stdout, stderr, code: code ?? -1 }));
    });
  }

  async *stream(argv: readonly string[], options: ProcessBoundaryOptions = {}): AsyncIterable<ProcessEvent> {
    const occurredAt = () => new Date().toISOString();
    yield { type: "started", occurred_at: occurredAt() };
    const result = await this.run(argv, options);
    if (result.stdout) yield { type: "stdout", text: result.stdout, occurred_at: occurredAt() };
    if (result.stderr) yield { type: "stderr", text: result.stderr, occurred_at: occurredAt() };
    yield { type: "exited", exit_code: result.code, occurred_at: occurredAt() };
  }
}

export interface ObjectStore {
  read(reference: ObjectReference): Promise<Uint8Array>;
  write(bytes: Uint8Array, mediaType: string): Promise<ObjectReference>;
}

function hash(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function validateBytes(reference: ObjectReference, bytes: Uint8Array): Uint8Array {
  if (bytes.byteLength !== reference.byte_size || hash(bytes) !== reference.digest) {
    throw new ContractError("artifact.invalid", "Object bytes do not match their reference");
  }
  return bytes;
}

export class InMemoryObjectStore implements ObjectStore {
  private readonly objects = new Map<string, Uint8Array>();

  async read(reference: ObjectReference): Promise<Uint8Array> {
    const dataPrefix = "data:";
    if (reference.uri.startsWith(dataPrefix)) {
      const comma = reference.uri.indexOf(",");
      if (comma < 0 || !reference.uri.slice(0, comma).endsWith(";base64")) {
        throw new ContractError("artifact.invalid", "Only base64 data references are supported");
      }
      return validateBytes(reference, Buffer.from(reference.uri.slice(comma + 1), "base64"));
    }
    const bytes = this.objects.get(reference.uri);
    if (!bytes) throw new ContractError("artifact.invalid", "Object reference is unavailable", { uri: reference.uri });
    return validateBytes(reference, bytes);
  }

  async write(bytes: Uint8Array, mediaType: string): Promise<ObjectReference> {
    const digest = hash(bytes);
    const uri = `memory://objects/${digest.slice(7)}`;
    this.objects.set(uri, Uint8Array.from(bytes));
    return { uri, digest, media_type: mediaType, byte_size: bytes.byteLength };
  }
}

interface WorkingSetEntry { readonly path: string; readonly reference: ObjectReference }
interface WorkingSetManifest { readonly schema_version: "1.0"; readonly files: readonly WorkingSetEntry[] }

async function readManifest(store: ObjectStore, reference: ObjectReference): Promise<WorkingSetManifest> {
  const bytes = await store.read(reference);
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(bytes).toString("utf8")); }
  catch { throw new ContractError("artifact.invalid", "Working-set manifest is not JSON"); }
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { files?: unknown }).files)) {
    throw new ContractError("artifact.invalid", "Working-set manifest is malformed");
  }
  const manifest = parsed as WorkingSetManifest;
  for (const file of manifest.files) {
    if (!file || typeof file.path !== "string" || !file.reference) throw new ContractError("artifact.invalid", "Working-set entry is malformed");
  }
  return manifest;
}

async function writeManifest(store: ObjectStore, files: ReadonlyMap<string, ObjectReference>): Promise<ObjectReference> {
  const manifest: WorkingSetManifest = {
    schema_version: "1.0",
    files: [...files.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([path, reference]) => ({ path, reference })),
  };
  return await store.write(Buffer.from(JSON.stringify(manifest), "utf8"), "application/vnd.beyond.working-set+json");
}

function sandboxPath(value: string): string {
  if (!value || value.includes("\0") || value.split(/[\\/]/u).includes("..")) {
    throw new ContractError("validation.invalid_envelope", "Sandbox path is invalid", { path: value });
  }
  return posix.normalize(value.startsWith("/") ? value : `/${value}`);
}

function validateSpec(spec: SandboxSpec): void {
  if (!spec.image_digest.trim()) throw new ContractError("validation.invalid_envelope", "Sandbox image digest is required");
  const limits = spec.resource_limits;
  if (!Number.isFinite(limits.cpu) || limits.cpu <= 0
    || !Number.isSafeInteger(limits.memory_mb) || limits.memory_mb <= 0
    || !Number.isSafeInteger(limits.wall_time_ms) || limits.wall_time_ms <= 0) {
    throw new ContractError("validation.invalid_envelope", "Sandbox resource limits must be positive");
  }
}

function artifact(reference: ObjectReference, name: string): ArtifactReference {
  return { artifact_id: canonicalId("art", crypto.randomUUID().replaceAll("-", "")), name, ...reference };
}

type Lifecycle = "created" | "running" | "stopped" | "terminated";
interface SandboxState {
  readonly handle: SandboxHandle;
  readonly spec: SandboxSpec;
  lifecycle: Lifecycle;
  readonly files: Map<string, Uint8Array>;
  readonly references: Map<string, ObjectReference>;
}

export interface InMemoryExecResult {
  readonly stdout?: string;
  readonly stderr?: string;
  readonly exit_code: number;
  readonly writes?: Readonly<Record<string, Uint8Array | string>>;
}
export type InMemoryExecutor = (
  command: CommandSpec,
  files: ReadonlyMap<string, Uint8Array>,
  signal: AbortSignal,
) => Promise<InMemoryExecResult>;

export interface InMemorySandboxProviderOptions {
  readonly store?: ObjectStore;
  readonly executor?: InMemoryExecutor;
  readonly eventSequence?: () => number;
}

export class InMemorySandboxProvider implements SandboxProvider {
  private readonly sandboxes = new Map<string, SandboxState>();
  private readonly store: ObjectStore;
  private readonly executor: InMemoryExecutor;
  private readonly eventSequence: () => number;

  constructor(options: InMemorySandboxProviderOptions = {}) {
    this.store = options.store ?? new InMemoryObjectStore();
    this.executor = options.executor ?? (async () => ({ exit_code: 0 }));
    this.eventSequence = options.eventSequence ?? (() => 0);
  }

  async create(spec: SandboxSpec): Promise<SandboxHandle> {
    validateSpec(spec);
    const handle: SandboxHandle = { sandbox_id: canonicalId("sbx", crypto.randomUUID().replaceAll("-", "")), provider: "in-memory", run_id: spec.run_id };
    const state: SandboxState = { handle, spec, lifecycle: "created", files: new Map(), references: new Map() };
    this.sandboxes.set(handle.sandbox_id, state);
    await this.loadWorkingSet(state, spec.working_set);
    return handle;
  }

  async start(id: SandboxId): Promise<void> {
    const state = this.require(id);
    if (state.lifecycle !== "created" && state.lifecycle !== "stopped") throw new ContractError("state.invalid_transition", "Sandbox cannot start from its current state");
    state.lifecycle = "running";
  }

  async stop(id: SandboxId): Promise<void> {
    const state = this.require(id);
    if (state.lifecycle !== "running") throw new ContractError("state.invalid_transition", "Only a running sandbox can stop");
    state.lifecycle = "stopped";
  }

  async *exec(id: SandboxId, command: CommandSpec): AsyncIterable<ProcessEvent> {
    const state = this.require(id, "running");
    if (command.argv.length === 0) throw new ContractError("validation.invalid_envelope", "Command argv is empty");
    const occurredAt = () => new Date().toISOString();
    yield { type: "started", occurred_at: occurredAt() };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), state.spec.resource_limits.wall_time_ms);
    let result: InMemoryExecResult;
    try {
      result = await Promise.race([
        this.executor(command, new Map(state.files), controller.signal),
        new Promise<never>((_resolve, reject) => controller.signal.addEventListener("abort", () => reject(new ContractError("provider.timeout", "Sandbox command exceeded wall-time limit")), { once: true })),
      ]);
    } finally {
      clearTimeout(timeout);
    }
    for (const [path, value] of Object.entries(result.writes ?? {})) {
      const normalized = sandboxPath(path);
      state.files.set(normalized, typeof value === "string" ? Buffer.from(value, "utf8") : Uint8Array.from(value));
      state.references.delete(normalized);
    }
    if (result.stdout) yield { type: "stdout", text: result.stdout, occurred_at: occurredAt() };
    if (result.stderr) yield { type: "stderr", text: result.stderr, occurred_at: occurredAt() };
    yield { type: "exited", exit_code: result.exit_code, occurred_at: occurredAt() };
  }

  async upload(id: SandboxId, files: readonly UploadSpec[]): Promise<void> {
    const state = this.require(id);
    for (const file of files) {
      const destination = sandboxPath(file.destination);
      state.files.set(destination, Uint8Array.from(await this.store.read(file.source)));
      state.references.set(destination, file.source);
    }
  }

  async download(id: SandboxId, paths: readonly string[]): Promise<readonly ArtifactReference[]> {
    const state = this.require(id);
    const artifacts: ArtifactReference[] = [];
    for (const raw of paths) {
      const path = sandboxPath(raw);
      const bytes = state.files.get(path);
      if (!bytes) throw new ContractError("artifact.invalid", "Sandbox path does not exist", { path });
      const reference = await this.store.write(bytes, "application/octet-stream");
      state.references.set(path, reference);
      artifacts.push(artifact(reference, basename(path)));
    }
    return Object.freeze(artifacts);
  }

  async checkpoint(id: SandboxId): Promise<CheckpointReference> {
    const state = this.require(id);
    for (const [path, bytes] of state.files) {
      if (!state.references.has(path)) state.references.set(path, await this.store.write(bytes, "application/octet-stream"));
    }
    const workingSet = await writeManifest(this.store, state.references);
    const artifacts = [...state.references.entries()].map(([path, reference]) => artifact(reference, basename(path)));
    return {
      checkpoint_id: canonicalId("chk", crypto.randomUUID().replaceAll("-", "")),
      run_id: state.handle.run_id,
      event_sequence: this.eventSequence(),
      working_set_manifest: workingSet,
      artifacts,
      runtime_image_digest: state.spec.image_digest,
      provider_metadata: {
        provider: "in-memory",
        resource_limits: state.spec.resource_limits,
        source_sandbox_id: id,
        filesystem_snapshot: "durable-object-manifest",
        process_memory_restored: false,
      },
    };
  }

  async restore(checkpoint: CheckpointReference): Promise<SandboxHandle> {
    const limits = checkpoint.provider_metadata.resource_limits;
    if (!limits || Array.isArray(limits) || typeof limits !== "object") throw new ContractError("checkpoint.unavailable", "Checkpoint resource limits are unavailable");
    const record = limits as JsonObject;
    return await this.create({
      run_id: checkpoint.run_id,
      image_digest: checkpoint.runtime_image_digest,
      working_set: checkpoint.working_set_manifest,
      resource_limits: {
        cpu: Number(record.cpu),
        memory_mb: Number(record.memory_mb),
        wall_time_ms: Number(record.wall_time_ms),
      },
    });
  }

  async exposePort(id: SandboxId, port: number): Promise<Endpoint> {
    this.require(id, "running");
    if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new ContractError("validation.invalid_envelope", "Port is invalid");
    return { url: `http://127.0.0.1:${port}`, expires_at: new Date(Date.now() + 3_600_000).toISOString() };
  }

  async terminate(id: SandboxId): Promise<void> {
    const state = this.sandboxes.get(id);
    if (!state || state.lifecycle === "terminated") return;
    state.lifecycle = "terminated";
    state.files.clear();
    state.references.clear();
    this.sandboxes.delete(id);
  }

  private require(id: SandboxId, lifecycle?: Lifecycle): SandboxState {
    const state = this.sandboxes.get(id);
    if (!state || state.lifecycle === "terminated") throw new ContractError("sandbox.lost", "Sandbox does not exist");
    if (lifecycle && state.lifecycle !== lifecycle) throw new ContractError("state.invalid_transition", `Sandbox must be ${lifecycle}`);
    return state;
  }

  private async loadWorkingSet(state: SandboxState, reference: ObjectReference): Promise<void> {
    const manifest = await readManifest(this.store, reference);
    for (const file of manifest.files) {
      const path = sandboxPath(file.path);
      state.files.set(path, Uint8Array.from(await this.store.read(file.reference)));
      state.references.set(path, file.reference);
    }
  }
}

interface DockerState {
  readonly handle: SandboxHandle;
  readonly spec: SandboxSpec;
  lifecycle: Lifecycle;
  readonly trackedPaths: Set<string>;
}

export interface LocalDockerProviderOptions {
  readonly process?: ProcessBoundary;
  readonly store?: ObjectStore;
  readonly publishedPorts?: readonly number[];
  readonly eventSequence?: () => number;
}

export class LocalDockerProvider implements SandboxProvider {
  private readonly states = new Map<string, DockerState>();
  private readonly process: ProcessBoundary;
  private readonly store: ObjectStore;
  private readonly publishedPorts: readonly number[];
  private readonly eventSequence: () => number;

  constructor(options: LocalDockerProviderOptions | ProcessBoundary = {}) {
    const normalized = "run" in options ? { process: options } : options;
    this.process = normalized.process ?? new NodeProcessBoundary();
    this.store = normalized.store ?? new InMemoryObjectStore();
    this.publishedPorts = Object.freeze([...(normalized.publishedPorts ?? [])]);
    this.eventSequence = normalized.eventSequence ?? (() => 0);
  }

  async create(spec: SandboxSpec): Promise<SandboxHandle> {
    validateSpec(spec);
    const sandboxId = canonicalId("sbx", crypto.randomUUID().replaceAll("-", ""));
    const handle: SandboxHandle = { sandbox_id: sandboxId, provider: "local-docker", run_id: spec.run_id };
    const ports = this.publishedPorts.flatMap((port) => ["-p", `127.0.0.1::${port}`]);
    await this.success(["docker", "create", "--name", sandboxId, "--network", "none", "--cpus", String(spec.resource_limits.cpu), "--memory", `${spec.resource_limits.memory_mb}m`, "--pids-limit", "256", ...ports, spec.image_digest, "sleep", "infinity"], "create");
    const state: DockerState = { handle, spec, lifecycle: "created", trackedPaths: new Set() };
    this.states.set(sandboxId, state);
    try {
      const manifest = await readManifest(this.store, spec.working_set);
      await this.upload(sandboxId, manifest.files.map((file) => ({ source: file.reference, destination: file.path })));
      return handle;
    } catch (error) {
      await this.terminate(sandboxId).catch(() => {});
      throw error;
    }
  }

  async start(id: SandboxId): Promise<void> {
    const state = this.require(id);
    if (state.lifecycle !== "created" && state.lifecycle !== "stopped") throw new ContractError("state.invalid_transition", "Sandbox cannot start");
    await this.success(["docker", "start", id], "start");
    state.lifecycle = "running";
  }

  async stop(id: SandboxId): Promise<void> {
    const state = this.require(id, "running");
    await this.success(["docker", "stop", "--time", "10", id], "stop");
    state.lifecycle = "stopped";
  }

  async *exec(id: SandboxId, command: CommandSpec): AsyncIterable<ProcessEvent> {
    const state = this.require(id, "running");
    if (command.argv.length === 0) throw new ContractError("validation.invalid_envelope", "Command argv is empty");
    const environment = Object.entries(command.environment ?? {}).flatMap(([key, value]) => ["-e", `${key}=${value}`]);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), state.spec.resource_limits.wall_time_ms);
    try {
      let exitCode: number | undefined;
      for await (const event of this.process.stream(["docker", "exec", ...environment, ...(command.cwd ? ["-w", sandboxPath(command.cwd)] : []), id, ...command.argv], { signal: controller.signal })) {
        if (event.type === "exited") exitCode = event.exit_code;
        yield event;
      }
      if (controller.signal.aborted) throw new ContractError("provider.timeout", "Docker command exceeded wall-time limit");
      if (exitCode === undefined) throw new ContractError("provider.unavailable", "Docker execution ended without an exit event");
    } catch (error) {
      if (controller.signal.aborted) throw new ContractError("provider.timeout", "Docker command exceeded wall-time limit");
      if (error instanceof ContractError) throw error;
      throw new ContractError("provider.unavailable", "Docker execution failed", { cause: String(error) });
    } finally {
      clearTimeout(timeout);
    }
  }

  async upload(id: SandboxId, files: readonly UploadSpec[]): Promise<void> {
    const state = this.require(id);
    for (const file of files) {
      const destination = sandboxPath(file.destination);
      const directory = await mkdtemp(join(tmpdir(), "beyond-docker-upload-"));
      const local = join(directory, "payload");
      try {
        await writeFile(local, await this.store.read(file.source));
        await this.success(["docker", "cp", local, `${id}:${destination}`], "upload");
        state.trackedPaths.add(destination);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
  }

  async download(id: SandboxId, paths: readonly string[]): Promise<readonly ArtifactReference[]> {
    const state = this.require(id);
    const artifacts: ArtifactReference[] = [];
    for (const raw of paths) {
      const path = sandboxPath(raw);
      const directory = await mkdtemp(join(tmpdir(), "beyond-docker-download-"));
      const local = join(directory, "payload");
      try {
        await this.success(["docker", "cp", `${id}:${path}`, local], "download");
        const bytes = await readFile(local);
        artifacts.push(artifact(await this.store.write(bytes, "application/octet-stream"), basename(path)));
        state.trackedPaths.add(path);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
    return Object.freeze(artifacts);
  }

  async checkpoint(id: SandboxId): Promise<CheckpointReference> {
    const state = this.require(id);
    const references = new Map<string, ObjectReference>();
    const artifacts = await this.download(id, [...state.trackedPaths]);
    [...state.trackedPaths].forEach((path, index) => {
      const item = artifacts[index];
      references.set(path, { uri: item.uri, digest: item.digest, media_type: item.media_type, byte_size: item.byte_size });
    });
    return {
      checkpoint_id: canonicalId("chk", crypto.randomUUID().replaceAll("-", "")),
      run_id: state.handle.run_id,
      event_sequence: this.eventSequence(),
      working_set_manifest: await writeManifest(this.store, references),
      artifacts,
      runtime_image_digest: state.spec.image_digest,
      provider_metadata: { provider: "local-docker", resource_limits: state.spec.resource_limits, filesystem_snapshot: "tracked-path-manifest", process_memory_restored: false },
    };
  }

  async restore(checkpoint: CheckpointReference): Promise<SandboxHandle> {
    const limits = checkpoint.provider_metadata.resource_limits;
    if (!limits || Array.isArray(limits) || typeof limits !== "object") throw new ContractError("checkpoint.unavailable", "Checkpoint resource limits are unavailable");
    const record = limits as JsonObject;
    return await this.create({ run_id: checkpoint.run_id, image_digest: checkpoint.runtime_image_digest, working_set: checkpoint.working_set_manifest, resource_limits: { cpu: Number(record.cpu), memory_mb: Number(record.memory_mb), wall_time_ms: Number(record.wall_time_ms) } });
  }

  async exposePort(id: SandboxId, port: number): Promise<Endpoint> {
    this.require(id, "running");
    if (!this.publishedPorts.includes(port)) throw new ContractError("policy.denied", "Port was not allowlisted at sandbox creation");
    const result = await this.success(["docker", "port", id, `${port}/tcp`], "expose port");
    const match = /127\.0\.0\.1:(\d+)/u.exec(result.stdout);
    if (!match) throw new ContractError("provider.unavailable", "Docker did not return a loopback port mapping");
    return { url: `http://127.0.0.1:${match[1]}`, expires_at: new Date(Date.now() + 3_600_000).toISOString() };
  }

  async terminate(id: SandboxId): Promise<void> {
    const state = this.states.get(id);
    if (!state || state.lifecycle === "terminated") return;
    await this.success(["docker", "rm", "-f", id], "terminate");
    state.lifecycle = "terminated";
    this.states.delete(id);
  }

  private require(id: SandboxId, lifecycle?: Lifecycle): DockerState {
    const state = this.states.get(id);
    if (!state || state.lifecycle === "terminated") throw new ContractError("sandbox.lost", "Sandbox does not exist");
    if (lifecycle && state.lifecycle !== lifecycle) throw new ContractError("state.invalid_transition", `Sandbox must be ${lifecycle}`);
    return state;
  }

  private async success(argv: readonly string[], operation: string) {
    const result = await this.process.run(argv);
    if (result.code !== 0) throw new ContractError("provider.unavailable", `Docker ${operation} failed`, { code: result.code, stderr: result.stderr.slice(0, 500) });
    return result;
  }
}
