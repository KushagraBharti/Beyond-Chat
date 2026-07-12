import { beforeEach, describe, expect, it, vi } from "vitest";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../lib/sessionClient", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/sessionClient")>();
  return { ...original, sessionRequest: request };
});

import { createBulkInvitations, createInvitation, revokeInvitation, switchOrganization } from "./api";

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
});
