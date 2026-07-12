import type { AgentManifest, CapabilityId, CapabilityPack, DiscoveryItem, ProductCatalog } from "./types.ts";
import { GENERAL_AGENT_V1 } from "../../../agents/builtins/general/v1.ts";
import { RESEARCH_AGENT_V1 } from "../../../agents/builtins/research/v1.ts";
import { FINANCE_AGENT_V1 } from "../../../agents/builtins/finance/v1.ts";

const capability = (name: string): CapabilityId => `capability.${name}`;

export const BUILT_IN_AGENTS: readonly AgentManifest[] = Object.freeze([GENERAL_AGENT_V1, RESEARCH_AGENT_V1, FINANCE_AGENT_V1]);

export const PRODUCT_CATALOG: ProductCatalog = Object.freeze({
  schema_version: "1.0",
  catalog_version: "1.0.0",
  navigation: Object.freeze([
    { id: "product.home", concept: "home", label: "Home", aliases: Object.freeze(["dashboard"]), status: "primary" },
    { id: "product.chat", concept: "chat", label: "Chat", aliases: Object.freeze([]), status: "primary" },
    { id: "product.work", concept: "work", label: "Work", aliases: Object.freeze(["tasks"]), status: "primary" },
    { id: "product.projects", concept: "projects", label: "Projects", aliases: Object.freeze([]), status: "primary" },
    { id: "product.agents", concept: "agents", label: "Agents", aliases: Object.freeze([]), status: "primary" },
    { id: "product.knowledge_apps", concept: "knowledge_apps", label: "Knowledge & Apps", aliases: Object.freeze(["knowledge", "apps"]), status: "primary" },
    { id: "product.automations", concept: "automations", label: "Automations", aliases: Object.freeze([]), status: "primary" },
    { id: "product.settings", concept: "settings", label: "Settings", aliases: Object.freeze([]), status: "administrative" },
    { id: "product.admin", concept: "admin", label: "Admin", aliases: Object.freeze([]), status: "administrative" },
  ]),
  reference_kinds: Object.freeze(["agent", "skill", "tool", "app", "mcp_tool", "project", "file", "source", "model", "output_type", "command"]),
  output_templates: Object.freeze([
    { id: "output-template.document.brief", version: "1.0.0", output_type: "document", label: "Brief", required_capability_packs: Object.freeze(["documents"]) as readonly CapabilityPack[], validation_policy_ref: "policy.output.document.v1" },
    { id: "output-template.document.cited_brief", version: "1.0.0", output_type: "document", label: "Cited research brief", required_capability_packs: Object.freeze(["documents", "research"]) as readonly CapabilityPack[], validation_policy_ref: "policy.output.citations.v1" },
    { id: "output-template.report.general", version: "1.0.0", output_type: "report", label: "General report", required_capability_packs: Object.freeze(["documents"]) as readonly CapabilityPack[], validation_policy_ref: "policy.output.document.v1" },
    { id: "output-template.report.research", version: "1.0.0", output_type: "report", label: "Research report", required_capability_packs: Object.freeze(["documents", "research"]) as readonly CapabilityPack[], validation_policy_ref: "policy.output.citations.v1" },
    { id: "output-template.report.finance_memo", version: "1.0.0", output_type: "report", label: "Finance memo", required_capability_packs: Object.freeze(["data_finance", "research"]) as readonly CapabilityPack[], validation_policy_ref: "policy.output.finance.v1" },
    { id: "output-template.spreadsheet.financial_model", version: "1.0.0", output_type: "spreadsheet", label: "Financial model", required_capability_packs: Object.freeze(["data_finance"]) as readonly CapabilityPack[], validation_policy_ref: "policy.output.spreadsheet.v1" },
    { id: "output-template.presentation.research", version: "1.0.0", output_type: "presentation", label: "Research presentation", required_capability_packs: Object.freeze(["documents", "research"]) as readonly CapabilityPack[], validation_policy_ref: "policy.output.presentation.v1" },
    { id: "output-template.image.generated", version: "1.0.0", output_type: "image", label: "Generated image", required_capability_packs: Object.freeze(["image"]) as readonly CapabilityPack[], validation_policy_ref: "policy.output.image.v1" },
    { id: "output-template.chart.analysis", version: "1.0.0", output_type: "chart", label: "Analysis chart", required_capability_packs: Object.freeze(["data_finance"]) as readonly CapabilityPack[], validation_policy_ref: "policy.output.chart.v1" },
  ]),
  capability_packs: Object.freeze({
    core: Object.freeze([capability("conversation"), capability("planning"), capability("file_read")]),
    documents: Object.freeze([capability("document_output"), capability("presentation_output"), capability("code_assisted")]),
    research: Object.freeze([capability("knowledge_retrieval"), capability("web_research"), capability("citation_synthesis")]),
    data_finance: Object.freeze([capability("data_analysis"), capability("finance_filings"), capability("financial_data"), capability("market_research"), capability("financial_modeling"), capability("spreadsheet_output"), capability("chart_output")]),
    image: Object.freeze([capability("image_output")]),
    automation: Object.freeze([capability("automation_setup")]),
  }),
} satisfies ProductCatalog);

