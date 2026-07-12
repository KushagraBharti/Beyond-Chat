import type { AgentManifest } from "../../../packages/product-catalog/src/types.ts";

export const FINANCE_AGENT_V1: AgentManifest = Object.freeze({
  schema_version: "1.0", id: "agent.finance", version: "1.0.0", name: "Finance", aliases: Object.freeze(["finance", "dexter"]),
  category: "built_in", description: "Evidence-backed financial analysis, filings, datasets, models, charts, spreadsheets, and memos.",
  model_policy: Object.freeze({ default_model_policy_slot: "model-policy.finance.default", fallback_model_policy_slot: "model-policy.finance.fallback", allowed_model_policy_ref: "policy.model.finance.v1" }),
  allowed_capabilities: Object.freeze(["capability.conversation", "capability.planning", "capability.file_read", "capability.finance_filings", "capability.financial_data", "capability.market_research", "capability.financial_modeling", "capability.data_analysis", "capability.chart_output", "capability.spreadsheet_output", "capability.citation_synthesis"]),
  capability_packs: Object.freeze(["core", "research", "data_finance", "documents"]),
  output_templates: Object.freeze(["output-template.spreadsheet.financial_model", "output-template.report.finance_memo", "output-template.chart.analysis"]),
  approval_policy_ref: "policy.approvals.finance.v1", risk_policy_ref: "policy.risk.finance.v1",
  knowledge_scope: Object.freeze({ readable: Object.freeze(["project", "organization", "attached_file", "web"]) as readonly ("project" | "organization" | "attached_file" | "web")[], writable: false }),
  memory_scope: Object.freeze({ readable: Object.freeze(["project", "team"]) as readonly ("project" | "team")[], write_mode: "propose" }), credentials: "none", status: "published",
  dexter_parity: Object.freeze({ status: "legacy_adapter_required", preserved: Object.freeze(["finance prompts", "filing and financial-data tools", "source extraction", "budgeting", "compaction tests", "tool traces"]) }),
} satisfies AgentManifest);
