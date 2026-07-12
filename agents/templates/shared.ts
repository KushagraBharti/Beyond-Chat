import type { AgentConfig } from "../../packages/agent-registry/src/index.ts";
const EMPTY_SHA = `sha256:${"0".repeat(64)}` as const;
export function templateBase(name: string, category: string, instructions: string, packs: readonly string[], memory: readonly ("project" | "team")[]): AgentConfig {
  return Object.freeze({ name, description: instructions.split(".")[0] ?? instructions, category, instructions,
    model: { id: "model.policy.standard", version: "1.0.0", digest: EMPTY_SHA }, fallback_model: { id: "model.policy.fallback", version: "1.0.0", digest: EMPTY_SHA },
    skills: [], apps: [], mcp: [], knowledge_scopes: ["project"], memory_read_scopes: memory, memory_write_mode: "propose", tools: [],
    runtime: { image_digest: EMPTY_SHA, capability_packs: packs, network_allowlist: [], readable_paths: ["/workspace/input"], writable_paths: ["/workspace/output", "/workspace/tmp"], cpu: 2, memory_mb: 4096, wall_time_seconds: 1800 },
    budget: { max_cost_cents: 500, max_tokens: 100000, max_retries: 2, max_concurrency: 1 },
    evals: [{ id: `eval.${category}.smoke`, version: "1.0.0", threshold: 0.8, smoke_inputs: ["Create a bounded sample deliverable and explain which sources and tools were used."] }],
    output_templates: [{ id: "output-template.document.brief", version: "1.0.0", digest: EMPTY_SHA }], approval_policy_ref: "policy.approvals.consequential-ask.v1" });
}
