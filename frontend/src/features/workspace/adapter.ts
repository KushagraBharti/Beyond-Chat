import {
  BUILT_IN_AGENTS,
  PRODUCT_CATALOG,
  builtInDiscoveryItems,
  type ConnectionState,
  type DiscoveryItem,
  type OutputType,
  type ReferenceKind,
} from "@beyond/product-catalog";

export type WorkspaceRole = "member" | "admin";
export type PlannedWorkspaceRole = "owner" | "admin" | "builder" | "member" | "viewer";
export type WorkspaceUiState = "loading" | "empty" | "error" | "disconnected" | "permission_denied";
export type WorkStatus = "draft" | "running" | "waiting_for_approval" | "completed" | "failed" | "canceled";

export interface ReferenceChip {
  readonly id: string;
  readonly label: string;
  readonly kind: ReferenceKind;
  readonly state: ConnectionState;
}

export interface WorkFixture {
  readonly id: string;
  readonly title: string;
  readonly goal: string;
  readonly status: WorkStatus;
  readonly agent: string;
  readonly updated: string;
  readonly project: string;
  readonly outputs: readonly { readonly id: string; readonly label: string; readonly type: OutputType; readonly state: "working" | "ready_for_review" | "approved" }[];
}

export interface PromotionDraft {
  readonly prompt: string;
  readonly references: readonly ReferenceChip[];
  readonly source: "chat";
}

export type CapabilityView = "apps" | "skills" | "mcp" | "sources" | "policy";

export interface CapabilityFixture {
  readonly id: string;
  readonly label: string;
  readonly kind: "app" | "skill" | "mcp";
  readonly state: "ready" | "disconnected" | "review_required" | "unavailable";
  readonly scope: string;
  readonly version: string;
  readonly detail: string;
}

export interface KnowledgeSourceFixture {
  readonly id: string;
  readonly label: string;
  readonly mode: "synced" | "federated" | "live";
  readonly state: "fresh" | "stale" | "not_connected";
  readonly freshness: string;
  readonly access: string;
  readonly citation: string;
}

export function workspaceRole(metadata: unknown): PlannedWorkspaceRole {
  if (!metadata || typeof metadata !== "object" || !("role" in metadata)) return "member";
  const role = (metadata as { role?: unknown }).role;
  return role === "owner" || role === "admin" || role === "builder" || role === "member" || role === "viewer" ? role : "member";
}

export function canAccessAdmin(role: PlannedWorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export const promotionStorageKey = "beyond.chat-work-promotion.v1";

export function savePromotionDraft(draft: PromotionDraft): void {
  sessionStorage.setItem(promotionStorageKey, JSON.stringify(draft));
}

export function takePromotionDraft(): PromotionDraft | null {
  const value = sessionStorage.getItem(promotionStorageKey);
  sessionStorage.removeItem(promotionStorageKey);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as PromotionDraft;
    return parsed.source === "chat" && typeof parsed.prompt === "string" ? parsed : null;
  } catch {
    return null;
  }
}

const scopedDiscovery: readonly DiscoveryItem[] = Object.freeze([
  { id: "project.market-entry", version: "1.0.0", kind: "project", label: "Market entry", aliases: Object.freeze(["market-entry"]), intent: "select_project", state: "ready" },
  { id: "file.customer-interviews", version: "1.0.0", kind: "file", label: "Customer interviews", aliases: Object.freeze(["interviews"]), intent: "attach", state: "ready" },
  { id: "source.company-handbook", version: "1.0.0", kind: "source", label: "Company handbook", aliases: Object.freeze(["handbook"]), intent: "attach", state: "ready" },
  { id: "app.notion", version: "1.0.0", kind: "app", label: "Notion", aliases: Object.freeze([]), intent: "attach", state: "disconnected", state_reason: "Reconnect Notion before it can be attached." },
  { id: "model.general", version: "1.0.0", kind: "model", label: "General model", aliases: Object.freeze(["default-model"]), intent: "choose_model", state: "ready" },
]);

export const discoveryItems = Object.freeze([...builtInDiscoveryItems(), ...scopedDiscovery]);
export const builtInAgents = BUILT_IN_AGENTS;
export const canonicalNavigation = PRODUCT_CATALOG.navigation;
export const outputTemplates = PRODUCT_CATALOG.output_templates;

