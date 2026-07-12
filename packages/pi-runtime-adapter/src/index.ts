import { createHash } from "node:crypto";
import {
  ContractError,
  EVENT_SCHEMA_VERSION,
  assertCanonicalId,
  assertEventEnvelope,
  canonicalId,
  toJsonValue,
  type ActorRef,
  type AgentRuntime,
  type ArtifactReference,
  type CancellationAcknowledgement,
  type CancellationRequest,
  type CheckpointReference,
  type CheckpointRequest,
  type CorrelationId,
  type EventEnvelope,
  type JsonObject,
  type ObjectReference,
  type OrganizationId,
  type ProjectId,
  type RunId,
  type ThreadId,
} from "@beyond/contracts";
import { Agent, type AgentEvent, type AgentMessage, type AgentTool } from "@earendil-works/pi-agent-core";
import {
  createAssistantMessageEventStream,
  type AssistantMessage,
  type Model,
} from "@earendil-works/pi-ai";
import { Type } from "typebox";

export const PI_REVISION = "19fe0e01c5eca791c9da0372b49256845555a783";

export interface PiAgentSurface {
  subscribe(listener: (event: AgentEvent, signal: AbortSignal) => void | Promise<void>): () => void;
  prompt(input: string): Promise<void>;
  continue(): Promise<void>;
  steer(message: AgentMessage): void;
  abort(): void;
  readonly state: {
    messages: AgentMessage[];
    readonly isStreaming: boolean;
    readonly pendingToolCalls: ReadonlySet<string>;
  };
}

export interface AdapterScope {
  readonly organization_id: OrganizationId;
  readonly project_id: ProjectId;
  readonly thread_id: ThreadId;
  readonly run_id: RunId;
  readonly actor: ActorRef;
  readonly correlation_id: CorrelationId;
}

export interface PiRuntimeAdapterOptions {
  readonly lastDurableSequence?: number;
  readonly workingSetManifest: ObjectReference;
  readonly runtimeImageDigest: string;
  readonly artifacts?: readonly ArtifactReference[];
  readonly providerMetadata?: JsonObject;
}

interface MappedEvent {
  readonly eventType: string;
  readonly payload: JsonObject;
}

class AsyncEventQueue implements AsyncIterable<EventEnvelope> {
  private readonly buffered: Array<{ readonly event: EventEnvelope; readonly acknowledge: () => void }> = [];
  private readonly waiters: Array<{
    readonly resolve: (result: IteratorResult<EventEnvelope>) => void;
    readonly reject: (error: unknown) => void;
  }> = [];
  private finished = false;
  private failure?: unknown;
  private acknowledgeDelivered?: () => void;

  async push(event: EventEnvelope): Promise<void> {
    if (this.finished) throw new ContractError("internal.unexpected", "Cannot emit after runtime stream settlement");
    await new Promise<void>((acknowledge) => {
      const waiter = this.waiters.shift();
      if (waiter) {
        this.acknowledgeDelivered = acknowledge;
        waiter.resolve({ value: event, done: false });
      } else {
        this.buffered.push({ event, acknowledge });
      }
    });
  }

  close(): void {
    this.finished = true;
    for (const waiter of this.waiters.splice(0)) waiter.resolve({ value: undefined, done: true });
  }

  fail(error: unknown): void {
    this.failure = error;
    this.finished = true;
    for (const waiter of this.waiters.splice(0)) waiter.reject(error);
  }

  [Symbol.asyncIterator](): AsyncIterator<EventEnvelope> {
    return {
      next: async () => {
        this.acknowledgeDelivered?.();
        this.acknowledgeDelivered = undefined;
        const buffered = this.buffered.shift();
        if (buffered) {
          this.acknowledgeDelivered = buffered.acknowledge;
          return { value: buffered.event, done: false };
        }
        if (this.failure !== undefined) throw this.failure;
        if (this.finished) return { value: undefined, done: true };
        return await new Promise<IteratorResult<EventEnvelope>>((resolve, reject) => {
          this.waiters.push({ resolve, reject });
        });
      },
      return: async () => {
        this.acknowledgeDelivered?.();
        this.acknowledgeDelivered = undefined;
        for (const buffered of this.buffered.splice(0)) buffered.acknowledge();
        this.close();
        return { value: undefined, done: true };
      },
    };
  }
}

function jsonObject(value: unknown): JsonObject {
  const normalized = toJsonValue(value ?? {});
  if (normalized === null || Array.isArray(normalized) || typeof normalized !== "object") {
    return { value: normalized };
  }
  return normalized as JsonObject;
}

