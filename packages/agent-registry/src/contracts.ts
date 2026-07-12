export const AGENT_REGISTRY_SCHEMA_VERSION = "1.0" as const;

export type Role = "owner" | "admin" | "builder" | "member" | "viewer";
export type Audience = "private" | "team" | "selected_groups" | "organization_directory" | "organization_link" | "automation";
export type AgentState = "draft" | "published" | "deprecated" | "archived";
export type ValidationDomain = "instructions" | "model" | "skills" | "apps" | "mcp" | "knowledge" | "memory" | "runtime" | "policy" | "budget" | "evals" | "outputs";
export type ValidationSeverity = "error" | "warning";

export interface Actor { readonly id: string; readonly organization_id: string; readonly role: Role; readonly team_ids: readonly string[]; readonly group_ids: readonly string[]; }
export interface VersionRef { readonly id: string; readonly version: string; readonly digest: `sha256:${string}`; }
export interface ToolBinding extends VersionRef { readonly risk: "read" | "write" | "destructive" | "financial_regulated" | "admin"; readonly decision: "allow" | "ask" | "deny"; }
export interface RuntimeConfig { readonly image_digest: `sha256:${string}`; readonly capability_packs: readonly string[]; readonly network_allowlist: readonly string[]; readonly readable_paths: readonly string[]; readonly writable_paths: readonly string[]; readonly cpu: number; readonly memory_mb: number; readonly wall_time_seconds: number; }
export interface BudgetConfig { readonly max_cost_cents: number; readonly max_tokens: number; readonly max_retries: number; readonly max_concurrency: number; }
export interface EvalBinding { readonly id: string; readonly version: string; readonly threshold: number; readonly smoke_inputs: readonly string[]; }
export interface AgentConfig {
  readonly name: string; readonly description: string; readonly category: string; readonly instructions: string;
  readonly model: VersionRef; readonly fallback_model?: VersionRef;
  readonly skills: readonly VersionRef[]; readonly apps: readonly VersionRef[]; readonly mcp: readonly VersionRef[];
  readonly knowledge_scopes: readonly string[]; readonly memory_read_scopes: readonly ("user" | "project" | "team")[];
  readonly memory_write_mode: "disabled" | "propose"; readonly tools: readonly ToolBinding[];
  readonly runtime: RuntimeConfig; readonly budget: BudgetConfig; readonly evals: readonly EvalBinding[];
  readonly output_templates: readonly VersionRef[]; readonly approval_policy_ref: string;
}
export interface MutableAgentDraft { readonly id: string; readonly agent_id: string; readonly organization_id: string; readonly owner_id: string; readonly revision: number; readonly state: "draft"; readonly config: AgentConfig; readonly updated_at: string; }
export interface ValidationIssue { readonly domain: ValidationDomain; readonly code: string; readonly severity: ValidationSeverity; readonly message: string; readonly subject?: string; }
export interface EvalResult { readonly eval_id: string; readonly version: string; readonly score: number; readonly passed: boolean; readonly evidence_ref: string; }
export interface ValidationReport { readonly id: string; readonly draft_id: string; readonly draft_revision: number; readonly dependency_digest: `sha256:${string}`; readonly config_digest: `sha256:${string}`; readonly issues: readonly ValidationIssue[]; readonly eval_results: readonly EvalResult[]; readonly passed: boolean; readonly validated_at: string; }
export interface AgentVersion { readonly id: string; readonly agent_id: string; readonly organization_id: string; readonly ordinal: number; readonly state: "published" | "deprecated"; readonly config: AgentConfig; readonly content_hash: `sha256:${string}`; readonly dependency_digest: `sha256:${string}`; readonly publisher_id: string; readonly validation_report_id: string; readonly release_notes: string; readonly created_at: string; readonly deprecated_at?: string; }
export interface DeploymentTarget { readonly audience: Audience; readonly audience_ids: readonly string[]; }
export interface Deployment { readonly id: string; readonly agent_id: string; readonly organization_id: string; readonly target: DeploymentTarget; readonly active_version_id: string; readonly revision: number; readonly updated_by: string; readonly updated_at: string; }
export interface PublicationRequest { readonly id: string; readonly draft_id: string; readonly requester_id: string; readonly status: "pending" | "approved" | "denied"; readonly decided_by?: string; readonly decided_at?: string; }
export interface AgentRecord { readonly id: string; readonly organization_id: string; readonly owner_id: string; readonly state: AgentState; readonly created_at: string; }
export interface DirectoryEntry { readonly agent: AgentRecord; readonly version: AgentVersion; readonly deployment: Deployment; readonly favorite: boolean; readonly runs: number; readonly unique_users: number; readonly last_used_at?: string; }
export interface RunAgentResolution { readonly agent_id: string; readonly agent_version_id: string; readonly content_hash: `sha256:${string}`; readonly deployment_id: string; readonly deployment_revision: number; readonly effective_config: AgentConfig; readonly resolved_at: string; }

export interface DependencySnapshot { readonly domain: Exclude<ValidationDomain, "instructions" | "budget" | "evals" | "outputs">; readonly refs: readonly VersionRef[]; readonly unavailable: readonly string[]; readonly policy_errors: readonly string[]; }
export interface AgentCatalogPort { resolve(config: AgentConfig, actor: Actor): Promise<readonly DependencySnapshot[]>; }
export interface EvalRunnerPort { run(config: AgentConfig, actor: Actor): Promise<readonly EvalResult[]>; }
export interface AgentRegistryPersistencePort {
  createAgent(record: AgentRecord, draft: MutableAgentDraft): Promise<void>; getAgent(id: string): Promise<AgentRecord | undefined>;
  getDraft(id: string): Promise<MutableAgentDraft | undefined>; saveDraft(draft: MutableAgentDraft, expected_revision: number): Promise<void>;
  saveReport(report: ValidationReport): Promise<void>; getReport(id: string): Promise<ValidationReport | undefined>;
  saveVersion(version: AgentVersion): Promise<void>; getVersion(id: string): Promise<AgentVersion | undefined>; listVersions(agent_id: string): Promise<readonly AgentVersion[]>;
  getDeployment(id: string): Promise<Deployment | undefined>; saveDeployment(deployment: Deployment, expected_revision?: number): Promise<void>; listDeployments(agent_id?: string): Promise<readonly Deployment[]>;
  savePublicationRequest(request: PublicationRequest): Promise<void>; getPublicationRequest(id: string): Promise<PublicationRequest | undefined>;
  setFavorite(actor_id: string, agent_id: string, value: boolean): Promise<void>; isFavorite(actor_id: string, agent_id: string): Promise<boolean>;
  recordUsage(version_id: string, actor_id: string, at: string): Promise<void>; usage(version_id: string): Promise<{ runs: number; unique_users: number; last_used_at?: string }>;
  listAgents(organization_id: string): Promise<readonly AgentRecord[]>;
}
export interface AgentRuntimeResolutionPort { resolveForRun(deployment_id: string, actor: Actor, at: string): Promise<RunAgentResolution>; }
