import { classifyContent } from "./safety.ts";
import { stableDigest } from "./serialization.ts";
import type { AccessGrant, ContentChunk, Extraction, Resource, Revision, SourceDelta, SyncCursor, Tombstone } from "./contracts.ts";
import { assertScope, assertSourceDelta } from "./validation.ts";

export interface SyncStore {
  readonly resources: readonly Resource[];
  readonly revisions: readonly Revision[];
  readonly grants: readonly AccessGrant[];
  readonly extractions: readonly Extraction[];
  readonly chunks: readonly ContentChunk[];
  readonly tombstones: readonly Tombstone[];
  readonly cursors: readonly SyncCursor[];
  /** Source event identifiers, retained to make webhook and cursor replay idempotent. */
  readonly processed_event_ids: readonly string[];
}
export interface SyncOutcome { readonly store: SyncStore; readonly applied: boolean; readonly reason: "created" | "acl_refreshed" | "deduplicated" | "tombstoned"; }

const empty = (): SyncStore => Object.freeze({ resources: [], revisions: [], grants: [], extractions: [], chunks: [], tombstones: [], cursors: [], processed_event_ids: [] });
export function createSyncStore(): SyncStore { return empty(); }

function cursorFor(connectionId: string, value: string, observedAt: string): SyncCursor { return Object.freeze({ schema_version: "1.0", connection_id: connectionId, value, observed_at: observedAt }); }
function appendCursor(store: SyncStore, cursor: SyncCursor): readonly SyncCursor[] { return store.cursors.some((entry) => entry.connection_id === cursor.connection_id && entry.value === cursor.value) ? store.cursors : Object.freeze([...store.cursors, cursor]); }
function processedEventKey(connectionId: string, eventId: string): string { return `${connectionId}:${eventId}`; }
function markProcessed(store: SyncStore, connectionId: string, eventId: string): readonly string[] { return Object.freeze([...store.processed_event_ids, processedEventKey(connectionId, eventId)]); }
function terms(content: string): readonly string[] { return Object.freeze([...new Set(content.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? [])].sort()); }
function effectiveGrants(resourceId: string, revisionId: string, eventId: string, acl: SourceDelta["acl"]): readonly AccessGrant[] {
  return Object.freeze(acl.map((grant, index) => Object.freeze({ schema_version: "1.0", ...grant, id: `acl_${stableDigest([resourceId, revisionId, eventId, index])}`, resource_id: resourceId, revision_id: revisionId })));
}
function replaceRevisionGrants(store: SyncStore, resourceId: string, revisionId: string, grants: readonly AccessGrant[]): readonly AccessGrant[] {
  return Object.freeze([...store.grants.filter((grant) => grant.resource_id !== resourceId || grant.revision_id !== revisionId), ...grants]);
}
function sourceResource(store: SyncStore, connectionId: string, scope: Resource["scope"], delta: Exclude<SourceDelta, { kind: "deleted" | "lost_permission" }>): Resource {
  const existing = store.resources.find((entry) => entry.connection_id === connectionId && entry.external_id === delta.external_id);
  if (existing) return existing;
  if (delta.kind !== "upsert") throw new Error("ACL refresh requires a previously ingested resource");
  return Object.freeze({ schema_version: "1.0", id: `res_${stableDigest([connectionId, delta.external_id])}`, connection_id: connectionId, scope, external_id: delta.external_id, parent_external_id: delta.parent_external_id, title: delta.title, url: delta.url, owner_principal_id: delta.owner_principal_id });
}
function withEvent(store: SyncStore, connectionId: string, eventId: string, cursor: SyncCursor, partial: Omit<SyncStore, "cursors" | "processed_event_ids">): SyncStore {
  return Object.freeze({ ...partial, cursors: appendCursor(store, cursor), processed_event_ids: markProcessed(store, connectionId, eventId) });
}

/**
 * Applies a source event exactly once. ACL refreshes replace the effective grants for
 * their exact revision, so a removed allow cannot survive a successful reconciliation.
 */
