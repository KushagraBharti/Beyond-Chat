import assert from "node:assert/strict";
import test from "node:test";
import {
  InMemoryAutomationPersistence,
  type AutomationExecution,
} from "../src/index.ts";
test("replay fixture retains exact version and pinned dependencies", async () => {
  const store = new InMemoryAutomationPersistence();
  const execution: AutomationExecution = {
    id: "aex_fixture",
    organization_id: "org_fixture",
    automation_id: "aut_fixture",
    automation_version_id: "autv_004",
    trigger_key: "schedule:clock:2026-07-11T12:00Z",
    state: "queued",
    attempt: 0,
    cost_cents: 0,
    action_count: 0,
    input: { period: "2026-W28" },
    pinned: {
      agent: { id: "agent_finance", version: "9", digest: "sha256:a9" },
      tools: [{ id: "tool_ledger", version: "4", digest: "sha256:t4" }],
      knowledge: [{ id: "kb_policy", version: "12", digest: "sha256:k12" }],
      approval_policy_id: "ap_external_v3",
    },
    correlation_id: "cor_fixture",
    test: false,
    created_at: "2026-07-11T12:00:00Z",
    updated_at: "2026-07-11T12:00:00Z",
  };
  const first = await store.createExecutionOnce(execution);
  const replay = await store.createExecutionOnce({
    ...execution,
    id: "aex_other",
  });
  assert.equal(first.duplicate, false);
  assert.equal(replay.execution.id, "aex_fixture");
  assert.deepEqual(replay.execution.pinned, execution.pinned);
});
