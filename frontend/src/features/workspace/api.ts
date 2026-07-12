import { sessionRequest } from "../../lib/sessionClient";

/** Canonical product-plane contracts for the workspace shell. Every record is
 * organization-scoped by the server session; project scope is explicit on the
 * record. Nothing in this module fabricates data: empty stays empty. */

export interface ProjectSummary {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: "organization" | "private";
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProductRecordScope {
  organization_id: string;
  project_id: string | null;
  team_id: string | null;
}

export interface ProductRecordSummary {
  id: string;
  kind: string;
  state: string;
  version: number;
  scope: ProductRecordScope;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderReadiness {
  state: string;
  externally_verified: boolean;
}

export interface WorkspaceCapabilities {
  runtime_execution: boolean;
  providers: Record<"models" | "retrieval" | "actions" | "billing", ProviderReadiness>;
}

export interface OrganizationCatalog {
  built_in_agents: Array<{ id: string; name: string; state: string }>;
  skills: ProductRecordSummary[];
  tools: ProductRecordSummary[];
  apps: ProductRecordSummary[];
  mcp_servers: ProductRecordSummary[];
}

const BASE = "/api/v2/product";

export function listProjects() {
  return sessionRequest<{ items: ProjectSummary[] }>(`${BASE}/projects`);
}

export function createProject(input: { name: string; description?: string; visibility?: "organization" | "private" }) {
  return sessionRequest<ProjectSummary>(`${BASE}/projects`, { method: "POST", body: JSON.stringify(input) });
}

export function getProject(projectId: string) {
  return sessionRequest<ProjectSummary>(`${BASE}/projects/${encodeURIComponent(projectId)}`);
}

export type RecentSurface = "outputs" | "approvals" | "automations" | "agents";

export function listOrganizationRecent(surface: RecentSurface, limit = 20) {
  return sessionRequest<{ items: ProductRecordSummary[] }>(
    `${BASE}/organization/recent/${surface}?limit=${limit}`,
  );
}

export function getWorkspaceCapabilities() {
  return sessionRequest<WorkspaceCapabilities>(`${BASE}/workspace/capabilities`);
}

export function getOrganizationCatalog() {
  return sessionRequest<OrganizationCatalog>(`${BASE}/catalog`);
}

export function listProjectRecords(projectId: string, surface: "outputs" | "automations" | "memory") {
  return sessionRequest<{ items?: ProductRecordSummary[] } | ProductRecordSummary[]>(
    `${BASE}/projects/${encodeURIComponent(projectId)}/${surface}`,
  );
}

export function recordTitle(record: ProductRecordSummary): string {
  const payload = record.payload ?? {};
  const name = payload["name"];
  return typeof name === "string" && name.trim() ? name : `${record.kind} ${record.id.slice(0, 8)}`;
}

export type SectionStatus = "loading" | "ready" | "empty" | "error" | "forbidden";

export interface SectionState<T> {
  status: SectionStatus;
  data: T | null;
  message: string | null;
}

export const sectionLoading: SectionState<never> = { status: "loading", data: null, message: null };
