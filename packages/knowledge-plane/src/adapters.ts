import type { ConnectorAdapter, ConnectorDefinition, OfflineConnectorManifest, SourceDelta, SyncCursor } from "./contracts.ts";
import { assertFederatedQuery, assertGovernedQuery } from "./validation.ts";

function definition(kind: ConnectorDefinition["kind"], retrieval_mode: ConnectorDefinition["retrieval_mode"], inherited_acls: boolean): ConnectorDefinition {
  return Object.freeze({ schema_version: "1.0", id: `connector.${kind}`, kind, retrieval_mode, version: "1.0.0", supports: Object.freeze({ incremental_sync: retrieval_mode === "synced", reconciliation: retrieval_mode === "synced", inherited_acls, write: false }) });
}
/** Deterministic no-network adapter for contract tests and local Phase 7B integration work. */
export function createOfflineAdapter(connector: ConnectorDefinition, fixture: readonly SourceDelta[] = []): ConnectorAdapter {
  const ordered = Object.freeze([...fixture]);
  return Object.freeze({
    definition: connector,
    enumerate: async function* (cursor: SyncCursor | null): AsyncIterable<SourceDelta> {
      const start = cursor ? ordered.findIndex((event) => event.cursor === cursor.value) + 1 : 0;
      yield* ordered.slice(Math.max(0, start));
    },
    reconcile: async function* (): AsyncIterable<SourceDelta> { yield* ordered; },
  });
}

function manifest(definition: ConnectorDefinition, source_authority: OfflineConnectorManifest["source_authority"]): OfflineConnectorManifest {
  return Object.freeze({ schema_version: "1.0", definition, transport: "offline_fake", source_authority, webhooks_are_wake_signals_only: true, credentials: "not_present" });
}

export const CONNECTOR_MANIFESTS = Object.freeze({
  googleDrive: manifest(definition("google_drive", "synced", true), "connector"),
  sharePointOneDrive: manifest(definition("sharepoint_onedrive", "synced", true), "connector"),
  notion: manifest(definition("notion", "synced", false), "connector"),
  confluence: manifest(definition("confluence", "synced", true), "connector"),
  glean: manifest(definition("glean", "federated", false), "federated"),
  databricks: manifest(definition("databricks", "live", false), "governed_query"),
});

export { assertFederatedQuery, assertGovernedQuery };
