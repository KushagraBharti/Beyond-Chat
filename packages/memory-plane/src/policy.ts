import type { MemoryActor, MemoryEntry, MemoryPolicy, MemoryScope, MemorySpace, Sensitivity } from "./contracts.ts";

export class MemoryPolicyError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; this.name = "MemoryPolicyError"; }
}

export function assertScopeShape(scope: MemoryScope): void {
  if (!scope.organization_id || !scope.owner_id) throw new MemoryPolicyError("scope.invalid", "Memory scope requires organization and owner");
  if (scope.kind === "project" && !scope.project_id) throw new MemoryPolicyError("scope.invalid", "Project memory requires project_id");
  if (scope.kind === "team" && !scope.team_id) throw new MemoryPolicyError("scope.invalid", "Team memory requires team_id");
  if (scope.kind === "user" && (scope.project_id || scope.team_id)) throw new MemoryPolicyError("scope.invalid", "User memory cannot carry project or team scope");
}

export function canAccessSpace(actor: MemoryActor, space: MemorySpace, policy: MemoryPolicy): { allowed: boolean; reason: string } {
  if (actor.organization_id !== space.scope.organization_id) return { allowed: false, reason: "organization_mismatch" };
  if (!space.enabled) return { allowed: false, reason: "space_disabled" };
  if (space.scope.kind === "user") {
    if (actor.user_id !== space.scope.owner_id) return { allowed: false, reason: "personal_owner_mismatch" };
    if (actor.agent_audience === "shared" && !actor.attached_personal_space_ids.includes(space.id)) return { allowed: false, reason: "personal_memory_not_attached" };
    return { allowed: true, reason: actor.agent_audience === "shared" ? "explicit_personal_attachment" : "personal_owner" };
  }
  if (space.scope.kind === "project") return actor.project_id === space.scope.project_id ? { allowed: true, reason: "project_match" } : { allowed: false, reason: "project_mismatch" };
  if (!policy.team_memory_enabled) return { allowed: false, reason: "team_memory_gated" };
  return actor.team_ids.includes(space.scope.team_id ?? "") ? { allowed: true, reason: "team_membership" } : { allowed: false, reason: "team_mismatch" };
}

export function sensitivityAllowed(value: Sensitivity, policy: MemoryPolicy): boolean {
  return value === "normal" || (value === "sensitive" && policy.allow_sensitive_memory) || (value === "restricted" && policy.allow_restricted_memory);
}

export function isExpired(entry: MemoryEntry, now: string, policy: MemoryPolicy): boolean {
  if (entry.expires_at && Date.parse(entry.expires_at) <= Date.parse(now)) return true;
  if (policy.max_recall_age_days === null) return false;
  return Date.parse(entry.updated_at) + policy.max_recall_age_days * 86_400_000 <= Date.parse(now);
}
