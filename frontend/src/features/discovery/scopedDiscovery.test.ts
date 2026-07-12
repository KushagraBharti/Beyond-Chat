import { describe, expect, it } from "vitest";
import { queryDiscovery } from "@beyond/product-catalog";
import { discoveryItems } from "../workspace/adapter";
import type { OrganizationCatalog, ProductRecordSummary, ProjectSummary } from "../workspace/api";
import { scopedDiscoveryItems } from "./scopedDiscovery";

function project(id: string, name: string, slug: string): ProjectSummary {
  return { id, organizationId: "org-a", name, slug, description: null, visibility: "organization", createdBy: "p", createdAt: null, updatedAt: null };
}

function record(id: string, name: string, state: string, extra: Record<string, unknown> = {}): ProductRecordSummary {
  return {
    id, kind: "skill", state, version: 1,
    scope: { organization_id: "org-a", project_id: null, team_id: null },
    payload: { name, ...extra }, created_by: "p",
    created_at: "2026-07-12T00:00:00Z", updated_at: "2026-07-12T00:00:00Z",
  };
}

function catalog(overrides: Partial<OrganizationCatalog> = {}): OrganizationCatalog {
  return { built_in_agents: [], skills: [], tools: [], apps: [], mcp_servers: [], ...overrides };
}

describe("scopedDiscoveryItems", () => {
  it("includes built-ins plus real projects addressable by slug alias", () => {
    const items = scopedDiscoveryItems([project("proj-1", "Market entry", "market-entry")], null);
    const [top] = queryDiscovery(items, "/market-entry");
    expect(top).toMatchObject({ id: "proj-1", kind: "project", state: "ready" });
    expect(items.length).toBe(discoveryItems.length + 1);
  });

  it("maps catalog record states truthfully instead of defaulting to ready", () => {
    const items = scopedDiscoveryItems([], catalog({
      skills: [record("s1", "Cited research", "active")],
      apps: [record("a1", "Notion", "revoked")].map((r) => ({ ...r, kind: "app" })),
      mcp_servers: [record("m1", "Databricks", "pending_review")].map((r) => ({ ...r, kind: "mcp_server" })),
    }));
    expect(items.find((item) => item.id === "s1")).toMatchObject({ state: "ready", kind: "skill" });
    const revoked = items.find((item) => item.id === "a1");
    expect(revoked).toMatchObject({ state: "disconnected" });
    expect(revoked?.state_reason).toMatch(/revoked/);
    const pending = items.find((item) => item.id === "m1");
    expect(pending).toMatchObject({ state: "unavailable", kind: "mcp_tool" });
  });

  it("drops duplicate aliases so a later item cannot shadow an earlier one", () => {
    const items = scopedDiscoveryItems([], catalog({
      skills: [
        record("s1", "First skill", "active", { aliases: ["frontend-design"] }),
        record("s2", "Impostor skill", "active", { aliases: ["frontend-design", "impostor"] }),
      ],
    }));
    expect(items.find((item) => item.id === "s1")?.aliases).toContain("frontend-design");
    const impostor = items.find((item) => item.id === "s2");
    expect(impostor?.aliases).not.toContain("frontend-design");
    expect(impostor?.aliases).toContain("impostor");
  });

  it("never projects payload configuration or secret-shaped fields into discovery", () => {
    const items = scopedDiscoveryItems([], catalog({
      apps: [record("a1", "Drive", "active", {
        configuration: { api_key: "sk_live_never_show" },
        credential: "secret-ref",
      })].map((r) => ({ ...r, kind: "app" })),
    }));
    const serialized = JSON.stringify(items.find((item) => item.id === "a1"));
    expect(serialized).not.toContain("sk_live_never_show");
    expect(serialized).not.toContain("secret-ref");
    expect(serialized).not.toContain("configuration");
  });

  it("rejects malformed aliases instead of widening the grammar", () => {
    const items = scopedDiscoveryItems([], catalog({
      skills: [record("s1", "Weird", "active", { aliases: ["UPPER CASE", "ok-alias", 42, "/slash"] })],
    }));
    expect(items.find((item) => item.id === "s1")?.aliases).toEqual(["ok-alias"]);
  });
});
