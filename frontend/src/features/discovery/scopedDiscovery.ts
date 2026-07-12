import type { DiscoveryItem } from "@beyond/product-catalog";
import { discoveryItems } from "../workspace/adapter";
import type { OrganizationCatalog, ProductRecordSummary, ProjectSummary } from "../workspace/api";
import { recordTitle } from "../workspace/api";

/**
 * Builds the scoped half of the slash palette from real organization data:
 * the caller's projects and the organization capability catalog. Built-in
 * commands/agents come from the canonical catalog package. No entry is ever
 * fabricated, no credential or configuration payload is projected into
 * discovery, and duplicate aliases fail closed (the later alias is dropped).
 */

const SAFE_ALIAS = /^[a-z0-9][a-z0-9._-]{0,63}$/;

function recordState(state: string): { state: DiscoveryItem["state"]; reason?: string } {
  if (["active", "published", "ready", "approved"].includes(state)) return { state: "ready" };
  if (["disconnected", "revoked", "deleted", "unhealthy"].includes(state)) {
    return { state: "disconnected", reason: `Connection state: ${state.replaceAll("_", " ")}.` };
  }
  return { state: "unavailable", reason: `Catalog state: ${state.replaceAll("_", " ")}.` };
}

function recordAliases(record: ProductRecordSummary): string[] {
  const raw = record.payload["aliases"];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((alias): alias is string => typeof alias === "string")
    .map((alias) => alias.trim().toLowerCase())
    .filter((alias) => SAFE_ALIAS.test(alias));
}

function catalogItem(
  record: ProductRecordSummary,
  kind: DiscoveryItem["kind"],
  intent: DiscoveryItem["intent"],
): DiscoveryItem {
  const { state, reason } = recordState(record.state);
  return Object.freeze({
    id: record.id,
    version: String(record.version),
    kind,
    label: recordTitle(record),
    aliases: Object.freeze(recordAliases(record)),
    intent,
    state,
    ...(reason ? { state_reason: reason } : {}),
  }) as DiscoveryItem;
}

export function scopedDiscoveryItems(
  projects: readonly ProjectSummary[],
  catalog: OrganizationCatalog | null,
): readonly DiscoveryItem[] {
  const scoped: DiscoveryItem[] = [
    ...projects.map((project) =>
      Object.freeze({
        id: project.id,
        version: "1",
        kind: "project",
        label: project.name,
        aliases: Object.freeze(SAFE_ALIAS.test(project.slug) ? [project.slug] : []),
        intent: "select_project",
        state: "ready",
      }) as DiscoveryItem,
    ),
    ...(catalog?.skills ?? []).map((record) => catalogItem(record, "skill", "attach")),
    ...(catalog?.apps ?? []).map((record) => catalogItem(record, "app", "attach")),
    ...(catalog?.mcp_servers ?? []).map((record) => catalogItem(record, "mcp_tool", "attach")),
  ];

  // Duplicate aliases fail validation: the first claimant keeps the alias,
  // later ones lose it so an installed capability can never shadow another.
  const taken = new Set<string>();
  for (const item of discoveryItems) {
    for (const alias of item.aliases) taken.add(`${item.kind}:${alias}`);
  }
  const deduped = scoped.map((item) => {
    const kept = item.aliases.filter((alias) => {
      const key = `${item.kind}:${alias}`;
      if (taken.has(key)) return false;
      taken.add(key);
      return true;
    });
    return kept.length === item.aliases.length ? item : ({ ...item, aliases: Object.freeze(kept) } as DiscoveryItem);
  });

  return Object.freeze([...discoveryItems, ...deduped]);
}
