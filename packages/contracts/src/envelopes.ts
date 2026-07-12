import {
  type ActorId,
  type CausationId,
  type CommandId,
  type CorrelationId,
  type EventId,
  type ItemId,
  type OrganizationId,
  type ProjectId,
  type RunId,
  type ThreadId,
  type TurnId,
  assertCanonicalId,
} from "./ids.ts";
import { ContractError } from "./errors.ts";
import { type JsonObject, deserializeJson, serializeCanonical, toJsonValue } from "./serialization.ts";
import {
  COMMAND_COMPATIBILITY,
  EVENT_COMPATIBILITY,
  type SchemaVersion,
  assertSchemaVersionCompatible,
} from "./versioning.ts";

export type ActorType = "user" | "agent" | "system" | "service";
export type Visibility = "private" | "project" | "organization";
export type Sensitivity = "normal" | "sensitive" | "restricted";

export interface ActorRef {
  readonly type: ActorType;
  readonly id: ActorId;
}

export interface ResourceScope {
  readonly organization_id: OrganizationId;
  readonly project_id?: ProjectId;
  readonly thread_id?: ThreadId;
  readonly run_id?: RunId;
  readonly turn_id?: TurnId;
  readonly item_id?: ItemId;
}

export interface CommandEnvelope<Payload extends JsonObject = JsonObject> extends ResourceScope {
  readonly command_id: CommandId;
  readonly command_type: string;
  readonly schema_version: SchemaVersion;
  readonly actor: ActorRef;
  readonly idempotency_key: string;
  readonly expected_version?: number;
  readonly correlation_id: CorrelationId;
  readonly causation_id?: CausationId;
  readonly issued_at: string;
  readonly payload: Payload;
}

export interface ObjectReference {
  readonly uri: string;
  readonly digest: string;
  readonly media_type: string;
  readonly byte_size: number;
}

export interface EventEnvelope<Payload extends JsonObject = JsonObject> extends ResourceScope {
  readonly event_id: EventId;
  readonly event_type: string;
  readonly schema_version: SchemaVersion;
  readonly sequence: number;
  readonly occurred_at: string;
  readonly actor: ActorRef;
  readonly causation_id?: CausationId;
  readonly correlation_id: CorrelationId;
  readonly payload?: Payload;
  readonly object_reference?: ObjectReference;
  readonly visibility: Visibility;
  readonly sensitivity: Sensitivity;
}

function assertIsoTimestamp(value: string, field: string): void {
  const canonicalUtc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value);
  const parsed = Date.parse(value);
  if (!canonicalUtc || !Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new ContractError("validation.invalid_envelope", `${field} must be a canonical UTC ISO-8601 timestamp`, { field, value });
  }
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ContractError("validation.invalid_envelope", `${field} is required`, { field });
  }
}

function assertActor(actor: ActorRef): void {
  if (!actor || !["user", "agent", "system", "service"].includes(actor.type)) {
    throw new ContractError("validation.invalid_envelope", "actor.type is invalid");
  }
  assertCanonicalId(actor.id, "act");
}

function assertScope(scope: ResourceScope): void {
  assertCanonicalId(scope.organization_id, "org");
  if (scope.project_id) assertCanonicalId(scope.project_id, "prj");
  if (scope.thread_id) assertCanonicalId(scope.thread_id, "thr");
  if (scope.run_id) assertCanonicalId(scope.run_id, "run");
  if (scope.turn_id) assertCanonicalId(scope.turn_id, "trn");
  if (scope.item_id) assertCanonicalId(scope.item_id, "itm");
}

export function assertCommandEnvelope(value: CommandEnvelope): void {
  assertCanonicalId(value.command_id, "cmd");
  assertNonEmptyString(value.command_type, "command_type");
  assertSchemaVersionCompatible(value.schema_version, COMMAND_COMPATIBILITY);
  assertScope(value);
  assertActor(value.actor);
  assertNonEmptyString(value.idempotency_key, "idempotency_key");
  if (value.expected_version !== undefined && (!Number.isInteger(value.expected_version) || value.expected_version < 0)) {
    throw new ContractError("validation.invalid_envelope", "expected_version must be a non-negative integer");
  }
  assertCanonicalId(value.correlation_id, "cor");
  if (value.causation_id) assertCanonicalId(value.causation_id, "cau");
  assertIsoTimestamp(value.issued_at, "issued_at");
  toJsonValue(value.payload);
}

export function assertEventEnvelope(value: EventEnvelope): void {
  assertCanonicalId(value.event_id, "evt");
  assertNonEmptyString(value.event_type, "event_type");
  assertSchemaVersionCompatible(value.schema_version, EVENT_COMPATIBILITY);
  assertScope(value);
  assertActor(value.actor);
  if (!Number.isSafeInteger(value.sequence) || value.sequence < 1) {
    throw new ContractError("validation.invalid_envelope", "sequence must be a positive safe integer");
  }
  assertIsoTimestamp(value.occurred_at, "occurred_at");
  assertCanonicalId(value.correlation_id, "cor");
  if (value.causation_id) assertCanonicalId(value.causation_id, "cau");
  if ((value.payload === undefined) === (value.object_reference === undefined)) {
    throw new ContractError("validation.invalid_envelope", "Event requires exactly one of payload or object_reference");
  }
  if (value.payload !== undefined) toJsonValue(value.payload);
  if (value.object_reference !== undefined) {
    if (
      !value.object_reference.uri ||
      !value.object_reference.digest ||
      !value.object_reference.media_type ||
      !Number.isSafeInteger(value.object_reference.byte_size) ||
      value.object_reference.byte_size < 0
    ) {
      throw new ContractError("validation.invalid_envelope", "object_reference is invalid");
    }
  }
  if (!["private", "project", "organization"].includes(value.visibility)) {
    throw new ContractError("validation.invalid_envelope", "visibility is invalid");
  }
  if (!["normal", "sensitive", "restricted"].includes(value.sensitivity)) {
    throw new ContractError("validation.invalid_envelope", "sensitivity is invalid");
  }
}

export function serializeCommand(command: CommandEnvelope): string {
  assertCommandEnvelope(command);
  return serializeCanonical(command);
}

export function deserializeCommand(value: string): CommandEnvelope {
  const parsed = deserializeJson(value) as unknown as CommandEnvelope;
  assertCommandEnvelope(parsed);
  return parsed;
}

export function serializeEvent(event: EventEnvelope): string {
  assertEventEnvelope(event);
  return serializeCanonical(event);
}

export function deserializeEvent(value: string): EventEnvelope {
  const parsed = deserializeJson(value) as unknown as EventEnvelope;
  assertEventEnvelope(parsed);
  return parsed;
}
