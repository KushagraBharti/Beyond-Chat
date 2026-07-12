import assert from "node:assert/strict";
import test from "node:test";
import {
  COMMAND_SCHEMA_VERSION,
  EVENT_SCHEMA_VERSION,
  ContractError,
  assertCommandEnvelope,
  assertEventEnvelope,
  canonicalId,
  deserializeCommand,
  deserializeEvent,
  isSchemaVersionCompatible,
  serializeCommand,
  serializeEvent,
} from "../src/index.ts";

const ids = {
  organization_id: canonicalId("org", "01HX7W2J8P4XW3D9CZV3"),
  project_id: canonicalId("prj", "01HX7W2J8P4XW3D9CZV3"),
  thread_id: canonicalId("thr", "01HX7W2J8P4XW3D9CZV3"),
  run_id: canonicalId("run", "01HX7W2J8P4XW3D9CZV3"),
  actor_id: canonicalId("act", "01HX7W2J8P4XW3D9CZV3"),
  correlation_id: canonicalId("cor", "01HX7W2J8P4XW3D9CZV3"),
};

function command() {
  return {
    command_id: canonicalId("cmd", "01HX7W2J8P4XW3D9CZV3"),
    command_type: "run.start",
    schema_version: COMMAND_SCHEMA_VERSION,
    ...ids,
    actor: { type: "user" as const, id: ids.actor_id },
    idempotency_key: "client-key-1",
    expected_version: 0,
    issued_at: "2026-07-11T12:00:00.000Z",
    payload: { prompt: "Create a durable run", nested: { count: 1 } },
  };
}

function event() {
  return {
    event_id: canonicalId("evt", "01HX7W2J8P4XW3D9CZV3"),
    event_type: "run.accepted",
    schema_version: EVENT_SCHEMA_VERSION,
    ...ids,
    sequence: 1,
    occurred_at: "2026-07-11T12:00:00.000Z",
    actor: { type: "service" as const, id: ids.actor_id },
    payload: { state: "accepted" },
    visibility: "project" as const,
    sensitivity: "normal" as const,
  };
}

test("canonical IDs encode a stable type prefix", () => {
  assert.equal(canonicalId("run", "01HX7W2J8P4XW3D9CZV3"), "run_01HX7W2J8P4XW3D9CZV3");
  assert.throws(() => canonicalId("run", "not canonical"), ContractError);
});

test("command and event round trips preserve validated canonical envelopes", () => {
  const serializedCommand = serializeCommand(command());
  const serializedEvent = serializeEvent(event());
  assert.deepEqual(deserializeCommand(serializedCommand), command());
  assert.deepEqual(deserializeEvent(serializedEvent), event());
  assert.equal(serializedCommand, serializeCommand(deserializeCommand(serializedCommand)));
  assert.equal(serializedEvent, serializeEvent(deserializeEvent(serializedEvent)));
});

test("envelope validation rejects missing durable-event payloads and bad command versions", () => {
  assert.throws(() => assertEventEnvelope({ ...event(), payload: undefined }), /exactly one/);
  assert.throws(() => assertCommandEnvelope({ ...command(), schema_version: "2.0" }), /Unsupported/);
  assert.throws(() => assertCommandEnvelope({ ...command(), issued_at: "1" }), /canonical UTC/);
});

test("schema compatibility rejects malformed, future, and incompatible-major versions", () => {
  assert.equal(isSchemaVersionCompatible("1.0", { family: "event", current: "1.0", minimumReadable: "1.0" }), true);
  assert.equal(isSchemaVersionCompatible("1.1", { family: "event", current: "1.0", minimumReadable: "1.0" }), false);
  assert.equal(isSchemaVersionCompatible("2.0", { family: "event", current: "1.0", minimumReadable: "1.0" }), false);
  assert.equal(isSchemaVersionCompatible("one", { family: "event", current: "1.0", minimumReadable: "1.0" }), false);
});
