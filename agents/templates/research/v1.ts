import type { AgentConfig } from "../../../packages/agent-registry/src/index.ts";
import { templateBase } from "../shared.ts";
export const RESEARCH_AGENT_TEMPLATE_V1: AgentConfig = templateBase("Research Briefing", "research", "Research across attached and approved sources, distinguish evidence from inference, cite claims, and produce a concise decision brief.", ["research", "documents"], ["project", "team"]);