export function applyDelta(store: SyncStore, connectionId: string, scope: Resource["scope"], delta: SourceDelta, observedAt: string): SyncOutcome {
  assertScope(scope);
  assertSourceDelta(delta);
  if (store.processed_event_ids.includes(processedEventKey(connectionId, delta.event_id))) return { store, applied: false, reason: "deduplicated" };
  const cursor = cursorFor(connectionId, delta.cursor, observedAt);
  if (delta.kind === "deleted" || delta.kind === "lost_permission") {
    const reason = delta.kind === "lost_permission" ? "lost_permission" : "deleted";
    const resource = store.resources.find((entry) => entry.connection_id === connectionId && entry.external_id === delta.external_id);
    // Source deletion events can arrive before a cursor replay. Preserve their stable
    // resource identity without inventing a retrievable placeholder resource.
    const resourceId = resource?.id ?? `res_${stableDigest([connectionId, delta.external_id])}`;
    const tombstone: Tombstone = Object.freeze({ schema_version: "1.0", resource_id: resourceId, reason, observed_at: observedAt, source_event_id: delta.event_id });
    return { store: withEvent(store, connectionId, delta.event_id, cursor, { ...store, tombstones: Object.freeze([...store.tombstones, tombstone]) }), applied: true, reason: "tombstoned" };
  }
  const resource = sourceResource(store, connectionId, scope, delta as Exclude<SourceDelta, { kind: "deleted" | "lost_permission" }>);
  const resources = store.resources.some((entry) => entry.id === resource.id) ? store.resources : Object.freeze([...store.resources, resource]);
  const revision = store.revisions.find((entry) => entry.resource_id === resource.id && entry.external_revision_id === delta.external_revision_id);
  if (delta.kind === "acl_refresh") {
    if (!revision) throw new Error("ACL refresh requires a previously ingested revision");
    const grants = replaceRevisionGrants(store, resource.id, revision.id, effectiveGrants(resource.id, revision.id, delta.event_id, delta.acl));
    return { store: withEvent(store, connectionId, delta.event_id, cursor, { ...store, resources, grants }), applied: true, reason: "acl_refreshed" };
  }
  // The tombstone variants returned above have no source content or digest.
  if (delta.kind !== "upsert") throw new Error("Unsupported source delta kind");
  if (revision && revision.immutable_digest !== delta.digest) throw new Error("A source revision identifier cannot point to different immutable content");
  if (revision) {
    const grants = replaceRevisionGrants(store, resource.id, revision.id, effectiveGrants(resource.id, revision.id, delta.event_id, delta.acl));
    return { store: withEvent(store, connectionId, delta.event_id, cursor, { ...store, resources, grants }), applied: true, reason: "acl_refreshed" };
  }
  if (store.revisions.some((entry) => entry.resource_id === resource.id && entry.immutable_digest === delta.digest)) return { store: withEvent(store, connectionId, delta.event_id, cursor, { ...store, resources }), applied: false, reason: "deduplicated" };
  const newRevision: Revision = Object.freeze({ schema_version: "1.0", id: `rev_${stableDigest([resource.id, delta.external_revision_id, delta.digest])}`, resource_id: resource.id, external_revision_id: delta.external_revision_id, immutable_digest: delta.digest, observed_at: observedAt, source_title: delta.title, source_url: delta.url, source_owner_principal_id: delta.owner_principal_id, content: delta.content, deleted_at: null });
  const extraction: Extraction = Object.freeze({ schema_version: "1.0", id: `ext_${stableDigest([newRevision.id, "extractor.plaintext.v1"])}`, revision_id: newRevision.id, extractor_version: "extractor.plaintext.v1", digest: delta.digest, risk: classifyContent(delta.content) });
  const chunk: ContentChunk = Object.freeze({ schema_version: "1.0", id: `chk_${stableDigest([newRevision.id, 0])}`, revision_id: newRevision.id, ordinal: 0, text: delta.content, lexical_terms: terms(delta.content), embedding_ref: null });
  const grants = replaceRevisionGrants(store, resource.id, newRevision.id, effectiveGrants(resource.id, newRevision.id, delta.event_id, delta.acl));
  return { store: withEvent(store, connectionId, delta.event_id, cursor, { resources, revisions: Object.freeze([...store.revisions, newRevision]), grants, extractions: Object.freeze([...store.extractions, extraction]), chunks: Object.freeze([...store.chunks, chunk]), tombstones: store.tombstones }), applied: true, reason: "created" };
}

/** A successful authoritative reconciliation treats absent source resources as lost permission. */
export function reconcileMissingResources(store: SyncStore, connectionId: string, visibleExternalIds: readonly string[], observedAt: string): SyncStore {
  const visible = new Set(visibleExternalIds);
  const missing = store.resources.filter((resource) => resource.connection_id === connectionId && !visible.has(resource.external_id));
  return missing.reduce((current, resource) => {
    if (current.tombstones.some((tombstone) => tombstone.resource_id === resource.id)) return current;
    const eventId = `reconcile_${stableDigest([connectionId, resource.external_id, observedAt])}`;
    const delta: SourceDelta = Object.freeze({ schema_version: "1.0", kind: "lost_permission", event_id: eventId, external_id: resource.external_id, external_revision_id: "reconciled", cursor: eventId, acl: [] });
    return applyDelta(current, connectionId, resource.scope, delta, observedAt).store;
  }, store);
}

export function freshnessMilliseconds(lastSuccessfulSync: string | null, now: string): number | null { return lastSuccessfulSync === null ? null : Math.max(0, Date.parse(now) - Date.parse(lastSuccessfulSync)); }
export const REVOCATION_FRESHNESS_TARGET = Object.freeze({ p95_milliseconds: 5 * 60_000, maximum_milliseconds: 15 * 60_000 });
export function deletionSlaMet(tombstone: Tombstone, detectedAt: string, targetMilliseconds = REVOCATION_FRESHNESS_TARGET.maximum_milliseconds): boolean {
  const observed = Date.parse(tombstone.observed_at), detected = Date.parse(detectedAt);
  return Number.isFinite(observed) && Number.isFinite(detected) && observed >= detected && observed - detected <= targetMilliseconds;
}
export function isFreshEnough(lastSuccessfulSync: string | null, now: string, targetMilliseconds = REVOCATION_FRESHNESS_TARGET.maximum_milliseconds): boolean {
  const lag = freshnessMilliseconds(lastSuccessfulSync, now);
  return lag !== null && lag <= targetMilliseconds;
}
