import { supabase } from "../../lib/supabaseClient";

export type LiveSurface = "legacy_chat" | "legacy_runs" | "legacy_artifacts" | "runtime_events";
export type DeferredSurface = "agents" | "knowledge" | "memory" | "collaboration" | "automations";

export interface IntegrationAvailability {
  readonly live: readonly LiveSurface[];
  readonly deferred: Readonly<Record<DeferredSurface, string>>;
}

export const integrationAvailability: IntegrationAvailability = Object.freeze({
  live: ["legacy_chat", "legacy_runs", "legacy_artifacts", "runtime_events"],
  deferred: {
    agents: "No agent directory or publishing API is mounted.",
    knowledge: "No connection, source, or retrieval API is mounted.",
    memory: "No memory inspection or mutation API is mounted.",
    collaboration: "No comments, reviews, or presence API is mounted.",
    automations: "No automation definition, execution, or approval API is mounted.",
  },
});

export interface RuntimeEvent {
  readonly sequence: number;
  readonly event_type: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface RuntimeEventReplay {
  readonly events: readonly RuntimeEvent[];
  readonly cursor: number;
}

export interface ProviderStatusPort {
  readonly providers: Readonly<Record<string, { readonly status: string; readonly message?: string }>>;
}

export class IntegrationApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "IntegrationApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = supabase ? await supabase.auth.getSession() : null;
  const token = session?.data.session?.access_token;
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null) as { detail?: unknown; data?: unknown } | null;
  if (!response.ok) {
    const detail = typeof body?.detail === "string" ? body.detail : `Request failed with ${response.status}.`;
    throw new IntegrationApiError(detail, response.status);
  }
  return (body?.data ?? body) as T;
}

export interface WorkspaceApiPort {
  providerStatus(signal?: AbortSignal): Promise<ProviderStatusPort>;
  replayRunEvents(runId: string, after?: number, signal?: AbortSignal): Promise<RuntimeEventReplay>;
}

export const workspaceApi: WorkspaceApiPort = {
  providerStatus: (signal) => request<ProviderStatusPort>("/api/status/providers", { signal }),
  replayRunEvents: (runId, after = 0, signal) => request<RuntimeEventReplay>(`/api/runtime/runs/${encodeURIComponent(runId)}/events?after=${after}`, { signal }),
};
