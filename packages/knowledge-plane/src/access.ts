import type { AccessGrant, Scope } from "./contracts.ts";

function contains(values: readonly string[] | undefined, id: string): boolean { return values?.includes(id) ?? false; }
function grantMatches(actor: Scope, grant: AccessGrant): boolean {
  if (grant.principal_kind === "organization") return actor.organization_id === grant.principal_id;
  if (grant.principal_kind === "project") return actor.project_id === grant.principal_id;
  if (grant.principal_kind === "user") return actor.user_id === grant.principal_id;
  if (grant.principal_kind === "team") return contains(actor.team_ids, grant.principal_id);
  return contains(actor.external_group_ids, grant.principal_id);
}

/** Deny wins. A resource is inaccessible unless its org/scope match and an explicit grant allows it. */
export function canRead(actor: Scope, resource: Scope, grants: readonly AccessGrant[]): boolean {
  if (!actor.organization_id || actor.organization_id !== resource.organization_id) return false;
  if (resource.project_id && actor.project_id !== resource.project_id) return false;
  if (resource.user_id && actor.user_id !== resource.user_id) return false;
  if (resource.team_ids?.length && !resource.team_ids.some((id) => contains(actor.team_ids, id))) return false;
  if (resource.external_group_ids?.length && !resource.external_group_ids.some((id) => contains(actor.external_group_ids, id))) return false;
  const matching = grants.filter((grant) => grantMatches(actor, grant));
  if (matching.some((grant) => grant.effect === "deny")) return false;
  return matching.some((grant) => grant.effect === "allow");
}
