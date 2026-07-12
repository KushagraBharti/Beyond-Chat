import assert from "node:assert/strict";
import test from "node:test";
import { assertNoAliasCollisions, builtInDiscoveryItems, parseInvocation, queryDiscovery, serializeDiscovery, type DiscoveryItem } from "../src/index.ts";

const org = "org_0123456789AB" as never;
const project = "prj_0123456789AB" as never;
const references: readonly DiscoveryItem[] = Object.freeze([
  { id: "project.launch", version: "1.0.0", kind: "project", label: "Launch", aliases: Object.freeze(["launch-plan"]), intent: "select_project", state: "ready", scope: { organization_id: org, project_id: project } },
  { id: "source.market", version: "1.0.0", kind: "source", label: "Market", aliases: Object.freeze([]), intent: "attach", state: "ready", scope: { organization_id: org, project_id: project } },
  { id: "file.brief", version: "1.0.0", kind: "file", label: "brief.pdf", aliases: Object.freeze(["brief"]), intent: "attach", state: "ready", scope: { organization_id: org, project_id: project } },
]);

test("parser resolves slash aliases and typed mention references without executing them", () => {
  const mcp: DiscoveryItem = { id: "mcp_tool.search", version: "1.0.0", kind: "mcp_tool", label: "Search", aliases: Object.freeze(["search-server"]), intent: "attach", state: "ready" };
  const parsed = parseInvocation("/agent finance @Research /project launch #source:market #file:brief /mcp search /document /work", [...builtInDiscoveryItems(), ...references, mcp]);
  assert.equal(parsed.errors.length, 0);
  assert.deepEqual(parsed.intents.map((intent) => intent.stable_id), ["agent.finance", "agent.research", "project.launch", "source.market", "file.brief", "mcp_tool.search", "command.document", "command.work"]);
  assert.equal(parsed.intents.every((intent) => intent.state === "ready"), true);
});

test("parser reports unknown, malformed, and ambiguous references truthfully", () => {
  const unknown = parseInvocation("/not-a-command @nobody #source:", builtInDiscoveryItems());
  assert.equal(unknown.errors.length, 3);
  assert.equal(unknown.errors.some((error) => error.code === "invalid_reference"), true);
  const ambiguous: DiscoveryItem[] = [
    { id: "project.alpha", version: "1.0.0", kind: "project", label: "Alpha", aliases: Object.freeze([]), intent: "select_project", state: "ready" },
    { id: "source.alpha", version: "1.0.0", kind: "source", label: "Alpha", aliases: Object.freeze([]), intent: "attach", state: "ready" },
  ];
  assert.equal(parseInvocation("#alpha", ambiguous).errors[0]?.code, "ambiguous");
});

test("alias collisions are rejected within a typed namespace", () => {
  const collision: DiscoveryItem[] = [
    { id: "agent.one", version: "1.0.0", kind: "agent", label: "One", aliases: Object.freeze(["same"]), intent: "invoke_agent", state: "ready" },
    { id: "agent.two", version: "1.0.0", kind: "agent", label: "Two", aliases: Object.freeze(["same"]), intent: "invoke_agent", state: "ready" },
  ];
  assert.throws(() => assertNoAliasCollisions(collision), /Alias collision/);
  assert.doesNotThrow(() => assertNoAliasCollisions(builtInDiscoveryItems()));
});

test("ranking and serialization are stable, scoped, and keyboard metadata does not lie", () => {
  const items: readonly DiscoveryItem[] = Object.freeze([
    { id: "app.drive", version: "1.0.0", kind: "app", label: "Drive", aliases: Object.freeze(["google drive"]), intent: "attach", state: "disconnected", state_reason: "Reconnect Drive first." },
    { id: "app.drive-archive", version: "1.0.0", kind: "app", label: "Drive archive", aliases: Object.freeze([]), intent: "attach", state: "ready" },
    ...references,
  ]);
  const first = queryDiscovery(items, "drive", { organization_id: org, project_id: project });
  const second = queryDiscovery(items, "drive", { organization_id: org, project_id: project });
  assert.deepEqual(first.map((result) => result.id), ["app.drive", "app.drive-archive"]);
  assert.equal(first[0].keyboard.is_selectable, false);
  assert.equal(first[0].keyboard.selection_behavior, "unavailable");
  assert.equal(serializeDiscovery(first), serializeDiscovery(second));
  assert.equal(queryDiscovery(items, "market", { organization_id: org }).length, 0);
  const disabled: DiscoveryItem = { id: "tool.publish", version: "1.0.0", kind: "tool", label: "Publish", aliases: Object.freeze([]), intent: "attach", state: "disabled", state_reason: "Organization policy disabled this tool." };
  const approval: DiscoveryItem = { id: "tool.send", version: "1.0.0", kind: "tool", label: "Send", aliases: Object.freeze([]), intent: "attach", state: "approval_required", state_reason: "Approval is required before use." };
  assert.equal(queryDiscovery([disabled], "publish")[0]?.keyboard.selection_behavior, "unavailable");
  assert.equal(queryDiscovery([approval], "send")[0]?.keyboard.selection_behavior, "request_approval");
});
