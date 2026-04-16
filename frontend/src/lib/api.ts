import { supabase } from "./supabaseClient";

export type ProviderStatus = "connected" | "not_configured" | "disconnected" | "error";

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
const defaultProductionApiBaseUrl = "";

function isLocalhostApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  } catch {
    return false;
  }
}

function resolveApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    return configuredApiBaseUrl ?? "";
  }

  if (configuredApiBaseUrl && !isLocalhostApiUrl(configuredApiBaseUrl)) {
    return configuredApiBaseUrl;
  }

  return defaultProductionApiBaseUrl;
}

const apiBaseUrl = resolveApiBaseUrl();
const workspaceStorageKey = "bc.workspace_id";
let providerStatusesCache: Record<string, ProviderRecord> | null = null;

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  title: string;
  note: string;
  due_at: string;
  status: string;
  source: string;
  workspace_id: string;
  created_at: string;
}

export interface ProviderRecord {
  status: ProviderStatus;
  label: string;
  details: string;
}

export interface ChatCollection {
  id: string;
  workspace_id: string;
  kind: "project" | "group" | "chat";
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface ChatThread {
  id: string;
  workspace_id: string;
  collection_id: string | null;
  collection_type: "project" | "group" | "chat";
  studio: string;
  title: string;
  model: string;
  prompt: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
  messages?: ChatMessage[];
}

export interface CompareResult {
  model: string;
  status: ProviderStatus | "completed" | "failed";
  content: string;
  latencyMs: number;
  error: string | null;
}

export interface RunStep {
  id: string;
  run_id: string;
  step_name: string;
  tool_used: string;
  status: string;
  input: unknown;
  output: unknown;
  created_at: string;
}

export interface RunRecord {
  id: string;
  workspace_id: string;
  studio: string;
  title: string;
  prompt: string;
  status: string;
  model: string;
  options: Record<string, unknown>;
  output: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  steps: RunStep[];
}

export interface ArtifactRecord {
  id: string;
  workspace_id: string;
  type: string;
  title: string;
  content: string;
  contentJson: unknown;
  contentFormat: string;
  summary: string | null;
  previewImage: string | null;
  tags: string[];
  studio: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateArtifactInput {
  artifact_id?: string;
  title: string;
  type: string;
  studio: string;
  content: string;
  summary?: string | null;
  content_format?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  preview_image?: string | null;
  content_json?: unknown;
  source_run_id?: string | null;
  storage_path?: string | null;
}

export function getStoredWorkspaceId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(workspaceStorageKey);
}

export function setStoredWorkspaceId(workspaceId: string | null) {
  if (typeof window === "undefined") return;
  if (!workspaceId) {
    window.localStorage.removeItem(workspaceStorageKey);
    return;
  }
  window.localStorage.setItem(workspaceStorageKey, workspaceId);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const session = supabase ? await supabase.auth.getSession() : null;
  const accessToken = session?.data.session?.access_token;
  const workspaceId = getStoredWorkspaceId();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const maybeJson = await response.json().catch(() => null);
    const detail = maybeJson?.detail ?? maybeJson?.error ?? response.statusText;
    throw new Error(typeof detail === "string" ? detail : "Request failed.");
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { data?: T; error?: unknown } | T;
    if (payload && typeof payload === "object" && "data" in payload && "error" in payload) {
      return payload.data as T;
    }
    return payload as T;
  }
  return (await response.text()) as T;
}

export async function bootstrapAuth() {
  const payload = await api<{
    workspace: Workspace;
    role: string;
    created: boolean;
    source?: string;
  }>("/api/auth/bootstrap", {
    method: "POST",
  });
  setStoredWorkspaceId(payload.workspace.id);
  return payload;
}

export async function getWorkspace() {
  const payload = await api<{ workspace: Workspace; authSource?: string }>("/api/workspace");
  setStoredWorkspaceId(payload.workspace.id);
  return payload;
}

export async function getReminders() {
  return api<{ items: Reminder[] }>("/api/reminders");
}

