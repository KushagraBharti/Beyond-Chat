import type { CanonicalId } from "@beyond/contracts";

export const PRODUCT_CATALOG_SCHEMA_VERSION = "1.0" as const;
export type ProductCatalogSchemaVersion = typeof PRODUCT_CATALOG_SCHEMA_VERSION;

export type ProductId = `product.${string}`;
export type AgentId = `agent.${string}`;
export type CapabilityId = `capability.${string}`;
export type OutputTemplateId = `output-template.${string}`;
export type PolicyRef = `policy.${string}`;
export type CatalogVersion = `${number}.${number}.${number}`;

export type NavigationConcept =
  | "home" | "chat" | "work" | "projects" | "agents" | "knowledge_apps" | "automations" | "settings" | "admin";
export type ReferenceKind = "agent" | "skill" | "tool" | "app" | "mcp_tool" | "project" | "file" | "source" | "model" | "output_type" | "command";
export type OutputType = "document" | "spreadsheet" | "presentation" | "report" | "image" | "dataset" | "chart" | "research_bundle" | "export_bundle";
export type CapabilityPack = "core" | "documents" | "research" | "data_finance" | "image" | "automation";
export type ConnectionState = "ready" | "disabled" | "disconnected" | "approval_required" | "permission_denied";
export type DiscoveryIntentType = "browse" | "attach" | "invoke_agent" | "select_project" | "request_output" | "promote_to_work" | "request_plan" | "schedule_automation" | "choose_model";

export interface NavigationItem {
  readonly id: ProductId;
  readonly concept: NavigationConcept;
  readonly label: string;
  readonly aliases: readonly string[];
  readonly status: "primary" | "administrative";
}

export interface OutputTemplate {
  readonly id: OutputTemplateId;
  readonly version: CatalogVersion;
  readonly output_type: OutputType;
  readonly label: string;
  readonly required_capability_packs: readonly CapabilityPack[];
  readonly validation_policy_ref: PolicyRef;
}

export interface ProductCatalog {
  readonly schema_version: ProductCatalogSchemaVersion;
  readonly catalog_version: CatalogVersion;
  readonly navigation: readonly NavigationItem[];
  readonly reference_kinds: readonly ReferenceKind[];
  readonly output_templates: readonly OutputTemplate[];
  readonly capability_packs: Readonly<Record<CapabilityPack, readonly CapabilityId[]>>;
}

export interface AgentModelPolicy {
  readonly default_model_policy_slot: string;
  readonly fallback_model_policy_slot: string;
  readonly allowed_model_policy_ref: PolicyRef;
}

export interface AgentManifest {
  readonly schema_version: "1.0";
  readonly id: AgentId;
  readonly version: CatalogVersion;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly category: "built_in";
  readonly description: string;
  readonly model_policy: AgentModelPolicy;
  readonly allowed_capabilities: readonly CapabilityId[];
  readonly capability_packs: readonly CapabilityPack[];
  readonly output_templates: readonly OutputTemplateId[];
  readonly approval_policy_ref: PolicyRef;
  readonly risk_policy_ref: PolicyRef;
  readonly knowledge_scope: { readonly readable: readonly ("project" | "organization" | "attached_file" | "web")[]; readonly writable: false };
  readonly memory_scope: { readonly readable: readonly ("project" | "team")[]; readonly write_mode: "propose" | "disabled" };
  readonly credentials: "none";
  readonly status: "published";
  readonly dexter_parity?: { readonly status: "not_applicable" | "legacy_adapter_required"; readonly preserved: readonly string[] };
}

export interface DiscoveryItem {
  readonly id: string;
  readonly version: CatalogVersion;
  readonly kind: ReferenceKind;
  readonly label: string;
  readonly aliases: readonly string[];
  readonly intent: DiscoveryIntentType;
  readonly state: ConnectionState;
  readonly state_reason?: string;
  readonly scope?: { readonly organization_id?: CanonicalId<"org">; readonly project_id?: CanonicalId<"prj"> };
}

export interface KeyboardMetadata {
  readonly key: string;
  readonly aria_label: string;
  readonly shortcut_hint: "Enter" | "ArrowRight" | "Tab";
  readonly selection_behavior: "insert_chip" | "open_browser" | "request_approval" | "unavailable";
  readonly is_selectable: boolean;
}

export interface DiscoveryResult extends DiscoveryItem {
  readonly score: number;
  readonly keyboard: KeyboardMetadata;
}

export interface TypedIntent {
  readonly intent: DiscoveryIntentType;
  readonly reference_kind: ReferenceKind;
  readonly stable_id?: string;
  readonly raw: string;
  readonly state: ConnectionState;
  readonly ambiguity?: readonly string[];
}

export interface ParsedInvocation {
  readonly input: string;
  readonly intents: readonly TypedIntent[];
  readonly errors: readonly { readonly raw: string; readonly code: "unknown" | "ambiguous" | "invalid_reference" }[];
}
