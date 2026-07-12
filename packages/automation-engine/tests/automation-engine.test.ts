import assert from "node:assert/strict";
import test from "node:test";
import {
  AutomationEngine,
  InMemoryAutomationPersistence,
  nextScheduledAt,
  signWebhook,
  verifySignedWebhook,
  type AutomationRuntimePort,
  type Clock,
  type Destination,
  type DestinationPort,
  type Notification,
  type NotificationPort,
  type RuntimeResult,
  type SchedulerPort,
  type ServicePrincipal,
  type ServicePrincipalPort,
  type TriggerEnvelope,
} from "../src/index.ts";

class MutableClock implements Clock {
  value: Date;
  constructor(value = new Date("2026-07-11T12:00:00.000Z")) {
    this.value = value;
  }
  now() {
    return this.value;
  }
  advance(ms: number) {
    this.value = new Date(this.value.getTime() + ms);
  }
}
class Runtime implements AutomationRuntimePort {
  starts = 0;
  failures = 0;
  async start() {
    this.starts++;
    if (this.failures-- > 0) throw new Error("transient");
    return {
      run_id: `run_${this.starts}`,
      cost_cents: 25,
      output_ref: "output:1",
    };
  }
  async cancel() {}
}
class Destinations implements DestinationPort {
  deliveries: string[] = [];
  async deliver(destination: Destination) {
    this.deliveries.push(destination.id);
  }
}
class Notifications implements NotificationPort {
  values: Notification[] = [];
  async deliver(value: Notification) {
    this.values.push(value);
  }
}
class Principals implements ServicePrincipalPort {
  value: ServicePrincipal | undefined = {
    id: "sp_1",
    organization_id: "org_1",
    state: "active",
    connection_refs: [],
  };
  async resolve(id: string, org: string) {
    return this.value?.id === id &&
      this.value.organization_id === org &&
      this.value.state === "active"
      ? this.value
      : undefined;
  }
}
class Scheduler implements SchedulerPort {
  values: string[] = [];
  async schedule(id: string, at: string) {
    this.values.push(`${id}:${at}`);
  }
  async unschedule(id: string) {
    this.values.push(`-${id}`);
  }
}
function envelope(event = "evt_1"): TriggerEnvelope {
  return {
    organization_id: "org_1",
    automation_id: "aut_1",
    kind: "webhook",
    source: "customer",
    source_event_id: event,
    occurred_at: "2026-07-11T11:59:00Z",
    received_at: "2026-07-11T12:00:00Z",
    payload: { invoice: "inv_1" },
    correlation_id: `cor_${event}`,
    test: false,
  };
}
async function setup(
  destination: Partial<Destination> = {},
  overlap: "skip" | "queue" | "cancel_previous" = "queue",
) {
  const store = new InMemoryAutomationPersistence(),
    runtime = new Runtime(),
    destinations = new Destinations(),
    notifications = new Notifications(),
    principals = new Principals(),
    scheduler = new Scheduler(),
    clock = new MutableClock();
  const engine = new AutomationEngine(
    store,
    runtime,
    destinations,
    notifications,
    principals,
    scheduler,
    clock,
  );
  await engine.create({
    id: "aut_1",
    organization_id: "org_1",
    project_id: "project_1",
    owner_id: "user_1",
    service_principal_id: "sp_1",
    name: "Invoice review",
  });
  const version = await engine.publish("aut_1", {
    instructions: "Review invoice",
    trigger: { kind: "webhook", source_id: "customer" },
    pinned: {
      agent: { id: "agent_1", version: "3", digest: "sha256:agent" },
      tools: [{ id: "tool_1", version: "2", digest: "sha256:tool" }],
      knowledge: [{ id: "scope_1", version: "7", digest: "sha256:knowledge" }],
      approval_policy_id: "approval_1",
    },
    budget: { max_cost_cents: 100, max_actions: 1, max_attempts: 2 },
    retry: {
      max_attempts: 2,
      initial_backoff_seconds: 10,
      max_backoff_seconds: 60,
    },
    overlap,
    destinations: [
      {
        id: "send",
        kind: "email",
        target_ref: "finance@example.invalid",
        external: true,
        approval_required: false,
        ...destination,
      },
    ],
    created_by: "user_1",
  });
  await engine.resume("aut_1");
  return {
    store,
    runtime,
    destinations,
    notifications,
    principals,
    scheduler,
    clock,
    engine,
    version,
  };
}

