import { beforeEach, describe, expect, it, vi } from "vitest";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../lib/sessionClient", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/sessionClient")>();
  return { ...original, sessionRequest: request };
});

import {
  changeMemberRole,
  createBulkInvitations,
  createInvitation,
  listInvitations,
  listMembers,
  parseBulkInvitations,
  restoreMember,
  revokeInvitation,
  revokeMember,
  suspendMember,
  switchOrganization,
} from "./api";

describe("organization API", () => {
  beforeEach(() => request.mockReset().mockResolvedValue({}));

  it("switches with the provider organization id", async () => {
    await switchOrganization("org_workos_2");
    expect(request).toHaveBeenCalledWith("/api/organizations/switch", expect.objectContaining({ method: "POST", body: JSON.stringify({ organizationId: "org_workos_2" }) }));
  });

  it("creates single and bulk invitations and can revoke a returned local id", async () => {
    await createInvitation("member@example.com", "member");
    await createBulkInvitations([{ email: "admin@example.com", role: "admin" }]);
    await revokeInvitation("invitation/local id");
    expect(request.mock.calls[0][0]).toBe("/api/invitations");
    expect(new Headers(request.mock.calls[1][1].headers).get("Idempotency-Key")).toBeTruthy();
    expect(request.mock.calls[2]).toEqual(["/api/invitations/invitation%2Flocal%20id", { method: "DELETE" }]);
  });

  it("lists members and pending invitations with status filters", async () => {
    await listMembers("org-internal-1", { status: ["active", "suspended"], limit: 50 });
    await listInvitations("org-internal-1", { status: ["pending"] });
    expect(request.mock.calls[0][0]).toBe(
      "/api/organizations/org-internal-1/members?status=active&status=suspended&limit=50",
    );
    expect(request.mock.calls[1][0]).toBe("/api/organizations/org-internal-1/invitations?status=pending");
  });

  it("issues member lifecycle mutations against the selected organization", async () => {
    await changeMemberRole("org-internal-1", "member-1", "builder");
    await suspendMember("org-internal-1", "member-1");
    await restoreMember("org-internal-1", "member-1");
    await revokeMember("org-internal-1", "member-1");
    expect(request.mock.calls[0]).toEqual([
      "/api/organizations/org-internal-1/members/member-1",
      { method: "PATCH", body: JSON.stringify({ role: "builder" }) },
    ]);
    expect(request.mock.calls[1][0]).toBe("/api/organizations/org-internal-1/members/member-1/suspend");
    expect(request.mock.calls[2][0]).toBe("/api/organizations/org-internal-1/members/member-1/restore");
    expect(request.mock.calls[3]).toEqual([
      "/api/organizations/org-internal-1/members/member-1",
      { method: "DELETE" },
    ]);
  });
});

describe("bulk invitation parser", () => {
  it("normalizes casing and whitespace while documenting the blank-role default", () => {
    expect(parseBulkInvitations("  Person@Example.COM , BUILDER\nother@example.com, ")).toEqual({
      invitations: [
        { email: "person@example.com", role: "builder" },
        { email: "other@example.com", role: "member" },
      ],
      errors: [],
    });
  });

  it.each([
    ["person@example.com,viewerx", "viewerx", /role must be one of/i],
    [",member", "(empty)", /valid email/i],
    ["not-an-email,member", "not-an-email", /valid email/i],
    ["person@example.com,member,extra", "person@example.com,member,extra", /exactly email,role/i],
  ])("rejects malformed row %s without widening access", (row, value, message) => {
    const result = parseBulkInvitations(row);
    expect(result.invitations).toEqual([]);
    expect(result.errors[0]).toMatchObject({ line: 1, value });
    expect(result.errors[0].message).toMatch(message);
  });

  it("rejects duplicates, excess rows, and unauthorized owner assignment", () => {
    const duplicates = parseBulkInvitations("same@example.com,member\nsame@example.com,viewer");
    expect(duplicates.invitations).toHaveLength(1);
    expect(duplicates.errors[0]).toMatchObject({ line: 2, value: "same@example.com" });

    const excess = parseBulkInvitations(
      Array.from({ length: 51 }, (_, index) => `person${index}@example.com,member`).join("\n"),
    );
    expect(excess.invitations).toHaveLength(50);
    expect(excess.errors).toContainEqual(expect.objectContaining({ line: 51 }));

    expect(parseBulkInvitations("owner@example.com,owner").errors[0].message).toMatch(/only an owner/i);
    expect(parseBulkInvitations("owner@example.com,owner", { allowOwner: true }).errors).toEqual([]);
  });
});
