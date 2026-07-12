import { ContractError } from "./errors.ts";

export type SchemaVersion = `${number}.${number}`;

export const COMMAND_SCHEMA_VERSION: SchemaVersion = "1.0";
export const EVENT_SCHEMA_VERSION: SchemaVersion = "1.0";

export interface SchemaCompatibility {
  readonly family: "command" | "event";
  readonly current: SchemaVersion;
  readonly minimumReadable: SchemaVersion;
}

export const COMMAND_COMPATIBILITY: SchemaCompatibility = {
  family: "command",
  current: COMMAND_SCHEMA_VERSION,
  minimumReadable: "1.0",
};

export const EVENT_COMPATIBILITY: SchemaCompatibility = {
  family: "event",
  current: EVENT_SCHEMA_VERSION,
  minimumReadable: "1.0",
};

export function parseSchemaVersion(value: string): { readonly major: number; readonly minor: number } {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!match) {
    throw new ContractError("schema.invalid_version", "Schema version must use MAJOR.MINOR", { value });
  }
  return { major: Number(match[1]), minor: Number(match[2]) };
}

export function isSchemaVersionCompatible(
  received: string,
  compatibility: SchemaCompatibility,
): received is SchemaVersion {
  try {
    const candidate = parseSchemaVersion(received);
    const minimum = parseSchemaVersion(compatibility.minimumReadable);
    const current = parseSchemaVersion(compatibility.current);
    return candidate.major === current.major && candidate.minor >= minimum.minor && candidate.minor <= current.minor;
  } catch {
    return false;
  }
}

export function assertSchemaVersionCompatible(
  received: string,
  compatibility: SchemaCompatibility,
): asserts received is SchemaVersion {
  if (!isSchemaVersionCompatible(received, compatibility)) {
    throw new ContractError("schema.unsupported_version", `Unsupported ${compatibility.family} schema version`, {
      received,
      minimumReadable: compatibility.minimumReadable,
      current: compatibility.current,
    });
  }
}
