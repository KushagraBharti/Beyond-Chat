import assert from "node:assert/strict";
import test from "node:test";
import {
  COMMAND_SCHEMA_VERSION,
  EVENT_SCHEMA_VERSION,
  ContractError,
  canonicalId,
} from "@beyond/contracts";
import { InMemoryCommandInbox as Inbox, InMemoryDurableEventLog as EventLog, initialCursor as cursor } from "../src/index.ts";

const stream = {
  organization_id: canonicalId("org", "01HX7W2J8P4XW3D9CZV3"),
  project_id: canonicalId("prj", "01HX7W2J8P4XW3D9CZV3"),
  thread_id: canonicalId("thr", "01HX7W2J8P4XW3D9CZV3"),
  run_id: canonicalId("run", "01HX7W2J8P4XW3D9CZV3"),
};
const actor = { type: "user" as const, id: canonicalId("act", "01HX7W2J8P4XW3D9CZV3") };
const correlation_id = canonicalId("cor", "01HX7W2J8P4XW3D9CZV3");

function event(sequence: number, suffix: string, type = "run.progress") {
  return {
    ...stream,
    event_id: canonicalId("evt", `01HX7W2J8P4XW3D9CZ${suffix}`),
    event_type: type,
    schema_version: EVENT_SCHEMA_VERSION,
    sequence,
    occurred_at: `2026-07-11T12:00:0${sequence}.000Z`,
    actor,
    correlation_id,
    payload: { sequence },
    visibility: "project" as const,
    sensitivity: "normal" as const,
  };
}

function command(payload: string, commandSuffix = "V3") {
  return {
    ...stream,
    command_id: canonicalId("cmd", `01HX7W2J8P4XW3D9CZ${commandSuffix}`),
    command_type: "run.start",
    schema_version: COMMAND_SCHEMA_VERSION,
    actor,
    idempotency_key: "same-client-key",
    correlation_id,
    issued_at: "2026-07-11T12:00:00.000Z",
    payload: { payload },
  };
}

test("event streams allocate only contiguous sequence order", () => {
  const log = new EventLog();
  log.append(event(1, "V4"));
  log.append(event(2, "V5"));
  assert.deepEqual(log.read(cursor(stream)).events.map((entry) => entry.sequence), [1, 2]);
  assert.throws(() => log.append(event(4, "V6")), /contiguous/);
});

test("identical event delivery is idempotent while conflicting reuse is rejected", () => {
  const log = new EventLog();
  const first = event(1, "V4");
  const stored = log.append(first);
  assert.equal(log.append(first), stored);
  assert.throws(() => log.append({ ...first, payload: { sequence: 99 } }), ContractError);
});

test("cursor replay is deterministic and resumes from the accepted sequence", () => {
  const log = new EventLog();
  log.append(event(1, "V4", "run.accepted"));
  log.append(event(2, "V5", "run.queued"));
  log.append(event(3, "V6", "run.running"));
  const projector = (state: readonly string[], item: { readonly event_type: string }) => [...state, item.event_type];
  const first = log.replay(cursor(stream), [], projector);
  const replay = log.replay(cursor(stream), [], projector);
  assert.deepEqual(first, replay);
  assert.deepEqual(first.state, ["run.accepted", "run.queued", "run.running"]);
  const resumed = log.replay({ ...stream, after_sequence: 2 }, [], projector);
  assert.deepEqual(resumed.state, ["run.running"]);
  assert.equal(resumed.cursor.after_sequence, 3);
});

test("command inbox executes once for duplicate envelopes and detects key conflicts", async () => {
  const inbox = new Inbox();
  let calls = 0;
  const first = await inbox.execute(command("one"), () => ++calls);
  const duplicate = await inbox.execute(command("one", "V7"), () => ++calls);
  assert.deepEqual(first, { result: 1, duplicate: false });
  assert.deepEqual(duplicate, { result: 1, duplicate: true });
  assert.equal(calls, 1);
  await assert.rejects(() => inbox.execute(command("different"), () => ++calls), ContractError);
});

test("idempotency is isolated across canonical run scope", async () => {
  const inbox = new Inbox();
  let calls = 0;
  const first = command("same");
  const second = {
    ...command("same", "V8"),
    run_id: canonicalId("run", "01HX7W2J8P4XW3D9CZV9"),
  };
  assert.equal((await inbox.execute(first, () => ++calls)).duplicate, false);
  assert.equal((await inbox.execute(second, () => ++calls)).duplicate, false);
  assert.equal(calls, 2);
});
