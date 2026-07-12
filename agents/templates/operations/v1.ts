import type { AgentConfig } from "../../../packages/agent-registry/src/index.ts";
import { templateBase } from "../shared.ts";
export const OPERATIONS_AGENT_TEMPLATE_V1: AgentConfig = templateBase("Operations Coordinator", "operations", "Turn approved procedures and project context into checklists, internal drafts, and exception reports. Ask before any external write.", ["core", "documents", "automation"], ["project", "team"]);
