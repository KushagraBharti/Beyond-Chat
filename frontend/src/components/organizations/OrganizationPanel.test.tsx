import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authState, api } = vi.hoisted(() => ({
  authState: {
    session: null as unknown,
    refreshSession: vi.fn().mockResolvedValue(undefined),
  },
  api: {
    listOrganizations: vi.fn(),
    listMembers: vi.fn(),
    listInvitations: vi.fn(),
    switchOrganization: vi.fn(),
    createInvitation: vi.fn(),
    createBulkInvitations: vi.fn(),
    parseBulkInvitations: vi.fn((source: string) => {
      const [email, role = "member"] = source.split(",").map((value) => value.trim().toLowerCase());
      return ["viewer", "member", "builder", "admin", "owner"].includes(role)
        ? { invitations: email ? [{ email, role }] : [], errors: email ? [] : [{ line: 1, value: "(empty)", message: "Enter a valid email address." }] }
        : { invitations: [], errors: [{ line: 1, value: role, message: "Role must be one of: viewer, member, builder, admin, owner." }] };
    }),
    revokeInvitation: vi.fn(),
    changeMemberRole: vi.fn(),
    suspendMember: vi.fn(),
    restoreMember: vi.fn(),
    revokeMember: vi.fn(),
  },
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("../../features/organizations/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../features/organizations/api")>();
  return { ...original, ...api };
});

import { OrganizationPanel } from "./OrganizationPanel";

const OWNER_PERMISSIONS = [
  "view_organization",
  "view_member_directory",
  "view_member_lifecycle",
  "invite_members",
  "change_member_roles",
  "suspend_members",
  "revoke_members",
  "restore_members",
  "manage_organization_settings",
  "access_admin_surfaces",
  "manage_owner_lifecycle",
  "view_shared_outputs",
  "execute_agent_work",
  "collaborate",
  "build_agents",
  "publish_agents",
  "manage_knowledge_apps",
];

function ownerSession(overrides: Record<string, unknown> = {}) {
  return {
    profileId: "profile-owner",
    email: "owner@example.com",
    organizationId: "org-internal-1",
    workosOrganizationId: "org_workos_1",
    role: "owner",
    permissions: OWNER_PERMISSIONS,
    ...overrides,
  };
}

const members = [
  {
    id: "m-owner",
    displayName: "Owner One",
    email: "owner@example.com",
    role: "owner",
    state: "active",
  },
  {
    id: "m-member",
    displayName: "Member Two",
    email: "member@example.com",
    role: "member",
    state: "active",
  },
  {
    id: "m-suspended",
    displayName: "Suspended Three",
    email: "suspended@example.com",
    role: "viewer",
    state: "suspended",
  },
];

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  api.parseBulkInvitations.mockImplementation((source: string) => {
    const [email, role = "member"] = source.split(",").map((value) => value.trim().toLowerCase());
    return ["viewer", "member", "builder", "admin", "owner"].includes(role)
      ? { invitations: email ? [{ email, role }] : [], errors: email ? [] : [{ line: 1, value: "(empty)", message: "Enter a valid email address." }] }
      : { invitations: [], errors: [{ line: 1, value: role, message: "Role must be one of: viewer, member, builder, admin, owner." }] };
  });
  authState.session = ownerSession();
  api.listOrganizations.mockResolvedValue({
    items: [
      { id: "org-internal-1", workosOrganizationId: "org_workos_1", name: "Org One", slug: "org-one", role: "owner" },
      { id: "org-internal-2", workosOrganizationId: "org_workos_2", name: "Org Two", slug: "org-two", role: "viewer" },
    ],
  });
  api.listMembers.mockResolvedValue({ items: members, nextCursor: null });
  api.listInvitations.mockResolvedValue({
    items: [{ id: "inv-1", email: "pending@example.com", role: "member", state: "pending" }],
    nextCursor: null,
  });
  api.suspendMember.mockResolvedValue({ ...members[1], state: "suspended" });
  api.restoreMember.mockResolvedValue({ ...members[2], state: "active" });
  api.revokeMember.mockResolvedValue({ ...members[1], state: "revoked" });
  api.revokeInvitation.mockResolvedValue(undefined);
});