function outputFromToolResult(result: JsonObject): JsonObject | undefined {
  const details = result.details;
  if (details === null || Array.isArray(details) || typeof details !== "object") return undefined;
  const output = (details as JsonObject).beyond_output;
  if (output === null || Array.isArray(output) || typeof output !== "object") return undefined;
  return output as JsonObject;
}

function mapPiEvent(event: AgentEvent): readonly MappedEvent[] {
  switch (event.type) {
    case "agent_start": return [{ eventType: "run.running", payload: { source: "pi-agent-core", pi_revision: PI_REVISION } }];
    case "agent_end": return [{ eventType: "run.completing", payload: { message_count: event.messages.length } }];
    case "turn_start": return [{ eventType: "turn.started", payload: {} }];
    case "turn_end": return [{ eventType: "turn.completed", payload: { tool_result_count: event.toolResults.length } }];
    case "message_start": return [{ eventType: "message.started", payload: { role: event.message.role } }];
    case "message_update": return [{ eventType: "message.delta", payload: jsonObject(event.assistantMessageEvent) }];
    case "message_end": return [{ eventType: "message.completed", payload: jsonObject(event.message) }];
    case "tool_execution_start": return [{ eventType: "tool.started", payload: { call_id: event.toolCallId, tool_name: event.toolName, arguments: jsonObject(event.args) } }];
    case "tool_execution_update": return [{ eventType: "tool.progress", payload: { call_id: event.toolCallId, tool_name: event.toolName, partial_result: jsonObject(event.partialResult) } }];
    case "tool_execution_end": {
      const result = jsonObject(event.result);
      const mapped: MappedEvent[] = [{
        eventType: event.isError ? "tool.failed" : "tool.completed",
        payload: { call_id: event.toolCallId, tool_name: event.toolName, result, is_error: event.isError },
      }];
      const output = event.isError ? undefined : outputFromToolResult(result);
      if (output) mapped.push({ eventType: "output.created", payload: output });
      return mapped;
    }
    default: throw new ContractError("internal.unexpected", "Unsupported Pi lifecycle event", { event_type: String((event as { type?: unknown }).type) });
  }
}

function dataReference(value: JsonObject): ObjectReference {
  const bytes = Buffer.from(JSON.stringify(value), "utf8");
  return {
    uri: `data:application/json;base64,${bytes.toString("base64")}`,
    digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    media_type: "application/json",
    byte_size: bytes.byteLength,
  };
}

function readDataReference(reference: ObjectReference): JsonObject {
  const prefix = "data:application/json;base64,";
  if (!reference.uri.startsWith(prefix) || reference.media_type !== "application/json") {
    throw new ContractError("checkpoint.unavailable", "Pi checkpoint runtime state is not a supported logical-state reference");
  }
  const bytes = Buffer.from(reference.uri.slice(prefix.length), "base64");
  const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (bytes.byteLength !== reference.byte_size || digest !== reference.digest) {
    throw new ContractError("artifact.invalid", "Pi checkpoint runtime state failed integrity validation");
  }
  return jsonObject(JSON.parse(bytes.toString("utf8")));
}

export class PiRuntimeAdapter implements AgentRuntime {
  private sequence: number;
  private readonly agent: PiAgentSurface;
  private readonly scope: AdapterScope;
  private readonly options: PiRuntimeAdapterOptions;
  private readonly seenDeliveries = new WeakSet<object>();
  private active = false;

  constructor(agent: PiAgentSurface, scope: AdapterScope, options: PiRuntimeAdapterOptions) {
    this.agent = agent;
    this.scope = scope;
    this.options = options;
    assertCanonicalId(scope.organization_id, "org");
    assertCanonicalId(scope.project_id, "prj");
    assertCanonicalId(scope.thread_id, "thr");
    assertCanonicalId(scope.run_id, "run");
    assertCanonicalId(scope.actor.id, "act");
    assertCanonicalId(scope.correlation_id, "cor");
    const initial = options.lastDurableSequence ?? 0;
    if (!Number.isSafeInteger(initial) || initial < 0) {
      throw new ContractError("validation.invalid_envelope", "lastDurableSequence must be non-negative");
    }
    if (!options.runtimeImageDigest.trim()) {
      throw new ContractError("validation.invalid_envelope", "runtimeImageDigest is required");
    }
    this.sequence = initial;
  }

