import {
  ContractError,
  canonicalId,
  newCanonicalId,
  type ArtifactReference,
  type CheckpointReference,
  type CommandSpec,
  type Endpoint,
  type ObjectReference,
  type ProcessEvent,
  type RunId,
  type SandboxHandle,
  type SandboxId,
  type SandboxProvider,
  type SandboxSpec,
  type UploadSpec,
} from "@beyond/contracts";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, isAbsolute, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  ModalClient,
  NotFoundError,
  Probe,
  SandboxFilesystemError,
  SandboxTimeoutError,
  TimeoutError,
  type App,
  type ContainerProcess,
  type Image,
  type ModalClientParams,
  type Sandbox,
  type SandboxCreateParams,
  type Volume,
} from "modal";

const DEFAULT_FORBIDDEN_ENV = [
  "MODAL_TOKEN_ID",
  "MODAL_TOKEN_SECRET",
  "OPENROUTER_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "WORKOS_API_KEY",
  "COMPOSIO_API_KEY",
] as const;

export interface ModalSandboxProviderConfig {
  readonly appName: string;
  readonly environment: string;
  readonly artifactDirectory: string;
  readonly imageAliases?: Readonly<Record<string, string>>;
  readonly volumes?: Readonly<Record<string, { readonly name: string; readonly subPath?: string; readonly readOnly?: boolean }>>;
  readonly allowedPorts?: readonly number[];
  readonly allowedWriteRoots?: readonly string[];
  readonly forbiddenEnvironmentKeys?: readonly string[];
  readonly maxCpu?: number;
  readonly maxMemoryMb?: number;
  readonly maxWallTimeMs?: number;
  readonly idleTimeoutMs?: number;
  readonly blockNetwork?: boolean;
  readonly outboundDomainAllowlist?: readonly string[];
  readonly sidecarPort?: number;
  readonly sidecarCommand?: readonly string[];
  readonly tokenId?: string;
  readonly tokenSecret?: string;
  readonly now?: () => Date;
  readonly resolveRunIdentity?: (runId: RunId) => Promise<ModalRunIdentity>;
}

export interface ModalRunIdentity {
  readonly run_id: RunId;
  readonly organization_id: string;
  readonly project_id: string;
  readonly actor_id: string;
  readonly agent_version_id: string;
  readonly audience: "tool-gateway" | "model-gateway";
  readonly expires_at: string;
  readonly public_key: string;
  readonly token: string;
}

export interface SandboxUsage {
  readonly sandbox_id: SandboxId;
  readonly provider_sandbox_id: string;
  readonly created_at: string;
  readonly terminated_at?: string;
  readonly cpu: number;
  readonly memory_mb: number;
  readonly wall_time_ms: number;
  readonly estimated_cpu_core_seconds: number;
  readonly estimated_memory_gib_seconds: number;
}

interface RegistryEntry {
  readonly handle: SandboxHandle;
  readonly providerId: string;
  readonly name: string;
  readonly spec: SandboxSpec;
  readonly imageId: string;
  readonly createdAt: string;
  state: "running" | "stopped" | "terminated";
  terminatedAt?: string;
}

interface ModalBoundary {
  readonly client: ModalClient;
  app(): Promise<App>;
  image(reference: string): Promise<Image>;
  volumes(runId: RunId): Promise<Record<string, Volume>>;
  create(app: App, image: Image, params: SandboxCreateParams): Promise<Sandbox>;
  fromId(id: string): Promise<Sandbox>;
  fromName(name: string): Promise<Sandbox>;
  snapshotImage(id: string): Promise<Image>;
  close(): void;
}

