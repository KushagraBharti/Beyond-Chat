import { sessionRequest } from "../../lib/sessionClient";
import type { ProductRecordSummary } from "../workspace/api";
import type { MemoryEntryView, MemoryProposalView, MemorySensitivity } from "./model";

/**
 * Project-scoped memory persistence over the canonical product API. Every
 * mutation is optimistic-concurrency-controlled with If-Match on the record
 * version, so a concurrent edit conflicts loudly instead of overwriting.
 * Only project memory is durable today; user and team scopes remain truthful
 * "not yet available" states in the UI.
 */

const BASE = "/api/v2/product/projects";

function path(projectId: string, suffix: string) {
  return `${BASE}/${encodeURIComponent(projectId)}${suffix}`;
}

export interface MemoryRecords {
  entries: MemoryEntryView[];
  proposals: MemoryProposalView[];
  disabledSpaceIds: string[];
  /** record id → current version, required for If-Match mutations */
  versions: Map<string, number>;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function sensitivity(value: unknown): MemorySensitivity {
  return value === "sensitive" || value === "restricted" ? value : "normal";
}

function entryView(record: ProductRecordSummary): MemoryEntryView {
  const content = text(record.payload["content"]);
  return {
    id: record.id,
    spaceId: record.scope.project_id ?? "project",
    scope: "project",
    type: "semantic_fact",
    key: content.split(/\s+/).slice(0, 6).join(" ") || record.id.slice(0, 8),
    content,
    sensitivity: sensitivity(record.payload["sensitivity"]),
    updatedAt: record.updated_at,
    expiresAt: text(record.payload["expires_at"], "") || null,
    sourceEventIds: [],
  };
}

function proposalView(record: ProductRecordSummary): MemoryProposalView {
  const content = text(record.payload["content"]);
  return {
    id: record.id,
    scope: "project",
    reason: "explicit_remember",
    key: content.split(/\s+/).slice(0, 6).join(" ") || record.id.slice(0, 8),
    content,
    sensitivity: sensitivity(record.payload["sensitivity"]),
    contradictsEntryId: null,
    proposedAt: record.created_at,
  };
}

export async function loadProjectMemory(projectId: string): Promise<MemoryRecords> {
  const [entries, proposals] = await Promise.all([
    sessionRequest<{ items: ProductRecordSummary[] }>(path(projectId, "/memory")),
    sessionRequest<{ items: ProductRecordSummary[] }>(path(projectId, "/memory/proposals?state=pending")),
  ]);
  const versions = new Map<string, number>();
  for (const record of [...entries.items, ...proposals.items]) versions.set(record.id, record.version);
  return {
    entries: entries.items.filter((record) => record.state === "active" || record.state === "disabled").map(entryView),
    proposals: proposals.items.map(proposalView),
    disabledSpaceIds: entries.items.some((record) => record.state === "disabled") ? [projectId] : [],
    versions,
  };
}

export function resolveMemoryProposal(projectId: string, proposalId: string, version: number, state: "accepted" | "rejected") {
  return sessionRequest<ProductRecordSummary>(path(projectId, `/memory/proposals/${encodeURIComponent(proposalId)}/resolve`), {
    method: "POST",
    headers: { "If-Match": String(version) },
    body: JSON.stringify({ state }),
  });
}

export function rememberInProject(projectId: string, content: string, sensitivityValue: MemorySensitivity = "normal") {
  return sessionRequest<ProductRecordSummary>(path(projectId, "/memory"), {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ content, sensitivity: sensitivityValue === "restricted" ? "sensitive" : sensitivityValue }),
  });
}

export function deleteMemoryEntry(projectId: string, memoryId: string, version: number) {
  return sessionRequest<ProductRecordSummary>(path(projectId, `/memory/${encodeURIComponent(memoryId)}/delete`), {
    method: "POST",
    headers: { "If-Match": String(version) },
  });
}

export function updateMemoryEntry(projectId: string, memoryId: string, version: number, content: string, sensitivityValue: MemorySensitivity = "normal", expiresAt: string | null = null) {
  return sessionRequest<ProductRecordSummary>(path(projectId, `/memory/${encodeURIComponent(memoryId)}`), {
    method: "PATCH",
    headers: { "If-Match": String(version) },
    body: JSON.stringify({ content, sensitivity: sensitivityValue === "restricted" ? "sensitive" : sensitivityValue, expires_at: expiresAt }),
  });
}

export function setMemoryEntryEnabled(projectId: string, memoryId: string, version: number, enabled: boolean) {
  return sessionRequest<ProductRecordSummary>(path(projectId, `/memory/${encodeURIComponent(memoryId)}/${enabled ? "restore" : "disable"}`), {
    method: "POST",
    headers: { "If-Match": String(version) },
  });
}

export function exportProjectMemory(projectId: string) {
  return sessionRequest<{ format: string; items: ProductRecordSummary[] }>(path(projectId, "/memory/export"));
}