  start(input: JsonObject): AsyncIterable<EventEnvelope> {
    const prompt = input.prompt;
    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new ContractError("validation.invalid_envelope", "AgentRuntime.start requires a non-empty prompt");
    }
    return this.stream(() => this.agent.prompt(prompt));
  }

  resume(checkpoint: CheckpointReference): AsyncIterable<EventEnvelope> {
    if (checkpoint.run_id !== this.scope.run_id) {
      throw new ContractError("validation.invalid_id", "Checkpoint run does not match adapter scope");
    }
    if (checkpoint.runtime_image_digest !== this.options.runtimeImageDigest) {
      throw new ContractError("checkpoint.unavailable", "Checkpoint runtime image does not match this adapter");
    }
    if (checkpoint.provider_metadata.pi_revision !== PI_REVISION) {
      throw new ContractError("checkpoint.unavailable", "Checkpoint Pi revision does not match this adapter");
    }
    if (!checkpoint.runtime_state) {
      throw new ContractError("checkpoint.unavailable", "Checkpoint has no logical Pi runtime state");
    }
    const state = readDataReference(checkpoint.runtime_state);
    const messages = state.messages;
    if (!Array.isArray(messages)) throw new ContractError("checkpoint.unavailable", "Checkpoint message state is malformed");
    this.agent.state.messages = messages as unknown as AgentMessage[];
    this.sequence = Math.max(this.sequence, checkpoint.event_sequence);
    return this.stream(() => this.agent.continue());
  }

  async steer(runId: RunId, message: string): Promise<void> {
    if (runId !== this.scope.run_id) throw new ContractError("validation.invalid_id", "Steer run does not match adapter scope");
    if (!message.trim()) throw new ContractError("validation.invalid_envelope", "Steering message is required");
    this.agent.steer({ role: "user", content: message, timestamp: Date.now() });
  }

  async cancel(request: CancellationRequest): Promise<CancellationAcknowledgement> {
    if (request.run_id !== this.scope.run_id) throw new ContractError("validation.invalid_id", "Cancel run does not match adapter scope");
    const accepted = this.active || this.agent.state.isStreaming;
    if (accepted) this.agent.abort();
    return {
      run_id: this.scope.run_id,
      accepted,
      durable_sequence: this.sequence,
      propagated_to: accepted ? ["runtime"] : [],
    };
  }

  async checkpoint(request: CheckpointRequest): Promise<CheckpointReference> {
    if (request.run_id !== this.scope.run_id) throw new ContractError("validation.invalid_id", "Checkpoint run does not match adapter scope");
    if (request.durable_sequence !== this.sequence) {
      throw new ContractError("concurrency.version_conflict", "Checkpoint sequence must equal the adapter durable sequence", {
        expected: this.sequence,
        actual: request.durable_sequence,
      });
    }
    const runtimeState = dataReference({
      pi_revision: PI_REVISION,
      messages: toJsonValue(this.agent.state.messages),
    });
    return {
      checkpoint_id: canonicalId("chk", crypto.randomUUID().replaceAll("-", "")),
      run_id: this.scope.run_id,
      event_sequence: this.sequence,
      runtime_state: runtimeState,
      working_set_manifest: this.options.workingSetManifest,
      artifacts: Object.freeze([...(this.options.artifacts ?? [])]),
      runtime_image_digest: this.options.runtimeImageDigest,
      provider_metadata: {
        ...(this.options.providerMetadata ?? {}),
        pi_revision: PI_REVISION,
        logical_only: true,
        process_memory_restored: false,
      },
    };
  }

  inspect(): JsonObject {
    return {
      state: this.active || this.agent.state.isStreaming ? "running" : "idle",
      last_sequence: this.sequence,
      pending_tools: [...this.agent.state.pendingToolCalls],
      pi_revision: PI_REVISION,
    };
  }

  /** App-server acknowledgement that non-runtime events advanced the durable log. */
  synchronizeDurableSequence(sequence: number): void {
    if (!Number.isSafeInteger(sequence) || sequence < this.sequence) {
      throw new ContractError("event.sequence_conflict", "Durable sequence cannot move backwards", {
        current: this.sequence,
        received: sequence,
      });
    }
    this.sequence = sequence;
  }

  private stream(operation: () => Promise<void>): AsyncIterable<EventEnvelope> {
    if (this.active) throw new ContractError("state.invalid_transition", "Pi adapter already has an active execution");
    const queue = new AsyncEventQueue();
    this.active = true;
    const unsubscribe = this.agent.subscribe(async (raw) => {
      if (this.seenDeliveries.has(raw as object)) return;
      this.seenDeliveries.add(raw as object);
      for (const mapped of mapPiEvent(raw)) await queue.push(this.normalize(mapped));
    });
    queueMicrotask(async () => {
      try {
        await operation();
        queue.close();
      } catch (error) {
        queue.fail(error);
      } finally {
        unsubscribe();
        this.active = false;
      }
    });
    return queue;
  }

  private normalize(mapped: MappedEvent): EventEnvelope {
    const event: EventEnvelope = {
        event_id: canonicalId("evt", crypto.randomUUID().replaceAll("-", "")),
        event_type: mapped.eventType,
        schema_version: EVENT_SCHEMA_VERSION,
        organization_id: this.scope.organization_id,
        project_id: this.scope.project_id,
        thread_id: this.scope.thread_id,
        run_id: this.scope.run_id,
        sequence: ++this.sequence,
        occurred_at: new Date().toISOString(),
        actor: this.scope.actor,
        correlation_id: this.scope.correlation_id,
        payload: mapped.payload,
        visibility: "project",
        sensitivity: "normal",
    };
    assertEventEnvelope(event);
    return event;
  }
}