describe("OrganizationPanel", () => {
  it("renders the member directory with pending invitations for an admin view", async () => {
    render(<OrganizationPanel admin />);
    expect(await screen.findByText("Member Two")).toBeInTheDocument();
    expect(screen.getByText("pending@example.com")).toBeInTheDocument();
    expect(api.listMembers).toHaveBeenCalledWith("org-internal-1");
    expect(api.listInvitations).toHaveBeenCalledWith("org-internal-1", { status: ["pending"] });
  });

  it("requires confirmation before revoking a member and reloads after success", async () => {
    render(<OrganizationPanel admin />);
    const memberRow = (await screen.findByText("Member Two")).closest("li")!;
    const revoke = Array.from(memberRow.querySelectorAll("button")).find(
      (button) => button.textContent === "Revoke",
    )!;
    fireEvent.click(revoke);
    expect(api.revokeMember).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm revoke" }));
    await waitFor(() => expect(api.revokeMember).toHaveBeenCalledWith("org-internal-1", "m-member"));
    expect(api.listMembers.mock.calls.length).toBeGreaterThan(1);
  });

  it("disables lifecycle controls for the actor's own membership and shows the reason", async () => {
    render(<OrganizationPanel admin />);
    const ownRow = (await screen.findByText("Owner One")).closest("li")!;
    const suspend = Array.from(ownRow.querySelectorAll("button")).find(
      (button) => button.textContent === "Suspend",
    )!;
    expect(suspend).toBeDisabled();
    expect(suspend.title).toMatch(/your own membership/i);
  });

  it("shows a restore control for suspended members", async () => {
    render(<OrganizationPanel admin />);
    const suspendedRow = (await screen.findByText("Suspended Three")).closest("li")!;
    const restore = Array.from(suspendedRow.querySelectorAll("button")).find(
      (button) => button.textContent === "Restore",
    )!;
    fireEvent.click(restore);
    await waitFor(() => expect(api.restoreMember).toHaveBeenCalledWith("org-internal-1", "m-suspended"));
  });

  it("tells non-administrators the truth instead of rendering dead admin controls", async () => {
    authState.session = ownerSession({
      role: "member",
      permissions: ["view_organization", "view_member_directory", "view_shared_outputs"],
    });
    api.listMembers.mockResolvedValue({
      items: [{ id: "m-1", displayName: "Member Two", email: "member@example.com", role: "member" }],
      nextCursor: null,
    });
    render(<OrganizationPanel admin />);
    expect(await screen.findByText(/requires an administrative role/i)).toBeInTheDocument();
    expect(screen.queryByText("Invite one member")).not.toBeInTheDocument();
    expect(api.listInvitations).not.toHaveBeenCalled();
  });

  it("shows a truthful onboarding state when the user has no memberships", async () => {
    api.listOrganizations.mockResolvedValue({ items: [] });
    api.listMembers.mockResolvedValue({ items: [], nextCursor: null });
    api.listInvitations.mockResolvedValue({ items: [], nextCursor: null });
    render(<OrganizationPanel />);
    expect(await screen.findByText(/no active organization memberships/i)).toBeInTheDocument();
  });

  it("offers re-authentication when the session has ended", () => {
    authState.session = null;
    render(<OrganizationPanel />);
    expect(screen.getByRole("link", { name: /sign in again/i })).toBeInTheDocument();
  });

  it("switches organizations through the server and refreshes the session", async () => {
    api.switchOrganization.mockResolvedValue({
      organizationId: "org-internal-2",
      workosOrganizationId: "org_workos_2",
      role: "viewer",
    });
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    render(<OrganizationPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Switch" }));
    await waitFor(() => expect(api.switchOrganization).toHaveBeenCalledWith("org_workos_2"));
    await waitFor(() => expect(authState.refreshSession).toHaveBeenCalled());
    vi.unstubAllGlobals();
  });

  it("rejects an unknown bulk role instead of widening it to member", async () => {
    render(<OrganizationPanel admin />);
    await screen.findByText("Member Two");
    fireEvent.change(screen.getByPlaceholderText(/person@company.com/i), {
      target: { value: "person@example.com,viewerx" },
    });
    expect(screen.getByText(/line 1: role must be one of/i)).toHaveTextContent("viewerx");
    expect(screen.getByRole("button", { name: "Send bulk invitations" })).toBeDisabled();
    expect(api.createBulkInvitations).not.toHaveBeenCalled();
  });
});
