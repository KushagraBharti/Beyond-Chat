export type InstallationScope = "organization" | "project" | "user";
export type TrustLevel = "vendor" | "reviewed" | "untrusted" | "blocked";
export type SkillState = "candidate" | "review_required" | "installed" | "updated" | "rolled_back" | "rejected";
export interface SkillManifest {
  readonly schema_version: "1.0"; readonly id: `skill.${string}`; readonly version: `${number}.${number}.${number}`;
  readonly name: string; readonly description: string; readonly content_digest: `sha256:${string}`;
  readonly provenance: { readonly source: string; readonly publisher: string; readonly trust: TrustLevel; readonly reviewed_at?: string };
  readonly compatibility: { readonly runtime: readonly string[]; readonly agents: readonly string[] };
  readonly capability_requirements: readonly string[]; readonly resource_requirements: readonly string[];
  readonly tests: readonly string[]; readonly evals: readonly string[]; readonly agent_bindings: readonly string[];
}
export interface SkillInstallation { readonly installation_id: string; readonly skill_id: SkillManifest["id"]; readonly pinned_version: string; readonly manifest_digest: SkillManifest["content_digest"]; readonly scope: InstallationScope; readonly scope_id: string; readonly state: SkillState; readonly prior_version?: string; readonly audit: readonly SkillAudit[]; }
export interface SkillAudit { readonly at: string; readonly action: string; readonly actor_id: string; readonly detail?: string; }
export interface SkillDiscovery { readonly id: string; readonly version: string; readonly label: string; readonly aliases: readonly string[]; readonly intent: "browse" | "attach"; readonly state: "ready" | "review_required" | "unavailable"; readonly reason?: string; }
const semver = /^\d+\.\d+\.\d+$/;
export function assertSkillManifest(value: SkillManifest): SkillManifest {
  if (value.schema_version !== "1.0" || !/^skill\.[a-z0-9._-]+$/.test(value.id) || !semver.test(value.version) || !/^sha256:[a-f0-9]{64}$/.test(value.content_digest) || !value.name.trim() || !value.provenance.source || !value.provenance.publisher) throw new Error("invalid skill manifest");
  if (value.provenance.trust === "blocked") throw new Error("blocked skills cannot be installed");
  if (!value.compatibility.runtime.length || !value.tests.length || !value.evals.length) throw new Error("skill must declare compatibility, tests, and evals");
  return Object.freeze(value);
}
export async function contentDigest(content: unknown): Promise<`sha256:${string}`> {
  const stable = JSON.stringify(sort(content)); const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stable));
  return `sha256:${[...new Uint8Array(bytes)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
function sort(value: unknown): unknown { if (Array.isArray(value)) return value.map(sort); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sort(v)])); return value; }
export function transitionInstallation(current: SkillInstallation | undefined, action: "install" | "approve" | "update" | "rollback" | "reject", manifest: SkillManifest, actor_id: string, at: string): SkillInstallation {
  assertSkillManifest(manifest); if (!current && action !== "install") throw new Error("install required");
  if (current && current.skill_id !== manifest.id) throw new Error("skill identity mismatch");
  if (current && current.pinned_version === manifest.version && current.manifest_digest !== manifest.content_digest) throw new Error("published skill versions are immutable");
  const state = action === "install" ? (manifest.provenance.trust === "untrusted" ? "review_required" : "installed") : action === "approve" ? "installed" : action === "update" ? "updated" : action === "rollback" ? "rolled_back" : "rejected";
  if (current?.state === "rejected") throw new Error("rejected install is immutable");
  if ((action === "approve" || action === "update" || action === "rollback") && current?.state === "review_required" && action !== "approve") throw new Error("review required");
  return Object.freeze({ installation_id: current?.installation_id ?? `install.${manifest.id}.${manifest.version}`, skill_id: manifest.id, pinned_version: action === "rollback" ? (current?.prior_version ?? current!.pinned_version) : manifest.version, manifest_digest: manifest.content_digest, scope: current?.scope ?? "user", scope_id: current?.scope_id ?? actor_id, state, prior_version: action === "update" ? current?.pinned_version : current?.prior_version, audit: Object.freeze([...(current?.audit ?? []), { at, actor_id, action, detail: manifest.content_digest }]) });
}
export function skillDiscovery(manifests: readonly SkillManifest[], installed: readonly SkillInstallation[]): readonly SkillDiscovery[] { return Object.freeze(manifests.map((m): SkillDiscovery => { const install = installed.find((i) => i.skill_id === m.id && i.pinned_version === m.version); const review = m.provenance.trust === "untrusted" || install?.state === "review_required"; return { id: m.id, version: m.version, label: m.name, aliases: Object.freeze([m.name.toLowerCase().replaceAll(" ", "-")]), intent: "attach", state: install?.state === "installed" ? "ready" : review ? "review_required" : "unavailable", reason: review ? "Trust review required before attachment." : "Not installed at this scope." }; })); }