class OfficialModalBoundary implements ModalBoundary {
  readonly client: ModalClient;
  private readonly config: ModalSandboxProviderConfig;
  constructor(config: ModalSandboxProviderConfig) {
    this.config = config;
    const params: ModalClientParams = { environment: config.environment };
    if (config.tokenId !== undefined) params.tokenId = config.tokenId;
    if (config.tokenSecret !== undefined) params.tokenSecret = config.tokenSecret;
    this.client = new ModalClient(params);
  }
  app(): Promise<App> {
    return this.client.apps.fromName(this.config.appName, { environment: this.config.environment, createIfMissing: false });
  }
  async image(reference: string): Promise<Image> {
    const aliased = this.config.imageAliases?.[reference] ?? reference;
    if (/^im-[A-Za-z0-9]+$/.test(aliased)) return this.client.images.fromId(aliased);
    return this.client.images.fromName(aliased.replace(/^modal:/, ""), { environment: this.config.environment });
  }
  async volumes(runId: RunId): Promise<Record<string, Volume>> {
    const result: Record<string, Volume> = {};
    for (const [mountPath, definition] of Object.entries(this.config.volumes ?? {})) {
      const volume = await this.client.volumes.fromName(definition.name, {
        environment: this.config.environment,
        createIfMissing: false,
      });
      const subPath = definition.subPath?.replaceAll("{run_id}", runId);
      result[mountPath] = volume.withMountOptions({
        ...(subPath === undefined ? {} : { subPath }),
        ...(definition.readOnly === undefined ? {} : { readOnly: definition.readOnly }),
      });
    }
    return result;
  }
  create(app: App, image: Image, params: SandboxCreateParams): Promise<Sandbox> {
    return this.client.sandboxes.create(app, image, params);
  }
  fromId(id: string): Promise<Sandbox> { return this.client.sandboxes.fromId(id); }
  fromName(name: string): Promise<Sandbox> {
    return this.client.sandboxes.fromName(this.config.appName, name, { environment: this.config.environment });
  }
  async snapshotImage(id: string): Promise<Image> {
    const sandbox = await this.fromId(id);
    return sandbox.snapshotFilesystem({ timeoutMs: 55_000, ttlMs: 30 * 24 * 60 * 60 * 1_000 });
  }
  close(): void { this.client.close(); }
}

function asContractError(error: unknown, operation: string): ContractError {
  if (error instanceof ContractError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof SandboxTimeoutError || error instanceof TimeoutError || /timeout/i.test(message)) {
    return new ContractError("provider.timeout", `Modal ${operation} timed out`, { operation });
  }
  if (error instanceof NotFoundError || /not found/i.test(message)) {
    return new ContractError("sandbox.lost", `Modal sandbox is unavailable during ${operation}`, { operation });
  }
  if (error instanceof SandboxFilesystemError) {
    return new ContractError("artifact.invalid", `Modal filesystem operation failed during ${operation}`, { operation });
  }
  if (/rate.?limit|resource exhausted|too many requests/i.test(message)) {
    return new ContractError("provider.rate_limited", `Modal rate limited ${operation}`, { operation });
  }
  return new ContractError("provider.unavailable", `Modal ${operation} failed`, { operation, cause: message.slice(0, 400) });
}

function sha256(data: Uint8Array | string): string {
  return `sha256:${createHash("sha256").update(data).digest("hex")}`;
}

function safeName(runId: RunId): string {
  return `beyond-${runId.toLowerCase().replaceAll("_", "-")}`.slice(0, 63);
}

function assertLimits(spec: SandboxSpec, config: ModalSandboxProviderConfig): void {
  const maxCpu = config.maxCpu ?? 4;
  const maxMemory = config.maxMemoryMb ?? 8_192;
  const maxWallTime = config.maxWallTimeMs ?? 60 * 60 * 1_000;
  if (!Number.isFinite(spec.resource_limits.cpu) || spec.resource_limits.cpu <= 0 || spec.resource_limits.cpu > maxCpu) {
    throw new ContractError("policy.denied", "Sandbox CPU limit is outside policy", { requested: spec.resource_limits.cpu, max: maxCpu });
  }
  if (!Number.isSafeInteger(spec.resource_limits.memory_mb) || spec.resource_limits.memory_mb < 128 || spec.resource_limits.memory_mb > maxMemory) {
    throw new ContractError("policy.denied", "Sandbox memory limit is outside policy", { requested: spec.resource_limits.memory_mb, max: maxMemory });
  }
  if (!Number.isSafeInteger(spec.resource_limits.wall_time_ms) || spec.resource_limits.wall_time_ms < 1_000 || spec.resource_limits.wall_time_ms > maxWallTime) {
    throw new ContractError("policy.denied", "Sandbox wall-time limit is outside policy", { requested: spec.resource_limits.wall_time_ms, max: maxWallTime });
  }
}

