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

export async function revokeInvitation(invitationId: string) {
  return sessionRequest<void>(`/api/invitations/${encodeURIComponent(invitationId)}`, { method: "DELETE" });
}
