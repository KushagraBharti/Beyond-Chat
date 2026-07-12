# Knowledge connector manifests

This directory intentionally contains no OAuth code, tokens, provider SDKs, or live transports. The adapter contracts and offline manifests live in `@beyond/knowledge-plane`; see [manifests.md](manifests.md) for their exact offline scope. Phase 7B must implement each transport behind those contracts.

| Connector | Mode | Authority | Required future transport behavior |
|---|---|---|---|
| Google Drive | synced | Drive permissions | change-log replay, shared-drive ACL inheritance, reconciliation |
| SharePoint/OneDrive | synced | Microsoft Graph permissions | delta replay, notification wake-up/refetch, inherited ACLs |
| Notion | synced | Notion page access | webhook wake-up/refetch and page ACL refresh |
| Confluence | synced | Confluence restrictions | CQL polling and inherited restriction refresh |
| Glean | federated | Glean at query time | current-user assertion and source permission decision |
| Databricks | live | Unity Catalog/governed query | current-user assertion, governed intent plus catalog/schema/surface; never crawl tables or accept raw SQL |

All write capabilities are deliberately `false`. The current adapters are deterministic offline fakes only: they accept fixture events and make no network request. Phase 7B must add authenticated source transports, authoritative webhook refetches, source-specific backoff/dead-letter policy, and freshness instrumentation without changing the contract boundary. Composio is not a knowledge ACL, retrieval, or citation provider.