function assertRunIdentity(identity: ModalRunIdentity, runId: RunId, now: Date): void {
  if (identity.run_id !== runId
    || !identity.organization_id || !identity.project_id || !identity.actor_id || !identity.agent_version_id
    || !identity.public_key.includes("BEGIN PUBLIC KEY") || identity.token.split(".").length !== 3
    || !["tool-gateway", "model-gateway"].includes(identity.audience)
    || !Number.isFinite(Date.parse(identity.expires_at)) || Date.parse(identity.expires_at) <= now.getTime()) {
    throw new ContractError("authorization.denied", "Modal run identity is missing, expired, or bound to another run");
  }
}

function assertRemotePath(path: string, roots: readonly string[]): string {
  if (!isAbsolute(path)) throw new ContractError("artifact.invalid", "Sandbox path must be absolute", { path });
  const normalized = normalize(path).replaceAll("\\", "/");
  if (!roots.some((root) => normalized === root || normalized.startsWith(`${root}/`))) {
    throw new ContractError("policy.denied", "Sandbox path is outside the allowed roots", { path });
  }
  return normalized;
}

function sourceBytes(source: ObjectReference): Promise<Uint8Array> {
  if (source.uri.startsWith("file:")) return readFile(fileURLToPath(source.uri));
  if (source.uri.startsWith("data:")) {
    const separator = source.uri.indexOf(",");
    if (separator < 0) throw new ContractError("artifact.invalid", "Malformed data URI");
    const header = source.uri.slice(0, separator);
    const body = source.uri.slice(separator + 1);
    return Promise.resolve(Buffer.from(body, header.endsWith(";base64") ? "base64" : "utf8"));
  }
  throw new ContractError("artifact.invalid", "Only file: and data: upload sources are allowed", { scheme: source.uri.split(":", 1)[0] });
}

async function referenceBytes(reference: ObjectReference): Promise<Uint8Array> {
  const bytes = await sourceBytes(reference);
  if (reference.byte_size !== bytes.byteLength || reference.digest !== sha256(bytes)) {
    throw new ContractError("artifact.invalid", "Object reference integrity check failed", { uri: reference.uri });
  }
  return bytes;
}

interface WorkingSetEntry {
  readonly path: string;
  readonly reference: ObjectReference;
}

interface WorkingSetManifest {
  readonly schema_version: "1.0";
  readonly files: readonly WorkingSetEntry[];
}

function isObjectReference(value: unknown): value is ObjectReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.uri === "string"
    && typeof record.digest === "string"
    && typeof record.media_type === "string"
    && Number.isSafeInteger(record.byte_size)
    && Number(record.byte_size) >= 0;
}

async function readWorkingSet(reference: ObjectReference): Promise<WorkingSetManifest> {
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(await referenceBytes(reference)).toString("utf8")); }
  catch (error) {
    if (error instanceof ContractError) throw error;
    throw new ContractError("artifact.invalid", "Working-set manifest is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ContractError("artifact.invalid", "Working-set manifest is malformed");
  }
  const manifest = parsed as Partial<WorkingSetManifest>;
  if (manifest.schema_version !== "1.0" || !Array.isArray(manifest.files)) {
    throw new ContractError("artifact.invalid", "Working-set manifest schema is unsupported");
  }
  for (const file of manifest.files) {
    if (!file || typeof file.path !== "string" || !isObjectReference(file.reference)) {
      throw new ContractError("artifact.invalid", "Working-set manifest entry is malformed");
    }
  }
  return manifest as WorkingSetManifest;
}