test("duplicate trigger and concurrent delivery produce one runtime and external action", async () => {
  const x = await setup();
  const [a, b] = await Promise.all([
    x.engine.ingest(envelope()),
    x.engine.ingest(envelope()),
  ]);
  assert.equal(a.execution.id, b.execution.id);
  assert.equal([a.duplicate, b.duplicate].filter(Boolean).length, 1);
  const [first, second] = await Promise.all([
    x.engine.runNext("w1"),
    x.engine.runNext("w2"),
  ]);
  assert.ok(first);
  assert.equal(second, undefined);
  assert.equal(x.runtime.starts, 1);
  assert.deepEqual(x.destinations.deliveries, ["send"]);
  const done = await x.store.getExecution(a.execution.id);
  assert.equal(done?.automation_version_id, x.version.id);
  assert.deepEqual(done?.pinned, x.version.pinned);
});
test("expired lease is recovered and only one worker can reclaim it", async () => {
  const x = await setup();
  const { execution } = await x.engine.ingest(envelope());
  const claim = await x.store.claim(
    x.clock.now().toISOString(),
    "dead",
    new Date(x.clock.now().getTime() + 1000).toISOString(),
  );
  assert.equal(claim?.execution.id, execution.id);
  assert.equal(
    await x.store.heartbeat(
      execution.id,
      claim!.lease_id,
      new Date(x.clock.now().getTime() + 3000).toISOString(),
    ),
    true,
  );
  assert.equal(
    await x.store.heartbeat(execution.id, "wrong-lease", x.clock.now().toISOString()),
    false,
  );
  x.clock.advance(2000);
  assert.deepEqual(await x.store.recoverExpired(x.clock.now().toISOString()), []);
  x.clock.advance(2000);
  assert.deepEqual(await x.store.recoverExpired(x.clock.now().toISOString()), [
    execution.id,
  ]);
  const claims = await Promise.all([
    x.store.claim(
      x.clock.now().toISOString(),
      "a",
      new Date(x.clock.now().getTime() + 1000).toISOString(),
    ),
    x.store.claim(
      x.clock.now().toISOString(),
      "b",
      new Date(x.clock.now().getTime() + 1000).toISOString(),
    ),
  ]);
  assert.equal(claims.filter(Boolean).length, 1);
});
test("skip overlap policy records a visible skipped execution", async () => {
  const x = await setup({}, "skip");
  await x.engine.ingest(envelope("active"));
  const skipped = await x.engine.ingest(envelope("overlap"));
  assert.equal(skipped.execution.state, "skipped");
  assert.equal(skipped.execution.failure_code, "overlap_skipped");
  assert.equal((await x.store.listExecutions("aut_1")).length, 2);
});
test("approval blocks external delivery until resolved and action receipt prevents replay", async () => {
  const x = await setup({ approval_required: true });
  const { execution } = await x.engine.ingest(envelope());
  const waiting = await x.engine.runNext("w1");
  assert.equal(waiting?.state, "awaiting_approval");
  assert.equal(x.destinations.deliveries.length, 0);
  const approval = (await x.store.listApprovals("org_1"))[0]!;
  const done = await x.engine.resolveApproval(
    approval.id,
    "approved",
    "approver_1",
  );
  assert.equal(done.state, "completed");
  assert.deepEqual(x.destinations.deliveries, ["send"]);
  await assert.rejects(
    () => x.engine.resolveApproval(approval.id, "approved", "approver_1"),
    /approval_not_pending/,
  );
});
test("expired approvals fail closed and remain visible", async () => {
  const x = await setup({ approval_required: true });
  const { execution } = await x.engine.ingest(envelope("expires"));
  await x.engine.runNext("w1");
  x.clock.advance(86_400_001);
  const approval = (await x.store.listApprovals("org_1"))[0]!;
  assert.deepEqual(await x.engine.expireApprovals("org_1"), [approval.id]);
  assert.equal((await x.store.getApproval(approval.id))?.status, "expired");
  assert.equal((await x.store.getExecution(execution.id))?.failure_code, "approval_expired");
  assert.deepEqual(x.destinations.deliveries, []);
});
test("budget and retries dead-letter with visible failure history", async () => {
  const x = await setup();
  x.runtime.failures = 2;
  const { execution } = await x.engine.ingest(envelope());
  const first = await x.engine.runNext("w1");
  assert.equal(first?.state, "retrying");
  x.clock.advance(10000);
  const second = await x.engine.runNext("w2");
  assert.equal(second?.state, "dead_letter");
  assert.equal((await x.store.listFailures("aut_1")).length, 2);
  assert.equal(x.notifications.values.at(-1)?.kind, "dead_letter");
  assert.equal(
    (await x.store.getExecution(execution.id))?.failure_code,
    "transient",
  );
});
test("pause is visible, owner offboarding preserves service-owned automation then pauses without it", async () => {
  const x = await setup();
  await x.engine.ownerOffboarded("user_1", ["aut_1"]);
  assert.equal((await x.store.getDefinition("aut_1"))?.state, "active");
  x.principals.value = undefined;
  await x.engine.ownerOffboarded("user_1", ["aut_1"]);
  assert.equal((await x.store.getDefinition("aut_1"))?.state, "paused");
  await assert.rejects(() => x.engine.ingest(envelope()), /automation_paused/);
  assert.equal(x.notifications.values.at(-1)?.kind, "automation_paused");
});
test("signed webhook rejects tampering and replay outside the time window", () => {
  const raw = '{"event":"invoice"}',
    secret = "test-secret",
    timestamp = 1_783_774_800,
    now = new Date(timestamp * 1000);
  const signature = signWebhook(secret, timestamp, raw);
  assert.doesNotThrow(() =>
    verifySignedWebhook({
      secret,
      timestamp: String(timestamp),
      signature,
      rawBody: raw,
      now,
    }),
  );
  assert.throws(
    () =>
      verifySignedWebhook({
        secret,
        timestamp: String(timestamp),
        signature,
        rawBody: raw + "x",
        now,
      }),
    /invalid_signature/,
  );
  assert.throws(
    () =>
      verifySignedWebhook({
        secret,
        timestamp: String(timestamp),
        signature,
        rawBody: raw,
        now: new Date(now.getTime() + 301000),
      }),
    /stale_timestamp/,
  );
});
test("timezone scheduler skips nonexistent spring time and selects one fall occurrence", () => {
  const spring = nextScheduledAt(
    { time_zone: "America/Chicago", hour: 2, minute: 30 },
    new Date("2026-03-08T05:00:00Z"),
  );
  assert.equal(spring.toISOString(), "2026-03-09T07:30:00.000Z");
  const fall = nextScheduledAt(
    { time_zone: "America/Chicago", hour: 1, minute: 30 },
    new Date("2026-11-01T05:00:00Z"),
  );
  assert.equal(fall.toISOString(), "2026-11-01T06:30:00.000Z");
  const afterFirst = nextScheduledAt(
    { time_zone: "America/Chicago", hour: 1, minute: 30 },
    fall,
  );
  assert.equal(afterFirst.toISOString(), "2026-11-02T07:30:00.000Z");
});

test("manual test run uses the ordinary runtime but suppresses external destinations", async () => {
  const x = await setup();
  await x.engine.ingest({ ...envelope("manual_test"), kind: "manual", test: true });
  const result = await x.engine.runNext("test-worker");
  assert.equal(result?.state, "completed");
  assert.equal(x.runtime.starts, 1);
  assert.deepEqual(x.destinations.deliveries, []);
});

test("Composio events are normalized before durable deduplication", async () => {
  const x = await setup();
  const port = {
    async normalize(_payload: Readonly<Record<string, unknown>>, received_at: string) {
      return { kind: "composio" as const, source: "composio:gmail", source_event_id: "provider_evt_7", occurred_at: received_at, received_at, payload: { message_id: "m7" }, correlation_id: "cor_m7" };
    },
  };
  const first = await x.engine.ingestComposio("org_1", "aut_1", { provider: "gmail" }, port);
  const replay = await x.engine.ingestComposio("org_1", "aut_1", { provider: "gmail" }, port);
  assert.equal(first.execution.id, replay.execution.id);
  assert.equal(replay.duplicate, true);
  assert.deepEqual(replay.execution.input, { message_id: "m7" });
});
