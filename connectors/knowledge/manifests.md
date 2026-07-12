# Offline connector manifest contract

The executable manifests are exported as `CONNECTOR_MANIFESTS` from
`@beyond/knowledge-plane`. Each has `schema_version: "1.0"`,
`transport: "offline_fake"`, `credentials: "not_present"`, and
`webhooks_are_wake_signals_only: true`. They are design-time declarations,
not connector configuration or evidence of a live integration.

| Source | Retrieval mode | Manifest authority | Phase 7A fake behavior | Phase 7B boundary |
|---|---|---|---|---|
| Google Drive | synced | connector | change-cursor replay and inherited ACL delta fixtures | Drive change log, shared-drive permissions, authoritative refetch |
| SharePoint/OneDrive | synced | connector | Graph-delta-shaped cursor and inherited ACL fixtures | Graph delta, notification wake-up, authoritative ACL refetch |
| Notion | synced | connector | page upsert and ACL refresh fixtures | webhook wake-up and authoritative page/permission refetch |
| Confluence | synced | connector | CQL-poll-shaped delta and inherited restriction fixtures | OAuth, CQL polling, restriction refetch |
| Glean | federated | federated | validates a current opaque actor assertion | source-owned permission decision at query time; no crawl |
| Databricks | live | governed_query | validates intent, surface, catalog, and schema | Unity Catalog/Genie/AI Search/function/MCP gateway; no raw SQL or table crawl |

All manifests declare `write: false`. A real connector must be introduced in
Phase 7B behind `ConnectorAdapter`, with backend-owned credential references,
source-specific retry/dead-letter policy, health/freshness metrics, and no
changes to these authorization or citation contracts.