interface ModalCheckpointManifest {
  readonly version: 1;
  readonly checkpoint_id: string;
  readonly run_id: string;
  readonly source_sandbox_id: string;
  readonly provider_sandbox_id: string;
  readonly snapshot_image_id: string;
  readonly base_image_id: string;
  readonly created_at: string;
  readonly memory_snapshot: false;
  readonly resource_limits: SandboxSpec["resource_limits"];
  readonly working_set: ObjectReference;
}

async function readCheckpointManifest(checkpoint: CheckpointReference): Promise<ModalCheckpointManifest> {
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(await referenceBytes(checkpoint.working_set_manifest)).toString("utf8")); }
  catch (error) {
    if (error instanceof ContractError) throw error;
    throw new ContractError("checkpoint.unavailable", "Modal checkpoint manifest is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ContractError("checkpoint.unavailable", "Modal checkpoint manifest is malformed");
  }
  const manifest = parsed as Partial<ModalCheckpointManifest>;
  const metadata = checkpoint.provider_metadata;
  if (manifest.version !== 1
    || manifest.checkpoint_id !== checkpoint.checkpoint_id
    || manifest.run_id !== checkpoint.run_id
    || manifest.memory_snapshot !== false
    || manifest.snapshot_image_id !== checkpoint.runtime_image_digest
    || manifest.snapshot_image_id !== metadata.snapshot_image_id
    || manifest.base_image_id !== metadata.base_image_id
    || !/^im-[A-Za-z0-9]+$/u.test(manifest.snapshot_image_id ?? "")
    || !/^im-[A-Za-z0-9]+$/u.test(manifest.base_image_id ?? "")
    || !isObjectReference(manifest.working_set)
    || !manifest.resource_limits) {
    throw new ContractError("checkpoint.unavailable", "Modal checkpoint identity does not match its manifest");
  }
  return manifest as ModalCheckpointManifest;
}

async function* processEvents(process: ContainerProcess<string>, now: () => Date): AsyncGenerator<ProcessEvent> {
  yield { type: "started", occurred_at: now().toISOString() };
  const stdout = process.stdout.getReader();
  const stderr = process.stderr.getReader();
  type ReadResult = { source: "stdout" | "stderr"; value: ReadableStreamReadResult<string> };
  const read = (source: "stdout" | "stderr", reader: ReadableStreamDefaultReader<string>): Promise<ReadResult> =>
    reader.read().then((value) => ({ source, value }));
  let stdoutNext: Promise<ReadResult> | undefined = read("stdout", stdout);
  let stderrNext: Promise<ReadResult> | undefined = read("stderr", stderr);
  while (stdoutNext !== undefined || stderrNext !== undefined) {
    const next = await Promise.race([...(stdoutNext === undefined ? [] : [stdoutNext]), ...(stderrNext === undefined ? [] : [stderrNext])]);
    if (next.value.done) {
      if (next.source === "stdout") stdoutNext = undefined;
      else stderrNext = undefined;
      continue;
    }
    if (next.value.value.length > 0) yield { type: next.source, text: next.value.value, occurred_at: now().toISOString() };
    if (next.source === "stdout") stdoutNext = read("stdout", stdout);
    else stderrNext = read("stderr", stderr);
  }
  yield { type: "exited", exit_code: await process.wait(), occurred_at: now().toISOString() };
}

export class ModalSandboxProvider implements SandboxProvider {
  private readonly config: ModalSandboxProviderConfig;
  private readonly boundary: ModalBoundary;
  private readonly entries = new Map<SandboxId, RegistryEntry>();
  private readonly runIndex = new Map<RunId, SandboxId>();
  private readonly now: () => Date;

