import type { ArtifactId, CheckpointId, RunId, SandboxId } from "./ids.ts";
import type { ErrorCode } from "./errors.ts";
import type { EventEnvelope, ObjectReference } from "./envelopes.ts";
import type { JsonObject } from "./serialization.ts";

export interface ArtifactReference extends ObjectReference {
  readonly artifact_id: ArtifactId;
  readonly name: string;
}

export interface CheckpointReference {
  readonly checkpoint_id: CheckpointId;
  readonly run_id: RunId;
  readonly event_sequence: number;
  readonly runtime_state?: ObjectReference;
  readonly working_set_manifest: ObjectReference;
  readonly artifacts: readonly ArtifactReference[];
  readonly runtime_image_digest: string;
  readonly provider_metadata: JsonObject;
}

export interface SandboxSpec {
  readonly run_id: RunId;
  readonly image_digest: string;
  readonly working_set: ObjectReference;
  readonly resource_limits: { readonly cpu: number; readonly memory_mb: number; readonly wall_time_ms: number };
}

export interface SandboxHandle {
  readonly sandbox_id: SandboxId;
  readonly provider: string;
  readonly run_id: RunId;
}

export interface CommandSpec {
  readonly argv: readonly string[];
  readonly cwd?: string;
  readonly environment?: Readonly<Record<string, string>>;
}

export type ProcessEvent =
  | { readonly type: "started"; readonly occurred_at: string }
  | { readonly type: "stdout" | "stderr"; readonly text: string; readonly occurred_at: string }
  | { readonly type: "exited"; readonly exit_code: number; readonly occurred_at: string };

export interface UploadSpec {
  readonly source: ObjectReference;
  readonly destination: string;
}

export interface Endpoint {
  readonly url: string;
  readonly expires_at: string;
}

export interface SandboxProvider {
  create(spec: SandboxSpec): Promise<SandboxHandle>;
  start(id: SandboxId): Promise<void>;
  stop(id: SandboxId): Promise<void>;
  exec(id: SandboxId, command: CommandSpec): AsyncIterable<ProcessEvent>;
  upload(id: SandboxId, files: readonly UploadSpec[]): Promise<void>;
  download(id: SandboxId, paths: readonly string[]): Promise<readonly ArtifactReference[]>;
  checkpoint(id: SandboxId): Promise<CheckpointReference>;
  restore(checkpoint: CheckpointReference): Promise<SandboxHandle>;
  exposePort(id: SandboxId, port: number): Promise<Endpoint>;
  terminate(id: SandboxId): Promise<void>;
}

export interface RunCredential {
  readonly run_id: RunId;
  readonly audience: "tool-gateway";
  readonly expires_at: string;
  readonly token: string;
}

export interface ToolCall {
  readonly call_id: string;
  readonly tool_name: string;
  readonly arguments: JsonObject;
  readonly idempotency_key: string;
}

export interface ToolResult {
  readonly call_id: string;
  readonly output?: JsonObject;
  readonly object_reference?: ObjectReference;
}

export interface ToolGateway {
  execute(credential: RunCredential, call: ToolCall): Promise<ToolResult>;
  cancel(credential: RunCredential, call_id: string): Promise<void>;
}

export interface ModelRequest {
  readonly run_id: RunId;
  readonly model: string;
  readonly input: JsonObject;
  readonly idempotency_key: string;
}

export type ModelEvent =
  | { readonly type: "delta"; readonly text: string }
  | { readonly type: "usage"; readonly input_tokens: number; readonly output_tokens: number }
  | { readonly type: "completed"; readonly response: JsonObject }
  | { readonly type: "failed"; readonly error_code: ErrorCode };

export interface ModelGateway {
  stream(request: ModelRequest): AsyncIterable<ModelEvent>;
  cancel(run_id: RunId): Promise<void>;
}

export interface CancellationRequest {
  readonly run_id: RunId;
  readonly requested_at: string;
  readonly reason?: string;
  readonly expected_version?: number;
}

export interface CancellationAcknowledgement {
  readonly run_id: RunId;
  readonly accepted: boolean;
  readonly durable_sequence: number;
  readonly propagated_to: readonly ("coordinator" | "runtime" | "subprocess" | "sandbox")[];
}

export interface CheckpointRequest {
  readonly run_id: RunId;
  readonly durable_sequence: number;
  readonly reason: "semantic_boundary" | "approval_wait" | "recovery" | "manual";
}

export interface AgentRuntime {
  start(input: JsonObject): AsyncIterable<EventEnvelope>;
  resume(checkpoint: CheckpointReference): AsyncIterable<EventEnvelope>;
  steer(run_id: RunId, message: string): Promise<void>;
  cancel(request: CancellationRequest): Promise<CancellationAcknowledgement>;
  checkpoint(request: CheckpointRequest): Promise<CheckpointReference>;
}
