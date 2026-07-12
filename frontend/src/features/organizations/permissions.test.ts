import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hasPermission, ROLE_PERMISSIONS } from "./permissions";

// Vitest runs with frontend/ as the working directory; the canonical fixture
// lives at the repository root so backend and frontend assert the same file.
const fixturePath = resolve(process.cwd(), "..", "fixtures", "phase2", "role-permissions.json");

describe("organization permission contract", () => {
  it("matches the canonical shared fixture exactly", () => {
    const fixture = JSON.parse(readFileSync(fixturePath, "utf-8")) as {
      roles: Record<string, string[]>;
    };
    const local = Object.fromEntries(
      Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => [role, [...permissions].sort()]),
    );
    const canonical = Object.fromEntries(
      Object.entries(fixture.roles).map(([role, permissions]) => [role, [...permissions].sort()]),
    );
    expect(local).toEqual(canonical);
  });

  it("prefers the server-computed permission list over the local matrix", () => {
    expect(hasPermission({ role: "viewer", permissions: ["revoke_members"] }, "revoke_members")).toBe(true);
    expect(hasPermission({ role: "owner", permissions: [] }, "revoke_members")).toBe(false);
  });

  it("fails closed for unknown or missing roles", () => {
    expect(hasPermission({ role: "superuser" }, "view_organization")).toBe(false);
    expect(hasPermission(null, "view_organization")).toBe(false);
    expect(hasPermission({ role: "viewer" }, "revoke_members")).toBe(false);
    expect(hasPermission({ role: "admin" }, "revoke_members")).toBe(true);
  });
});