  constructor(config: ModalSandboxProviderConfig, boundary?: ModalBoundary) {
    this.config = config;
    this.boundary = boundary ?? new OfficialModalBoundary(config);
    this.now = config.now ?? (() => new Date());
  }

  async create(spec: SandboxSpec): Promise<SandboxHandle> {
    assertLimits(spec, this.config);
    const existingId = this.runIndex.get(spec.run_id);
    const existing = existingId === undefined ? undefined : this.entries.get(existingId);
    if (existing?.state === "running") return existing.handle;
    try {
      const app = await this.boundary.app();
      const identity = await this.config.resolveRunIdentity?.(spec.run_id);
      if (this.config.resolveRunIdentity !== undefined) assertRunIdentity(identity!, spec.run_id, this.now());
      const expectedImageId = this.config.imageAliases?.[spec.image_digest] ?? spec.image_digest;
      const image = await this.boundary.image(expectedImageId);
      if (!/^im-[A-Za-z0-9]+$/u.test(expectedImageId) || image.imageId !== expectedImageId) {
        throw new ContractError("policy.denied", "Modal image must resolve to the configured immutable object ID", {
          reference: spec.image_digest,
          expected_image_id: expectedImageId,
          actual_image_id: image.imageId,
        });
      }
      const name = safeName(spec.run_id);
      let sandbox: Sandbox;
      try {
        sandbox = await this.boundary.fromName(name);
      } catch (error) {
        if (!(error instanceof NotFoundError) && !/not found/i.test(error instanceof Error ? error.message : String(error))) throw error;
        const roots = this.config.allowedWriteRoots ?? ["/workspace", "/artifacts", "/tmp"];
        const volumes = await this.boundary.volumes(spec.run_id);
        const allowedPorts = [...new Set(this.config.allowedPorts ?? [])];
        const params: SandboxCreateParams = {
          name,
          tags: { product: "beyond-chat", run_id: spec.run_id, managed_by: "modal-sandbox-provider" },
          cpu: spec.resource_limits.cpu,
          cpuLimit: spec.resource_limits.cpu,
          memoryMiB: spec.resource_limits.memory_mb,
          memoryLimitMiB: spec.resource_limits.memory_mb,
          timeoutMs: spec.resource_limits.wall_time_ms,
          idleTimeoutMs: Math.min(this.config.idleTimeoutMs ?? 10 * 60_000, spec.resource_limits.wall_time_ms),
          workdir: roots[0] ?? "/workspace",
          command: [...(this.config.sidecarCommand ?? ["python", "-m", "beyond_modal_runtime.sidecar"])],
          env: {
            BEYOND_RUN_ID: spec.run_id,
            BEYOND_SIDECAR_PORT: String(this.config.sidecarPort ?? 8765),
            BEYOND_ALLOWED_WRITE_ROOTS: roots.join(","),
            ...(identity === undefined ? {} : {
              BEYOND_RUN_ORGANIZATION_ID: identity.organization_id,
              BEYOND_RUN_PROJECT_ID: identity.project_id,
              BEYOND_RUN_ACTOR_ID: identity.actor_id,
              BEYOND_RUN_AGENT_VERSION_ID: identity.agent_version_id,
              BEYOND_RUN_GATEWAY_AUDIENCE: identity.audience,
              BEYOND_RUN_TOKEN: identity.token,
              BEYOND_RUN_PUBLIC_KEY: identity.public_key,
            }),
          },
          volumes,
          blockNetwork: this.config.blockNetwork ?? true,
          readinessProbe: Probe.withExec(["python", "-m", "beyond_modal_runtime.healthcheck"], { intervalMs: 500 }),
          ...(allowedPorts.length === 0 ? {} : { encryptedPorts: allowedPorts }),
          ...(this.config.outboundDomainAllowlist === undefined ? {} : { outboundDomainAllowlist: [...this.config.outboundDomainAllowlist] }),
        };
        sandbox = await this.boundary.create(app, image, params);
        await sandbox.waitUntilReady(Math.min(60_000, spec.resource_limits.wall_time_ms));
      }
      try {
        await this.materializeWorkingSet(sandbox, spec.working_set);
      } catch (error) {
        await sandbox.terminate({ wait: true }).catch(() => {});
        throw error;
      }
      const canonical = existing?.handle.sandbox_id ?? newCanonicalId("sbx");
      const handle: SandboxHandle = { sandbox_id: canonical, provider: "modal", run_id: spec.run_id };
      const entry: RegistryEntry = {
        handle,
        providerId: sandbox.sandboxId,
        name,
        spec,
        imageId: image.imageId,
        createdAt: this.now().toISOString(),
        state: "running",
      };
      this.entries.set(canonical, entry);
      this.runIndex.set(spec.run_id, canonical);
      return handle;
    } catch (error) {
      throw asContractError(error, "create");
    }
  }

