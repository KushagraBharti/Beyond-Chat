import { sessionRequest, type OrganizationRole } from "../../lib/sessionClient";

export interface OrganizationSummary {
  id: string;
  workosOrganizationId: string;
  name: string;
  slug: string;
  role: OrganizationRole;
}

export interface Invitation {
  id: string;
  email: string;
  role: OrganizationRole;
  state: string;
  expires_at?: string;
}

export interface BulkInvitationResult {
  id: string;
  state: string;
  total_count: number;
  success_count: number;
  failure_count: number;
  entries: Array<{ email: string; role: OrganizationRole; invitation?: Invitation; error_message?: string }>;
}

export async function listOrganizations() {
  return sessionRequest<{ items: OrganizationSummary[] }>("/api/organizations");
}

export async function switchOrganization(organizationId: string) {
  return sessionRequest<{ organizationId: string; workosOrganizationId: string; role: OrganizationRole }>("/api/organizations/switch", {
    method: "POST",
    body: JSON.stringify({ organizationId }),
  });
}

export async function createInvitation(email: string, role: OrganizationRole) {
  return sessionRequest<Invitation>("/api/invitations", { method: "POST", body: JSON.stringify({ email, role }) });
}

export async function createBulkInvitations(invitations: Array<{ email: string; role: OrganizationRole }>) {
  return sessionRequest<BulkInvitationResult>("/api/invitations/bulk", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ invitations }),
  });
}

const BULK_ROLES: readonly OrganizationRole[] = ["viewer", "member", "builder", "admin", "owner"];

export interface BulkInvitationParseError {
  line: number;
  value: string;
  message: string;
}

export interface BulkInvitationParseResult {
  invitations: Array<{ email: string; role: OrganizationRole }>;
  errors: BulkInvitationParseError[];
}

export function parseBulkInvitations(
  source: string,
  { allowOwner = false }: { allowOwner?: boolean } = {},
): BulkInvitationParseResult {
  const invitations: Array<{ email: string; role: OrganizationRole }> = [];
  const errors: BulkInvitationParseError[] = [];
  const seen = new Set<string>();
  const nonempty = source.split(/\r?\n/).map((value, index) => ({ value, line: index + 1 })).filter(({ value }) => value.trim());
  if (nonempty.length > 50) {
    errors.push({ line: 51, value: String(nonempty.length), message: "A bulk invitation may contain at most 50 rows." });
  }
  for (const { value, line } of nonempty.slice(0, 50)) {
    const columns = value.split(",");
    if (columns.length > 2) {
      errors.push({ line, value: value.trim(), message: "Use exactly email,role on each row." });
      continue;
    }
    const email = (columns[0] ?? "").trim().toLowerCase();
    const roleValue = (columns[1] ?? "").trim().toLowerCase() || "member";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
      errors.push({ line, value: email || "(empty)", message: "Enter a valid email address." });
      continue;
    }
    if (!BULK_ROLES.includes(roleValue as OrganizationRole)) {
      errors.push({ line, value: roleValue || "(empty)", message: `Role must be one of: ${BULK_ROLES.join(", ")}.` });
      continue;
    }
    const role = roleValue as OrganizationRole;
    if (role === "owner" && !allowOwner) {
      errors.push({ line, value: role, message: "Only an owner can assign the owner role." });
      continue;
    }
    if (seen.has(email)) {
      errors.push({ line, value: email, message: "This email appears more than once." });
      continue;
    }
    seen.add(email);
    invitations.push({ email, role });
  }
  return { invitations, errors };
}

export async function revokeInvitation(invitationId: string) {
  return sessionRequest<void>(`/api/invitations/${encodeURIComponent(invitationId)}`, { method: "DELETE" });
}

export type MembershipState = "invited" | "active" | "suspended" | "revoked";

export interface MemberSummary {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUrl?: string | null;
  role: OrganizationRole;
  /** Lifecycle fields are only present for callers with view_member_lifecycle. */
  state?: MembershipState;
  joinedAt?: string | null;
  revokedAt?: string | null;
}

export interface InvitationSummary {
  id: string;
  email: string;
  role: OrganizationRole;
  state: string;
  expiresAt?: string | null;
}

interface PageQuery {
  status?: string[];
  cursor?: string;
  limit?: number;
}

function pageParams(query: PageQuery): string {
  const params = new URLSearchParams();
  for (const state of query.status ?? []) params.append("status", state);
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.limit) params.set("limit", String(query.limit));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export async function listMembers(organizationId: string, query: PageQuery = {}) {
  return sessionRequest<{ items: MemberSummary[]; nextCursor: string | null }>(
    `/api/organizations/${encodeURIComponent(organizationId)}/members${pageParams(query)}`,
  );
}

export async function listInvitations(organizationId: string, query: PageQuery = {}) {
  return sessionRequest<{ items: InvitationSummary[]; nextCursor: string | null }>(
    `/api/organizations/${encodeURIComponent(organizationId)}/invitations${pageParams(query)}`,
  );
}

function memberPath(organizationId: string, memberId: string, suffix = "") {
  return `/api/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberId)}${suffix}`;
}

export async function changeMemberRole(organizationId: string, memberId: string, role: OrganizationRole) {
  return sessionRequest<MemberSummary>(memberPath(organizationId, memberId), {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function suspendMember(organizationId: string, memberId: string) {
  return sessionRequest<MemberSummary>(memberPath(organizationId, memberId, "/suspend"), { method: "POST" });
}

export async function restoreMember(organizationId: string, memberId: string) {
  return sessionRequest<MemberSummary>(memberPath(organizationId, memberId, "/restore"), { method: "POST" });
}

export async function revokeMember(organizationId: string, memberId: string) {
  return sessionRequest<MemberSummary>(memberPath(organizationId, memberId), { method: "DELETE" });
}
