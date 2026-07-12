import type { OrganizationRole } from "../../lib/sessionClient";

/**
 * Mirror of the canonical five-role permission matrix. The backend is the only
 * authorization authority; this contract exists solely so the UI can decide
 * which controls to render. Parity with fixtures/phase2/role-permissions.json
 * is asserted by permissions.test.ts and by the backend policy tests, so the
 * two layers cannot drift apart silently.
 */
export type OrganizationPermission =
  | "view_organization"
  | "view_member_directory"
  | "view_member_lifecycle"
  | "invite_members"
  | "change_member_roles"
  | "suspend_members"
  | "revoke_members"
  | "restore_members"
  | "manage_organization_settings"
  | "build_agents"
  | "publish_agents"
  | "manage_knowledge_apps"
  | "execute_agent_work"
  | "view_shared_outputs"
  | "collaborate"
  | "access_admin_surfaces"
  | "manage_owner_lifecycle";

const viewer: readonly OrganizationPermission[] = [
  "view_organization",
  "view_member_directory",
  "view_shared_outputs",
];
const member: readonly OrganizationPermission[] = [...viewer, "execute_agent_work", "collaborate"];
const builder: readonly OrganizationPermission[] = [
  ...member,
  "build_agents",
  "publish_agents",
  "manage_knowledge_apps",
];
const admin: readonly OrganizationPermission[] = [
  ...builder,
  "view_member_lifecycle",
  "invite_members",
  "change_member_roles",
  "suspend_members",
  "revoke_members",
  "restore_members",
  "manage_organization_settings",
  "access_admin_surfaces",
];
const owner: readonly OrganizationPermission[] = [...admin, "manage_owner_lifecycle"];

export const ROLE_PERMISSIONS: Record<OrganizationRole, readonly OrganizationPermission[]> = {
  viewer,
  member,
  builder,
  admin,
  owner,
};

export interface PermissionSource {
  role?: OrganizationRole | string | null;
  permissions?: readonly string[];
}

/** Render-gating only — the backend re-checks every action. Prefers the
 * server-computed permission list from the session; unknown roles get nothing. */
export function hasPermission(
  source: PermissionSource | null | undefined,
  permission: OrganizationPermission,
): boolean {
  if (!source) return false;
  if (Array.isArray(source.permissions)) return source.permissions.includes(permission);
  const role = source.role as OrganizationRole | undefined;
  return role ? (ROLE_PERMISSIONS[role]?.includes(permission) ?? false) : false;
}