  async start(id: SandboxId): Promise<void> {
    const entry = this.requireEntry(id);
    if (entry.state === "running") return;
    if (entry.state === "terminated") throw new ContractError("state.invalid_transition", "A terminated sandbox cannot be started");
    this.runIndex.delete(entry.spec.run_id);
    const replacement = await this.create(entry.spec);
    const replacementEntry = this.requireEntry(replacement.sandbox_id);
    this.entries.delete(replacement.sandbox_id);
    this.entries.set(id, { ...replacementEntry, handle: entry.handle });
    this.runIndex.set(entry.spec.run_id, id);
  }

  async stop(id: SandboxId): Promise<void> {
    const entry = this.requireEntry(id);
    if (entry.state !== "running") return;
    try {
      await (await this.boundary.fromId(entry.providerId)).terminate({ wait: true });
      entry.state = "stopped";
      entry.terminatedAt = this.now().toISOString();
    } catch (error) { throw asContractError(error, "stop"); }
  }

  async *exec(id: SandboxId, command: CommandSpec): AsyncGenerator<ProcessEvent> {
    const entry = this.requireRunning(id);
    if (command.argv.length === 0 || command.argv.some((value) => value.length === 0)) {
      throw new ContractError("validation.invalid_envelope", "Command argv must contain non-empty strings");
    }
    const forbidden = new Set(this.config.forbiddenEnvironmentKeys ?? DEFAULT_FORBIDDEN_ENV);
    for (const key of Object.keys(command.environment ?? {})) {
      if (forbidden.has(key) || key.endsWith("_SECRET") || key.endsWith("_API_KEY")) {
        throw new ContractError("policy.denied", "Master credentials cannot be injected into a sandbox command", { key });
      }
    }
    const roots = this.config.allowedWriteRoots ?? ["/workspace", "/artifacts", "/tmp"];
    const cwd = command.cwd === undefined ? undefined : assertRemotePath(command.cwd, roots);
    try {
      const sandbox = await this.boundary.fromId(entry.providerId);
      const process = await sandbox.exec([...command.argv], {
        mode: "text",
        ...(cwd === undefined ? {} : { workdir: cwd }),
        ...(command.environment === undefined ? {} : { env: { ...command.environment } }),
        timeoutMs: entry.spec.resource_limits.wall_time_ms,
      });
      yield* processEvents(process, this.now);
    } catch (error) { throw asContractError(error, "exec"); }
  }

  async upload(id: SandboxId, files: readonly UploadSpec[]): Promise<void> {
    const entry = this.requireRunning(id);
    const roots = this.config.allowedWriteRoots ?? ["/workspace", "/artifacts", "/tmp"];
    try {
      const filesystem = (await this.boundary.fromId(entry.providerId)).filesystem;
      for (const file of files) {
        const destination = assertRemotePath(file.destination, roots);
        const data = await sourceBytes(file.source);
        if (file.source.byte_size !== data.byteLength || file.source.digest !== sha256(data)) {
          throw new ContractError("artifact.invalid", "Upload source integrity check failed", { destination });
        }
        await filesystem.writeBytes(data, destination);
      }
    } catch (error) { throw asContractError(error, "upload"); }
  }

