import { ContractError } from "./errors.ts";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

function normalize(value: unknown, seen: WeakSet<object>): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new ContractError("validation.invalid_envelope", "Non-finite numbers are not serializable");
    return value;
  }
  if (Array.isArray(value)) return Object.freeze(value.map((entry) => normalize(entry, seen)));
  if (typeof value === "object") {
    if (seen.has(value)) throw new ContractError("validation.invalid_envelope", "Circular values are not serializable");
    seen.add(value);
    const object = value as Record<string, unknown>;
    const normalized: Record<string, JsonValue> = {};
    for (const key of Object.keys(object).sort()) {
      if (object[key] === undefined) throw new ContractError("validation.invalid_envelope", "Undefined values are not serializable", { key });
      normalized[key] = normalize(object[key], seen);
    }
    seen.delete(value);
    return Object.freeze(normalized);
  }
  throw new ContractError("validation.invalid_envelope", "Only JSON values are serializable", { type: typeof value });
}

export function toJsonValue(value: unknown): JsonValue {
  return normalize(value, new WeakSet());
}

export function serializeCanonical(value: unknown): string {
  return JSON.stringify(toJsonValue(value));
}

export function deserializeJson(value: string): JsonValue {
  try {
    return toJsonValue(JSON.parse(value));
  } catch (error) {
    if (error instanceof ContractError) throw error;
    throw new ContractError("validation.invalid_envelope", "Invalid JSON serialization", { cause: String(error) });
  }
}

export function freezeRecord<T extends Record<string, unknown>>(value: T): Readonly<T> {
  return Object.freeze({ ...value });
}
