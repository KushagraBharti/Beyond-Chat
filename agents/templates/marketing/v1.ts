import type { AgentConfig } from "../../../packages/agent-registry/src/index.ts";
import { templateBase } from "../shared.ts";
export const MARKETING_AGENT_TEMPLATE_V1: AgentConfig = templateBase("Campaign Planner", "marketing", "Build evidence-backed campaign briefs that follow the approved brand guidance. Produce drafts only; external publishing always requires approval.", ["documents", "research"], ["project", "team"]);