export type OfflinePiStep =
  | {
      readonly type: "tool";
      readonly call_id: string;
      readonly tool_name: string;
      readonly arguments: JsonObject;
      readonly result_text: string;
      readonly result_details: JsonObject;
      readonly execute?: (arguments_: JsonObject) => Promise<{ readonly result_text: string; readonly result_details: JsonObject }>;
    }
  | { readonly type: "text"; readonly text: string };

/**
 * Offline deterministic Pi construction used by executable contract tests and
 * benchmark fixtures. Pi-native model/tool types remain private to the adapter.
 */
export function createOfflinePiRuntime(
  scope: AdapterScope,
  options: PiRuntimeAdapterOptions,
  steps: readonly OfflinePiStep[],
): PiRuntimeAdapter {
  if (steps.length === 0 || steps.at(-1)?.type !== "text") {
    throw new ContractError("validation.invalid_envelope", "Offline Pi script must end with a text response");
  }
  const model: Model<"beyond-offline"> = {
    id: "beyond-offline",
    name: "Beyond deterministic offline model",
    api: "beyond-offline",
    provider: "beyond",
    baseUrl: "",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 16_384,
    maxTokens: 4_096,
  };
  const argumentSchema = Type.Record(Type.String(), Type.Unknown());
  const toolSteps = new Map(steps.filter((step) => step.type === "tool").map((step) => [step.call_id, step]));
  const tools: AgentTool<typeof argumentSchema, JsonObject>[] = [...new Set([...toolSteps.values()].map((step) => step.tool_name))].map((name) => ({
    name,
    label: name,
    description: `Deterministic offline ${name} fixture tool`,
    parameters: argumentSchema,
    async execute(toolCallId, arguments_) {
      const step = toolSteps.get(toolCallId);
      if (!step || step.tool_name !== name) throw new Error(`Unexpected offline tool call ${toolCallId}/${name}`);
      const executed = step.execute ? await step.execute(jsonObject(arguments_)) : step;
      return { content: [{ type: "text", text: executed.result_text }], details: executed.result_details };
    },
  }));
  let index = 0;
  const streamFn = () => {
    const step = steps[index++];
    if (!step) throw new Error("Offline Pi model requested more responses than scripted");
    const content = step.type === "text"
      ? [{ type: "text" as const, text: step.text }]
      : [{ type: "toolCall" as const, id: step.call_id, name: step.tool_name, arguments: step.arguments }];
    const message: AssistantMessage = {
      role: "assistant",
      content,
      api: "beyond-offline",
      provider: "beyond",
      model: "beyond-offline",
      usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      stopReason: step.type === "tool" ? "toolUse" : "stop",
      timestamp: Date.now(),
    };
    const stream = createAssistantMessageEventStream();
    stream.push({ type: "start", partial: { ...message, content: [] } });
    if (step.type === "text") {
      stream.push({ type: "text_start", contentIndex: 0, partial: message });
      stream.push({ type: "text_delta", contentIndex: 0, delta: step.text, partial: message });
      stream.push({ type: "text_end", contentIndex: 0, content: step.text, partial: message });
    }
    stream.push({ type: "done", reason: step.type === "tool" ? "toolUse" : "stop", message });
    return stream;
  };
  return new PiRuntimeAdapter(new Agent({ initialState: { model, tools }, streamFn }), scope, options);
}
