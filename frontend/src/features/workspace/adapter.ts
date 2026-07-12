import {
  BUILT_IN_AGENTS,
  PRODUCT_CATALOG,
  builtInDiscoveryItems,
  type ConnectionState,
  type DiscoveryItem,
  type ReferenceKind,
} from "@beyond/product-catalog";

export type WorkspaceRole = "member" | "admin";
export type PlannedWorkspaceRole = "owner" | "admin" | "builder" | "member" | "viewer";
export type WorkspaceUiState = "loading" | "empty" | "error" | "disconnected" | "permission_denied";

export interface ReferenceChip {
  readonly id: string;
  readonly label: string;
  readonly kind: ReferenceKind;
  readonly state: ConnectionState;
}

export interface PromotionDraft {
  readonly prompt: string;
  readonly references: readonly ReferenceChip[];
  readonly source: "chat";
}

export type CapabilityView = "apps" | "skills" | "tools" | "mcp" | "sources" | "policy";

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

// Discovery starts from the canonical built-in catalog only. Scoped items
// (projects, files, sources, apps) are appended at runtime from real
// organization/project APIs — never from fixtures.
export const discoveryItems: readonly DiscoveryItem[] = Object.freeze([...builtInDiscoveryItems()]);
export const builtInAgents = BUILT_IN_AGENTS;
export const canonicalNavigation = PRODUCT_CATALOG.navigation;
export const outputTemplates = PRODUCT_CATALOG.output_templates;

export function discoveryBrowsePath(itemId: string): string | null {
  if (itemId === "command.skills" || itemId === "command.skill") return "/knowledge-apps?view=skills";
  if (itemId === "command.tools" || itemId === "command.tool") return "/knowledge-apps?view=tools";
  if (itemId === "command.apps" || itemId === "command.app") return "/knowledge-apps?view=apps";
  if (itemId === "command.mcp") return "/knowledge-apps?view=mcp";
  if (itemId === "command.agent") return "/agents";
  if (itemId === "command.project") return "/projects";
  if (itemId === "command.file" || itemId === "command.source") return "/knowledge-apps?view=sources";
  if (itemId === "command.model") return "/settings";
  if (itemId === "command.work") return "/work";
  if (itemId === "command.schedule") return "/automations";
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
