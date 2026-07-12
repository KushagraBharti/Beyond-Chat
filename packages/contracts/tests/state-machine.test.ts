import assert from "node:assert/strict";
import test from "node:test";
import { ContractError, canonicalId, canTransition, transitionExecution } from "../src/index.ts";

const snapshot = {
  run_id: canonicalId("run", "01HX7W2J8P4XW3D9CZV3"),
  state: "accepted" as const,
  version: 0,
  attempt: 0,
  updated_at: "2026-07-11T12:00:00.000Z",
};

test("canonical execution route reaches completed through immutable snapshots", () => {
  const states = ["queued", "leased", "preparing", "running", "completing", "completed"] as const;
  const final = states.reduce(
    (current, to, index) => transitionExecution(current, {
      to,
      expected_version: index,
      occurred_at: `2026-07-11T12:00:0${index + 1}.000Z`,
    }),
    snapshot,
  );
  assert.equal(snapshot.state, "accepted");
  assert.equal(final.state, "completed");
  assert.equal(final.version, 6);
  assert.equal(Object.isFrozen(final), true);
});

test("approval, retry, and recovery paths are explicit", () => {
  assert.equal(canTransition("running", "awaiting_approval"), true);
  assert.equal(canTransition("awaiting_approval", "running"), true);
  assert.equal(canTransition("running", "retrying"), true);
  assert.equal(canTransition("stalled", "reconciling"), true);
  assert.equal(canTransition("reconciling", "completed"), true);
});

test("invalid and stale transitions fail without mutating state", () => {
  assert.throws(() => transitionExecution(snapshot, {
    to: "completed",
    occurred_at: "2026-07-11T12:00:01.000Z",
  }), ContractError);
  assert.throws(() => transitionExecution(snapshot, {
    to: "queued",
    expected_version: 1,
    occurred_at: "2026-07-11T12:00:01.000Z",
  }), /version/);
  assert.equal(snapshot.version, 0);
});
