import type { AgentManifest } from "../../../packages/product-catalog/src/types.ts";

export const GENERAL_AGENT_V1: AgentManifest = Object.freeze({
  schema_version: "1.0", id: "agent.general", version: "1.0.0", name: "General", aliases: Object.freeze(["general", "default"]),
  category: "built_in", description: "Default all-purpose agent for safe conversation, files, code-assisted work, documents, and outputs.",
  model_policy: Object.freeze({ default_model_policy_slot: "model-policy.general.default", fallback_model_policy_slot: "model-policy.general.fallback", allowed_model_policy_ref: "policy.model.general.v1" }),
  allowed_capabilities: Object.freeze(["capability.conversation", "capability.planning", "capability.file_read", "capability.code_assisted", "capability.document_output", "capability.data_analysis", "capability.image_output", "capability.automation_setup"]),
  capability_packs: Object.freeze(["core", "documents", "image", "automation"]),
  output_templates: Object.freeze(["output-template.document.brief", "output-template.image.generated", "output-template.report.general"]),
  approval_policy_ref: "policy.approvals.general.v1", risk_policy_ref: "policy.risk.general.v1",
  knowledge_scope: Object.freeze({ readable: Object.freeze(["project", "organization", "attached_file"]) as readonly ("project" | "organization" | "attached_file" | "web")[], writable: false }),
  memory_scope: Object.freeze({ readable: Object.freeze(["project", "team"]) as readonly ("project" | "team")[], write_mode: "propose" }), credentials: "none", status: "published",
  dexter_parity: Object.freeze({ status: "not_applicable", preserved: Object.freeze([]) }),
} satisfies AgentManifest);
