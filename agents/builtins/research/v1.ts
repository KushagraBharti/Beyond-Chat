import type { AgentManifest } from "../../../packages/product-catalog/src/types.ts";

export const RESEARCH_AGENT_V1: AgentManifest = Object.freeze({
  schema_version: "1.0", id: "agent.research", version: "1.0.0", name: "Research", aliases: Object.freeze(["research", "writing"]),
  category: "built_in", description: "Research and writing agent for evidence-led briefs, reports, editing, and presentations.",
  model_policy: Object.freeze({ default_model_policy_slot: "model-policy.research.default", fallback_model_policy_slot: "model-policy.research.fallback", allowed_model_policy_ref: "policy.model.research.v1" }),
  allowed_capabilities: Object.freeze(["capability.conversation", "capability.planning", "capability.file_read", "capability.knowledge_retrieval", "capability.web_research", "capability.citation_synthesis", "capability.document_output", "capability.presentation_output"]),
  capability_packs: Object.freeze(["core", "documents", "research"]),
  output_templates: Object.freeze(["output-template.document.cited_brief", "output-template.report.research", "output-template.presentation.research"]),
  approval_policy_ref: "policy.approvals.research.v1", risk_policy_ref: "policy.risk.research.v1",
  knowledge_scope: Object.freeze({ readable: Object.freeze(["project", "organization", "attached_file", "web"]) as readonly ("project" | "organization" | "attached_file" | "web")[], writable: false }),
  memory_scope: Object.freeze({ readable: Object.freeze(["project", "team"]) as readonly ("project" | "team")[], write_mode: "propose" }), credentials: "none", status: "published",
  dexter_parity: Object.freeze({ status: "not_applicable", preserved: Object.freeze([]) }),
} satisfies AgentManifest);