export async function createReminder(payload: { title: string; note?: string; due_at: string }) {
  return api<{ item: Reminder }>("/api/reminders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteReminder(reminderId: string) {
  return api<string>(`/api/reminders/${reminderId}`, {
    method: "DELETE",
  });
}

export async function getProviderStatuses() {
  const payload = await api<{ providers: Record<string, ProviderRecord> }>("/api/status/providers");
  providerStatusesCache = payload.providers;
  return payload;
}

export function getCachedProviderStatuses() {
  return providerStatusesCache;
}

export async function getCalendarEvents() {
  return api<{ items: Array<{ id: string; title: string; startsAt: string; location: string }> }>(
    "/api/integrations/google-calendar/events",
  );
}

export async function startGoogleCalendarConnect() {
  return api<{ status: ProviderStatus; url: string | null }>("/api/integrations/google-calendar/connect-start", {
    method: "POST",
  });
}

export async function listChatThreads() {
  return api<{ collections: ChatCollection[]; threads: ChatThread[] }>("/api/chat/threads");
}

export async function createThread(payload: {
  title: string;
  collection_id?: string | null;
  collection_type?: string;
  studio?: string;
  model?: string;
  prompt?: string | null;
}) {
  return api<{ thread: ChatThread }>("/api/chat/threads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getThread(threadId: string) {
  return api<{ thread: ChatThread }>(`/api/chat/threads/${threadId}`);
}

export async function renameThread(threadId: string, payload: { title: string }) {
  return api<{ thread: ChatThread }>(`/api/chat/threads/${threadId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteThread(threadId: string) {
  return api<string>(`/api/chat/threads/${threadId}`, {
    method: "DELETE",
  });
}

export async function sendThreadMessage(threadId: string, payload: { content: string; model: string }) {
  return api<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(`/api/chat/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function streamThreadMessage(
  threadId: string,
  payload: { content: string; model: string },
  handlers: { onDelta?: (chunk: string, fullText: string) => void } = {},
) {
  const session = supabase ? await supabase.auth.getSession() : null;
  const accessToken = session?.data.session?.access_token;
  const workspaceId = getStoredWorkspaceId();

  const response = await fetch(`${apiBaseUrl}/api/chat/threads/${threadId}/messages/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const maybeJson = await response.json().catch(() => null);
    const detail = maybeJson?.detail ?? maybeJson?.error ?? response.statusText;
    throw new Error(typeof detail === "string" ? detail : "Streaming request failed.");
  }

  if (!response.body) {
    throw new Error("Streaming response body is not available.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      let eventType = "message";
      const dataLines: string[] = [];

      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        }
      }

      if (!dataLines.length) {
        boundary = buffer.indexOf("\n\n");
        continue;
      }

      const dataText = dataLines.join("\n");
      let data: {
        content?: string;
        userMessage?: ChatMessage;
        assistantMessage?: ChatMessage;
      };
      try {
        data = JSON.parse(dataText) as {
          content?: string;
          userMessage?: ChatMessage;
          assistantMessage?: ChatMessage;
        };
      } catch {
        boundary = buffer.indexOf("\n\n");
        continue;
      }

      if (eventType === "delta") {
        const chunk = typeof data.content === "string" ? data.content : "";
        fullText += chunk;
        handlers.onDelta?.(chunk, fullText);
      }

      if (eventType === "done" && data.userMessage && data.assistantMessage) {
        return {
          userMessage: data.userMessage,
          assistantMessage: data.assistantMessage,
        };
      }

      boundary = buffer.indexOf("\n\n");
    }
  }

  throw new Error("Chat stream ended before a final response was received.");
}

export async function comparePrompt(payload: { prompt: string; models: string[]; context_ids?: string[] }) {
  return api<{ results: CompareResult[] }>("/api/chat/compare", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createRun(payload: {
  studio: string;
  title: string;
  prompt: string;
  model?: string;
  context_ids?: string[];
  options?: Record<string, unknown>;
}) {
  return api<{ run: RunRecord }>("/api/runs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getRun(runId: string) {
  return api<{ run: RunRecord }>(`/api/runs/${runId}`);
}

export async function getRunSteps(runId: string) {
  return api<{ steps: RunStep[] }>(`/api/runs/${runId}/steps`);
}

export async function createArtifact(payload: CreateArtifactInput) {
  const artifact = await api<ArtifactRecord>("/api/artifact", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { artifact };
}

export async function listArtifacts(params?: {
  q?: string;
  studio?: string;
  type?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.studio) search.set("studio", params.studio);
  if (params?.type) search.set("type", params.type);
  if (params?.tags?.length) search.set("tags", params.tags.join(","));
  if (params?.date_from) search.set("date_from", params.date_from);
  if (params?.date_to) search.set("date_to", params.date_to);
  if (params?.limit) search.set("limit", String(params.limit));
  const suffix = search.toString() ? `?${search}` : "";
  const items = await api<ArtifactRecord[]>(`/api/artifact/search${suffix}`);
  return { items };
}

export async function getArtifact(artifactId: string) {
  const artifact = await api<ArtifactRecord>(`/api/artifact/${artifactId}`);
  return { artifact };
}

export async function renameArtifact(artifactId: string, payload: { title: string }) {
  const artifact = await api<ArtifactRecord>(`/api/artifact/${artifactId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return { artifact };
}

export async function deleteArtifact(artifactId: string) {
  return api<string>(`/api/artifact/${artifactId}`, {
    method: "DELETE",
  });
}

export async function exportArtifact(artifactId: string, format: "markdown" | "pdf") {
  const session = supabase ? await supabase.auth.getSession() : null;
  const accessToken = session?.data.session?.access_token;
  const workspaceId = getStoredWorkspaceId();
  const response = await fetch(`${apiBaseUrl}/api/artifact/${artifactId}/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
    },
    body: JSON.stringify({ format }),
  });

  if (!response.ok) {
    throw new Error("Export failed.");
  }

  return response.blob();
}