export const capabilityFixtures: readonly CapabilityFixture[] = Object.freeze([
  { id: "app.google-drive", label: "Google Drive", kind: "app", state: "ready", scope: "Project read", version: "toolkit pinned-1", detail: "Fixture connection reference only; credentials never enter discovery." },
  { id: "app.notion", label: "Notion", kind: "app", state: "disconnected", scope: "User", version: "toolkit pinned-1", detail: "Reconnect is unavailable until the connection control plane is wired." },
  { id: "skill.cited-research", label: "Cited research", kind: "skill", state: "ready", scope: "Built-in", version: "1.0.0", detail: "Pinned instructions and eval contract; attachment does not execute the skill." },
  { id: "skill.board-brief", label: "Board briefing", kind: "skill", state: "review_required", scope: "Organization", version: "0.3.0", detail: "Trust review and compatibility checks are required before installation." },
  { id: "mcp.databricks", label: "Databricks governed query", kind: "mcp", state: "unavailable", scope: "Organization", version: "manifest 1.0", detail: "No approved binding or fresh capability cache is available." },
]);

export const knowledgeSourceFixtures: readonly KnowledgeSourceFixture[] = Object.freeze([
  { id: "source.handbook", label: "Company handbook", mode: "synced", state: "fresh", freshness: "Fixture ACL snapshot · 4 min", access: "Project members through an inherited allow; explicit deny wins.", citation: "Exact immutable revision is resolvable in the offline fixture." },
  { id: "source.drive", label: "Google Drive", mode: "synced", state: "not_connected", freshness: "No authoritative cursor", access: "No source content is retrievable until a scoped connection exists.", citation: "Unavailable because there is no accessible revision." },
  { id: "source.glean", label: "Glean", mode: "federated", state: "not_connected", freshness: "Live decision required", access: "A current opaque actor assertion must be checked by the source.", citation: "Provider result must resolve to an accessible source revision." },
  { id: "source.databricks", label: "Databricks", mode: "live", state: "not_connected", freshness: "Query-time authorization", access: "Governed intent only; raw SQL and table crawling are rejected.", citation: "Query evidence is not available in this offline UI." },
]);

export const policyAuditFixtures = Object.freeze([
  { id: "audit.policy", label: "Tool policy", state: "enforced", detail: "Unknown tools deny. An applicable deny wins. Consequential writes require approval." },
  { id: "audit.revocation", label: "Revocation", state: "immediate", detail: "Revoked app and MCP bindings are excluded before a session tool surface is projected." },
  { id: "audit.knowledge", label: "Knowledge freshness", state: "target", detail: "Offline contract target: p95 5 minutes, maximum 15 minutes for lost access." },
  { id: "audit.provider", label: "Provider audit", state: "offline", detail: "No live provider version, credential, action, or remote audit record is claimed by this fixture." },
]);

export function discoveryBrowsePath(itemId: string): string | null {
  if (itemId === "command.skills" || itemId === "command.skill") return "/knowledge-apps?view=skills";
  if (itemId === "command.apps" || itemId === "command.app") return "/knowledge-apps?view=apps";
  if (itemId === "command.mcp") return "/knowledge-apps?view=mcp";
  if (itemId === "command.agent") return "/agents";
  return null;
}

export const workFixtures: readonly WorkFixture[] = Object.freeze([
  { id: "work.market-brief", title: "Market entry brief", goal: "Synthesize interviews into a cited launch recommendation.", status: "running", agent: "Research", updated: "Updated 4 min ago", project: "Market entry", outputs: [{ id: "out.brief", label: "Launch brief", type: "document", state: "working" }, { id: "out.deck", label: "Decision deck", type: "presentation", state: "ready_for_review" }, { id: "out.sources", label: "Source bundle", type: "research_bundle", state: "ready_for_review" }] },
  { id: "work.q3-model", title: "Q3 scenario model", goal: "Compare revenue scenarios and flag assumptions for review.", status: "waiting_for_approval", agent: "Finance", updated: "Awaiting approval", project: "Planning", outputs: [{ id: "out.model", label: "Scenario model", type: "spreadsheet", state: "ready_for_review" }, { id: "out.chart", label: "Sensitivity chart", type: "chart", state: "ready_for_review" }] },
  { id: "work.brand-images", title: "Campaign concept images", goal: "Prepare three image concepts for review.", status: "completed", agent: "General", updated: "Completed yesterday", project: "Brand refresh", outputs: [{ id: "out.image", label: "Concept collection", type: "image", state: "approved" }] },
]);

export const statusLabel: Readonly<Record<WorkStatus, string>> = Object.freeze({
  draft: "Draft", running: "In progress", waiting_for_approval: "Needs approval", completed: "Completed", failed: "Needs recovery", canceled: "Canceled",
});