  async download(id: SandboxId, paths: readonly string[]): Promise<readonly ArtifactReference[]> {
    const entry = this.requireRunning(id);
    const roots = this.config.allowedWriteRoots ?? ["/workspace", "/artifacts", "/tmp"];
    const output: ArtifactReference[] = [];
    try {
      const filesystem = (await this.boundary.fromId(entry.providerId)).filesystem;
      const directory = resolve(this.config.artifactDirectory, entry.spec.run_id);
      await mkdir(directory, { recursive: true });
      for (const remote of paths) {
        const safeRemote = assertRemotePath(remote, roots);
        const data = await filesystem.readBytes(safeRemote);
        const target = join(directory, `${newCanonicalId("art")}-${basename(safeRemote)}`);
        await writeFile(target, data);
        output.push({
          artifact_id: canonicalId("art", basename(target).split("-", 1)[0]!.replace(/^art_/, "")),
          name: basename(safeRemote),
          uri: pathToFileURL(target).href,
          digest: sha256(data),
          media_type: "application/octet-stream",
          byte_size: data.byteLength,
        });
      }
      return output;
    } catch (error) { throw asContractError(error, "download"); }
  }

  async checkpoint(id: SandboxId): Promise<CheckpointReference> {
    const entry = this.requireRunning(id);
    try {
      const snapshot = await this.boundary.snapshotImage(entry.providerId);
      const checkpointId = newCanonicalId("chk");
      const manifest = {
        version: 1,
        checkpoint_id: checkpointId,
        run_id: entry.spec.run_id,
        source_sandbox_id: id,
        provider_sandbox_id: entry.providerId,
        snapshot_image_id: snapshot.imageId,
        base_image_id: entry.imageId,
        created_at: this.now().toISOString(),
        memory_snapshot: false,
        resource_limits: entry.spec.resource_limits,
        working_set: entry.spec.working_set,
      };
      const bytes = Buffer.from(JSON.stringify(manifest));
      const directory = resolve(this.config.artifactDirectory, entry.spec.run_id);
      await mkdir(directory, { recursive: true });
      const target = join(directory, `${checkpointId}.json`);
      await writeFile(target, bytes);
      const workingSet: ObjectReference = {
        uri: pathToFileURL(target).href,
        digest: sha256(bytes),
        media_type: "application/vnd.beyond.checkpoint-manifest+json",
        byte_size: bytes.byteLength,
      };
      return {
        checkpoint_id: checkpointId,
        run_id: entry.spec.run_id,
        event_sequence: 0,
        working_set_manifest: workingSet,
        artifacts: [],
        runtime_image_digest: snapshot.imageId,
        provider_metadata: {
          provider: "modal",
          snapshot_image_id: snapshot.imageId,
          base_image_id: entry.imageId,
          source_sandbox_id: entry.providerId,
          snapshot_kind: "filesystem",
          memory_snapshot: false,
          manifest_uri: workingSet.uri,
        },
      };
    } catch (error) { throw asContractError(error, "checkpoint"); }
  }

  async restore(checkpoint: CheckpointReference): Promise<SandboxHandle> {
    if (checkpoint.provider_metadata.provider !== "modal" || checkpoint.provider_metadata.memory_snapshot === true) {
      throw new ContractError("checkpoint.unavailable", "Checkpoint is not a supported Modal filesystem checkpoint");
    }
    const manifest = await readCheckpointManifest(checkpoint);
    const spec: SandboxSpec = {
      run_id: checkpoint.run_id,
      image_digest: manifest.snapshot_image_id,
      working_set: manifest.working_set,
      resource_limits: manifest.resource_limits,
    };
    this.runIndex.delete(checkpoint.run_id);
    try {
      return await this.create(spec);
    } catch (error) {
      if (!(error instanceof ContractError) || !["provider.unavailable", "sandbox.lost"].includes(error.code)) throw error;
      return await this.create({ ...spec, image_digest: manifest.base_image_id });
    }
  }

