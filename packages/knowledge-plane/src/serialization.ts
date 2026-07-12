export type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };

function canonical(value: unknown, seen = new WeakSet<object>()): Json {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("Non-finite values cannot be serialized"); return value; }
  if (Array.isArray(value)) return Object.freeze(value.map((entry) => canonical(entry, seen)));
  if (typeof value === "object") {
    if (seen.has(value)) throw new Error("Circular values cannot be serialized");
    seen.add(value);
    const output: Record<string, Json> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const entry = (value as Record<string, unknown>)[key];
      if (entry === undefined) throw new Error("Undefined values cannot be serialized");
      output[key] = canonical(entry, seen);
    }
    seen.delete(value); return Object.freeze(output);
  }
  throw new Error("Knowledge contracts require JSON values");
}

export function serializeCanonical(value: unknown): string { return JSON.stringify(canonical(value)); }
/** Stable non-secret digest for dedupe/audit correlation; callers provide cryptographic content digests from storage. */
export function stableDigest(value: unknown): string {
  let hash = 0x811c9dc5;
  for (const char of serializeCanonical(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return `kp1_${hash.toString(16).padStart(8, "0")}`;
}
