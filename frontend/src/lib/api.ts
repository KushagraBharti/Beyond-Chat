export type ProviderStatus = "connected" | "not_configured" | "disconnected" | "error";

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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
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
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

export async function getWorkspace() {
  return api<{ workspace: Workspace; mvpBypassEnabled: boolean }>("/api/workspace");
}

export async function getReminders() {
  return api<{ items: Reminder[] }>("/api/reminders");
}

export async function getProviderStatuses() {
  return api<{ providers: Record<string, ProviderRecord> }>("/api/status/providers");
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

export async function sendThreadMessage(threadId: string, payload: { content: string; model: string }) {
  return api<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(`/api/chat/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

export async function createArtifact(payload: {
  title: string;
  type: string;
  studio: string;
  content: string;
  summary?: string | null;
  content_format?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  preview_image?: string | null;
}) {
  return api<{ artifact: ArtifactRecord }>("/api/artifacts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listArtifacts(params?: {
  q?: string;
  studio?: string;
  type?: string;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.studio) search.set("studio", params.studio);
  if (params?.type) search.set("type", params.type);
  if (params?.limit) search.set("limit", String(params.limit));
  const suffix = search.toString() ? `?${search}` : "";
  return api<{ items: ArtifactRecord[] }>(`/api/artifacts${suffix}`);
}

export async function getArtifact(artifactId: string) {
  return api<{ artifact: ArtifactRecord }>(`/api/artifacts/${artifactId}`);
}

export async function exportArtifact(artifactId: string, format: "markdown" | "pdf") {
  const response = await fetch(`/api/artifacts/${artifactId}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format }),
  });

  if (!response.ok) {
    throw new Error("Export failed.");
  }

  return response.blob();
}