  async exposePort(id: SandboxId, port: number): Promise<Endpoint> {
    const entry = this.requireRunning(id);
    if (!(this.config.allowedPorts ?? []).includes(port)) {
      throw new ContractError("policy.denied", "Port is not allowlisted for exposure", { port });
    }
    try {
      const tunnels = await (await this.boundary.fromId(entry.providerId)).tunnels(30_000);
      const tunnel = tunnels[port];
      if (tunnel === undefined) throw new ContractError("provider.unavailable", "Modal did not return the requested tunnel", { port });
      return {
        url: tunnel.url,
        expires_at: new Date(Date.parse(entry.createdAt) + entry.spec.resource_limits.wall_time_ms).toISOString(),
      };
    } catch (error) { throw asContractError(error, "exposePort"); }
  }

  async terminate(id: SandboxId): Promise<void> {
    const entry = this.requireEntry(id);
    if (entry.state !== "terminated") {
      try {
        if (entry.state === "running") await (await this.boundary.fromId(entry.providerId)).terminate({ wait: true });
      } catch (error) {
        if (!(error instanceof NotFoundError) && !/not found/i.test(error instanceof Error ? error.message : String(error))) {
          throw asContractError(error, "terminate");
        }
      }
      entry.state = "terminated";
      entry.terminatedAt = this.now().toISOString();
    }
    this.runIndex.delete(entry.spec.run_id);
  }

  usage(id: SandboxId): SandboxUsage {
    const entry = this.requireEntry(id);
    const end = entry.terminatedAt === undefined ? this.now().getTime() : Date.parse(entry.terminatedAt);
    const seconds = Math.max(0, end - Date.parse(entry.createdAt)) / 1_000;
    return {
      sandbox_id: id,
      provider_sandbox_id: entry.providerId,
      created_at: entry.createdAt,
      ...(entry.terminatedAt === undefined ? {} : { terminated_at: entry.terminatedAt }),
      cpu: entry.spec.resource_limits.cpu,
      memory_mb: entry.spec.resource_limits.memory_mb,
      wall_time_ms: Math.round(seconds * 1_000),
      estimated_cpu_core_seconds: entry.spec.resource_limits.cpu * seconds,
      estimated_memory_gib_seconds: (entry.spec.resource_limits.memory_mb / 1_024) * seconds,
    };
  }

  inspectorUrl(id: SandboxId): string {
    const entry = this.requireEntry(id);
    return `https://modal.com/apps/${encodeURIComponent(this.config.environment)}/${encodeURIComponent(this.config.appName)}/sandboxes/${encodeURIComponent(entry.providerId)}`;
  }

  close(): void { this.boundary.close(); }

  private async materializeWorkingSet(sandbox: Sandbox, reference: ObjectReference): Promise<void> {
    const roots = this.config.allowedWriteRoots ?? ["/workspace", "/artifacts", "/tmp"];
    const manifest = await readWorkingSet(reference);
    for (const file of manifest.files) {
      const destination = assertRemotePath(file.path, roots);
      await sandbox.filesystem.writeBytes(await referenceBytes(file.reference), destination);
    }
  }

  private requireEntry(id: SandboxId): RegistryEntry {
    const entry = this.entries.get(id);
    if (entry === undefined) throw new ContractError("sandbox.lost", "Unknown Modal sandbox", { sandbox_id: id });
    return entry;
  }
  private requireRunning(id: SandboxId): RegistryEntry {
    const entry = this.requireEntry(id);
    if (entry.state !== "running") throw new ContractError("state.invalid_transition", "Sandbox is not running", { sandbox_id: id, state: entry.state });
    return entry;
  }
}

export type { ModalBoundary };