/** A safe, static discovery index. Runtime supplies project/file/source items and truthful connection state. */
export function builtInDiscoveryItems(): readonly DiscoveryItem[] {
  const agents = BUILT_IN_AGENTS.map((agent): DiscoveryItem => ({
    id: agent.id, version: agent.version, kind: "agent", label: agent.name, aliases: agent.aliases, intent: "invoke_agent", state: "ready",
  }));
  const commands: readonly DiscoveryItem[] = [
    { id: "command.skills", version: "1.0.0", kind: "command", label: "skills", aliases: Object.freeze([]), intent: "browse", state: "ready" },
    { id: "command.agent", version: "1.0.0", kind: "command", label: "agent", aliases: Object.freeze([]), intent: "browse", state: "ready" },
    { id: "command.skill", version: "1.0.0", kind: "command", label: "skill", aliases: Object.freeze([]), intent: "browse", state: "ready" },
    { id: "command.apps", version: "1.0.0", kind: "command", label: "apps", aliases: Object.freeze([]), intent: "browse", state: "ready" },
    { id: "command.app", version: "1.0.0", kind: "command", label: "app", aliases: Object.freeze([]), intent: "browse", state: "ready" },
    { id: "command.mcp", version: "1.0.0", kind: "command", label: "mcp", aliases: Object.freeze([]), intent: "browse", state: "ready" },
    { id: "command.project", version: "1.0.0", kind: "command", label: "project", aliases: Object.freeze([]), intent: "select_project", state: "ready" },
    { id: "command.file", version: "1.0.0", kind: "command", label: "file", aliases: Object.freeze([]), intent: "attach", state: "ready" },
    { id: "command.source", version: "1.0.0", kind: "command", label: "source", aliases: Object.freeze([]), intent: "attach", state: "ready" },
    { id: "command.model", version: "1.0.0", kind: "command", label: "model", aliases: Object.freeze([]), intent: "choose_model", state: "ready" },
    { id: "command.image", version: "1.0.0", kind: "output_type", label: "image", aliases: Object.freeze([]), intent: "request_output", state: "ready" },
    { id: "command.document", version: "1.0.0", kind: "output_type", label: "document", aliases: Object.freeze([]), intent: "request_output", state: "ready" },
    { id: "command.spreadsheet", version: "1.0.0", kind: "output_type", label: "spreadsheet", aliases: Object.freeze([]), intent: "request_output", state: "ready" },
    { id: "command.presentation", version: "1.0.0", kind: "output_type", label: "presentation", aliases: Object.freeze(["deck"]), intent: "request_output", state: "ready" },
    { id: "command.plan", version: "1.0.0", kind: "command", label: "plan", aliases: Object.freeze([]), intent: "request_plan", state: "ready" },
    { id: "command.work", version: "1.0.0", kind: "command", label: "work", aliases: Object.freeze([]), intent: "promote_to_work", state: "ready" },
    { id: "command.schedule", version: "1.0.0", kind: "command", label: "schedule", aliases: Object.freeze([]), intent: "schedule_automation", state: "approval_required", state_reason: "Automation creation requires runtime approval policy." },
  ];
  return Object.freeze([...agents, ...commands]);
}
