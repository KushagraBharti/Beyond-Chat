import { canRead } from "./access.ts";
import { safeExcerpt } from "./safety.ts";
import { stableDigest } from "./serialization.ts";
import type { AccessGrant, Citation, ContentChunk, Resource, RetrievalAudit, Revision, Scope, Tombstone } from "./contracts.ts";
import { assertCitation, assertScope } from "./validation.ts";

export interface KnowledgeRecord { readonly resource: Resource; readonly revision: Revision; readonly chunk: ContentChunk; readonly grants: readonly AccessGrant[]; readonly tombstone?: Tombstone; }
export interface RetrievalResult { readonly resource_id: string; readonly revision_id: string; readonly excerpt: ReturnType<typeof safeExcerpt>; readonly score: Readonly<{ lexical: number; vector: number; hybrid: number }>; readonly citation: Citation; }

function terms(value: string): string[] { return [...new Set(value.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? [])].sort(); }
function lexical(query: string, chunk: ContentChunk): number { const queryTerms = terms(query); if (!queryTerms.length) return 0; const source = new Set(chunk.lexical_terms.length ? chunk.lexical_terms : terms(chunk.text)); return queryTerms.filter((term) => source.has(term)).length / queryTerms.length; }
function vector(query: readonly number[] | undefined, candidate: readonly number[] | undefined): number {
  if (!query || !candidate || query.length !== candidate.length || !query.length) return 0;
  let dot = 0, left = 0, right = 0;
  for (let index = 0; index < query.length; index += 1) { dot += query[index] * candidate[index]; left += query[index] ** 2; right += candidate[index] ** 2; }
  return left && right ? Math.max(0, dot / Math.sqrt(left * right)) : 0;
}

export function retrieve(records: readonly KnowledgeRecord[], actor: Scope, query: string, queryVector?: readonly number[], citedAt = "1970-01-01T00:00:00.000Z"): Readonly<{ results: readonly RetrievalResult[]; audit: RetrievalAudit }> {
  assertScope(actor);
  const candidateCount = records.length;
  const permitted = records.filter((record) => !record.tombstone && record.revision.deleted_at === null && canRead(actor, record.resource.scope, record.grants));
  const results = permitted.map((record) => {
    const lexicalScore = lexical(query, record.chunk), vectorScore = vector(queryVector, record.chunk.vector);
    const hybrid = lexicalScore * 0.65 + vectorScore * 0.35;
    const citation: Citation = Object.freeze({ schema_version: "1.0", id: `cit_${stableDigest([record.resource.id, record.revision.id, record.chunk.id])}`, resource_id: record.resource.id, revision_id: record.revision.id, chunk_id: record.chunk.id, title: record.revision.source_title, url: record.revision.source_url, owner_principal_id: record.revision.source_owner_principal_id, immutable_digest: record.revision.immutable_digest, source_observed_at: record.revision.observed_at, cited_at: citedAt });
    return Object.freeze({ resource_id: record.resource.id, revision_id: record.revision.id, excerpt: safeExcerpt(record.chunk.text), score: Object.freeze({ lexical: lexicalScore, vector: vectorScore, hybrid }), citation });
  }).filter((result) => result.score.hybrid > 0).sort((left, right) => right.score.hybrid - left.score.hybrid || left.resource_id.localeCompare(right.resource_id) || left.revision_id.localeCompare(right.revision_id));
  const audit: RetrievalAudit = Object.freeze({ schema_version: "1.0", id: `ret_${stableDigest([actor, query, citedAt, results.map((entry) => entry.citation.id)])}`, actor, query_digest: stableDigest(query), at: citedAt, candidate_count: candidateCount, permitted_count: permitted.length, results: Object.freeze(results.map((result) => Object.freeze({ schema_version: "1.0", resource_id: result.resource_id, revision_id: result.revision_id, lexical_score: result.score.lexical, vector_score: result.score.vector, hybrid_score: result.score.hybrid, citation_id: result.citation.id }))) });
  return Object.freeze({ results: Object.freeze(results), audit });
}

export function resolveCitation(citation: Citation, records: readonly KnowledgeRecord[], actor: Scope): Readonly<{ state: "available"; resource: Resource; revision: Revision } | { state: "unavailable"; reason: "missing" | "revoked" | "deleted" }> {
  assertCitation(citation); assertScope(actor);
  const record = records.find((entry) => entry.resource.id === citation.resource_id && entry.revision.id === citation.revision_id && (!citation.chunk_id || entry.chunk.id === citation.chunk_id));
  if (!record) return { state: "unavailable", reason: "missing" };
  if (record.tombstone || record.revision.deleted_at) return { state: "unavailable", reason: "deleted" };
  if (record.revision.immutable_digest !== citation.immutable_digest || record.revision.source_title !== citation.title || record.revision.source_url !== citation.url || record.revision.source_owner_principal_id !== citation.owner_principal_id || record.revision.observed_at !== citation.source_observed_at || !canRead(actor, record.resource.scope, record.grants)) return { state: "unavailable", reason: "revoked" };
  return Object.freeze({ state: "available", resource: record.resource, revision: record.revision });
}
