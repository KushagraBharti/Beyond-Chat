import { createHash } from "node:crypto";
import { canonicalId, type JsonObject } from "@beyond/contracts";
import {
  createOfflinePiRuntime,
  type AdapterScope,
  type OfflinePiStep,
  type PiRuntimeAdapterOptions,
} from "@beyond/pi-runtime-adapter";
import type { RuntimeFactory } from "./protocol.ts";

export type OfflineScriptFactory = (prompt: string) => readonly OfflinePiStep[];

const EMPTY_MANIFEST = {
  uri: "data:application/json;base64,e30=",
  digest: "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
  media_type: "application/json",
  byte_size: 2,
};

function agentId(runId: string) {
  return canonicalId("act", createHash("sha256").update(`beyond-pi-agent:${runId}`).digest("hex").slice(0, 32));
}

export function createOfflinePiRuntimeFactory(
  scriptFactory: OfflineScriptFactory,
  options: Partial<Omit<PiRuntimeAdapterOptions, "lastDurableSequence">> = {},
): RuntimeFactory {
  return ({ command, last_durable_sequence }) => {
    const scope: AdapterScope = {
      organization_id: command.organization_id,
      project_id: command.project_id!,
      thread_id: command.thread_id!,
      run_id: command.run_id!,
      actor: { type: "agent", id: agentId(command.run_id!) },
      correlation_id: command.correlation_id,
    };
    return createOfflinePiRuntime(scope, {
      workingSetManifest: options.workingSetManifest ?? EMPTY_MANIFEST,
      runtimeImageDigest: options.runtimeImageDigest ?? "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      artifacts: options.artifacts,
      providerMetadata: { mode: "offline-pi", ...(options.providerMetadata ?? {}) } as JsonObject,
      lastDurableSequence: last_durable_sequence,
    }, scriptFactory(String(command.payload.prompt)));
  };
}

export const defaultOfflinePiRuntimeFactory = createOfflinePiRuntimeFactory((prompt) => [
  { type: "text", text: `Offline Pi completed: ${prompt}` },
]);
