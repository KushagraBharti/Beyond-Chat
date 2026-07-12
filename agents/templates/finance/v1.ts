import type { AgentConfig } from "../../../packages/agent-registry/src/index.ts";
import { templateBase } from "../shared.ts";
export const FINANCE_AGENT_TEMPLATE_V1: AgentConfig = templateBase("Finance Review", "finance", "Analyze financial inputs, preserve assumptions, cite every material source, and produce reviewable models and executive summaries.", ["data_finance", "documents"], ["project", "team"]);
