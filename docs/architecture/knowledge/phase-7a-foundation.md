# Phase 7A knowledge-plane foundation

This is a schema-independent TypeScript foundation, not a live connector release. It owns the versioned contracts, offline connector manifests/fakes, deterministic engine, fixtures, evaluations, and read-only workspace health/source previews needed before Phase 7B persistence and jobs. There are no credentials, OAuth flows, SDKs, provider mutations, or live retrieval claims in this phase.

Every persisted contract carries `schema_version: "1.0"`: scopes/principals, connections/cursors/jobs, resources/revisions, ACL grants, extraction/chunk/embedding references, tombstones, citations, and retrieval audits. Runtime contract assertions reject unsupported versions, malformed opaque IDs, invalid timestamps, unsafe non-HTTPS source URLs, mutable revision aliases, and non-SHA-256 source digests. Source events are a strict union: `upsert` supplies immutable SHA-256 content and source metadata, `acl_refresh` replaces the effective grants for an already-ingested revision, and `deleted`/`lost_permission` tombstone the resource. Replayed `event_id` values are idempotent within their connection; cursors are retained as replay evidence, rather than being treated as the idempotency key. This prevents one provider connection's event identifier from suppressing an unrelated connection's event.

## Security model

Every retrieval resolves a current actor scope and checks the resource's organization, project, user, team, and external-group scopes. ACL principals support the same organization/project/user/team/external-group identities. It is deny-by-default: a matching explicit `allow` is required, any matching `deny` wins, and a different organization never matches. Filtering happens before lexical or vector scoring, and citation resolution repeats the ACL check.

Each retrieval record keeps the exact immutable revision and content digest. Citation metadata is captured from that revision—title, HTTPS URL, owner, source-observed timestamp, digest, and chunk—not from mutable resource metadata. A citation either resolves that exact accessible revision or returns an explicit `missing`, `revoked`, or `deleted` result; it never falls forward to a newer version. Tombstones immediately exclude documents from retrieval.

Source text is classified as clean, suspicious, or malicious. Excerpts are always marked `untrusted_source` and are never converted into system, developer, or tool instructions. Classification informs downstream policy; it cannot grant access.

## Connector boundary

`Google Drive`, `SharePoint/OneDrive`, `Notion`, and `Confluence` use the synced adapter contract: cursor replay, authoritative reconciliation, resource revisions, inherited ACL inputs, tombstones, read-only manifests, and deterministic offline fakes. An ACL refresh replaces—not appends to—the stored effective grants, so a removed allow cannot remain retrievable. A deletion that arrives before cursor replay creates only a tombstone, never a placeholder resource that could be retrieved. Successful reconciliation converts an absent known source into a `lost_permission` tombstone. Glean is federated and requires a current actor assertion. Databricks is live/governed and requires actor assertion, governed surface, catalog, and schema; its contract accepts a governed intent and explicitly rejects raw SQL. Neither is crawled as a document corpus.

Composio remains an OAuth/action boundary, not an ACL, knowledge, retrieval, citation, or orchestration authority.

## Determinism and audit

Hybrid score is `0.65 * lexical + 0.35 * cosine-vector`, after permission filtering. Stable ties order by resource then revision. Retrieval audit records candidate/permitted counts, component scores, citations, actor scope, and a canonical query digest. The current stable digest is an in-process correlation digest, not a cryptographic integrity primitive; Phase 7B must obtain immutable SHA-256 content digests from object storage/ingestion.

## Freshness targets and operations

Phase 7B target: permission loss/deletion must remove local retrieval eligibility within **5 minutes p95** of source observation and **15 minutes maximum** after a successful webhook wake-up or reconciliation detection. The foundation exports these as `REVOCATION_FRESHNESS_TARGET` and evaluates both thresholds. Track connector state, last successful sync, lag/freshness milliseconds, cursor age, retry/dead-letter counts, tombstone detection and application timestamps, reconciliation coverage, ACL refresh timestamps, and error code—not raw document content or credentials.

Connector health transitions are `pending → connected → degraded | reauth_required | disconnected → deleted`; sync transitions are `queued → running → succeeded`, with `retrying`, `failed`, `dead_letter`, and `cancelled` explicit. Webhooks only wake jobs: they must refetch source authority.

## Phase 7B integration plan

1. Map these contracts to canonical database tables with organization ID, foreign keys, RLS equivalence, immutable revision/digest uniqueness, version migration policy, and append-only retrieval audit/citation records.
2. Add durable jobs, cursor leases/replay, rate limits/backoff/dead letters, webhook authentication, reconciliation, and deletion work queues.
3. Implement direct source transports behind `ConnectorAdapter`; preserve provider IDs as secondary identifiers and store credentials only as backend-owned references. Validate source event shapes and SHA-256 digests before storage, issue ACL-only refreshes when source content is unchanged, and use webhooks only to wake an authoritative refetch.
4. Replace the current deterministic read-only health/access/citation previews with authenticated API-backed scope picking, connection and sync health, source drawer, access explanations, and citation resolution states.
5. Use an approved embedding provider only behind an embedding contract; no raw source corpus enters sandboxes. Add model/version and retention metadata before enabling it.

## Limitations

This foundation has in-memory sync state, simple lexical/vector scoring, heuristic content-risk classification, no database/RLS, no authenticated source transport, no durable queue, no real embeddings, and no rate limiting. Its UI is a deterministic read-only preview, not a live connector client. It is deliberately unsuitable for production until Phase 7B completes those integrations and validates the stated freshness target with source-backed tests. Nothing here claims a live Drive, Microsoft, Notion, Confluence, Glean, or Databricks connector.
