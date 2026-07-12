import { ContractError } from "./errors.ts";

declare const canonicalIdBrand: unique symbol;

export type CanonicalId<Prefix extends string> = string & {
  readonly [canonicalIdBrand]: Prefix;
};

export type OrganizationId = CanonicalId<"org">;
export type ProjectId = CanonicalId<"prj">;
export type ThreadId = CanonicalId<"thr">;
export type RunId = CanonicalId<"run">;
export type TurnId = CanonicalId<"trn">;
export type ItemId = CanonicalId<"itm">;
export type ActorId = CanonicalId<"act">;
export type CommandId = CanonicalId<"cmd">;
export type EventId = CanonicalId<"evt">;
export type ArtifactId = CanonicalId<"art">;
export type CheckpointId = CanonicalId<"chk">;
export type SandboxId = CanonicalId<"sbx">;
export type CorrelationId = CanonicalId<"cor">;
export type CausationId = CanonicalId<"cau">;

export type CanonicalIdPrefix =
  | "org"
  | "prj"
  | "thr"
  | "run"
  | "trn"
  | "itm"
  | "act"
  | "cmd"
  | "evt"
  | "art"
  | "chk"
  | "sbx"
  | "cor"
  | "cau";

const CANONICAL_ID = /^(org|prj|thr|run|trn|itm|act|cmd|evt|art|chk|sbx|cor|cau)_([0-9A-HJKMNP-TV-Z]{10,}|[a-f0-9]{32})$/i;

export function canonicalId<Prefix extends CanonicalIdPrefix>(
  prefix: Prefix,
  value: string,
): CanonicalId<Prefix> {
  const candidate = `${prefix}_${value}`;
  assertCanonicalId(candidate, prefix);
  return candidate as CanonicalId<Prefix>;
}

export function newCanonicalId<Prefix extends CanonicalIdPrefix>(prefix: Prefix): CanonicalId<Prefix> {
  return canonicalId(prefix, crypto.randomUUID().replaceAll("-", ""));
}

export function assertCanonicalId<Prefix extends CanonicalIdPrefix>(
  value: string,
  expectedPrefix?: Prefix,
): asserts value is CanonicalId<Prefix> {
  const match = CANONICAL_ID.exec(value);
  if (!match || (expectedPrefix !== undefined && match[1].toLowerCase() !== expectedPrefix)) {
    throw new ContractError("validation.invalid_id", `Expected canonical ${expectedPrefix ?? "known"} ID`, {
      value,
      expectedPrefix,
    });
  }
}
