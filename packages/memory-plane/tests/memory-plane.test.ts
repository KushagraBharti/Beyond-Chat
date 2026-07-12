import assert from "node:assert/strict";
import test from "node:test";
import {
  InMemoryMemoryPersistence, MemoryPolicyError, MemoryService,
  type MemoryActor, type MemoryPolicy, type MemoryScope,
} from "../src/index.ts";

const NOW = "2026-07-11T12:00:00.000Z";
const policy: MemoryPolicy = { team_memory_enabled: false, allow_sensitive_memory: true, allow_restricted_memory: false, default_retention_days: null, max_recall_age_days: 90 };
const personal: MemoryActor = { organization_id: "org_1", user_id: "user_1", project_id: "project_1", team_ids: ["team_1"], agent_audience: "personal", attached_personal_space_ids: [] };
const shared: MemoryActor = { ...personal, agent_audience: "shared" };
const provenance = { source_event_ids: ["evt_42"], source_run_id: "run_8", source_output_id: null, created_by_user_id: "user_1" };
const scope = (kind: "user" | "project" | "team"): MemoryScope => kind === "user"
  ? { kind, organization_id: "org_1", owner_id: "user_1" }
  : kind === "project"
    ? { kind, organization_id: "org_1", owner_id: "user_1", project_id: "project_1" }
    : { kind, organization_id: "org_1", owner_id: "team_1", team_id: "team_1" };

async function acceptedFixture(kind: "user" | "project" = "user", content = "Use concise executive summaries") {
  const persistence = new InMemoryMemoryPersistence(); const service = new MemoryService(persistence, policy);
  const space = await service.createSpace(personal, { scope: scope(kind), label: `${kind} memory`, now: NOW });
  const proposal = await service.remember({ actor: personal, space_id: space.id, type: "preference", key: "writing-style", content, provenance, now: NOW });
  const entry = await service.accept(personal, proposal.id, NOW); return { persistence, service, space, proposal, entry };
}

test("explicit remember remains a proposal until accepted and records provenance", async () => {
  const persistence = new InMemoryMemoryPersistence(); const service = new MemoryService(persistence, policy);
  const space = await service.createSpace(personal, { scope: scope("user"), label: "My memory", now: NOW });
  const proposal = await service.remember({ actor: personal, space_id: space.id, type: "preference", key: "tone", content: "Write directly", provenance, now: NOW });
  assert.equal(proposal.status, "proposed"); assert.equal((await service.inspect()).entries.length, 0);
  const entry = await service.accept(personal, proposal.id, NOW);
  assert.equal(entry.status, "active"); assert.deepEqual(entry.provenance.source_event_ids, ["evt_42"]); assert.equal((await service.inspect()).revisions.length, 1);
});

test("shared agents cannot receive personal memory without explicit attachment", async () => {
  const { service, space, entry } = await acceptedFixture();
  assert.deepEqual(await service.recall({ actor: shared, query: "executive summaries", now: NOW }), []);
  const audit = (await service.inspect()).retrievals.at(-1); assert.equal(audit?.denied.find((item) => item.entry_id === entry.id)?.reason, "personal_memory_not_attached");
  const attached = { ...shared, attached_personal_space_ids: [space.id] };
  const recalled = await service.recall({ actor: attached, query: "executive summaries", now: NOW });
  assert.equal(recalled.length, 1); assert.ok(recalled[0].explanation.reasons.includes("explicit_personal_attachment"));
});

test("project and organization mismatches never leak", async () => {
  const { service, entry } = await acceptedFixture("project");
  const wrongProject = { ...shared, project_id: "project_other" };
  assert.deepEqual(await service.recall({ actor: wrongProject, query: "executive summaries", now: NOW }), []);
  const wrongOrg = { ...shared, organization_id: "org_other" };
  assert.deepEqual(await service.recall({ actor: wrongOrg, query: "executive summaries", now: NOW }), []);
  const audits = (await service.inspect()).retrievals.slice(-2);
  assert.deepEqual(audits.map((audit) => audit.denied.find((item) => item.entry_id === entry.id)?.reason), ["project_mismatch", "organization_mismatch"]);
});

test("contradictions create review proposals and never silently overwrite", async () => {
  const { service, space, entry } = await acceptedFixture();
  const contradiction = await service.remember({ actor: personal, space_id: space.id, type: "preference", key: "writing-style", content: "Use detailed technical explanations", provenance, now: "2026-07-11T13:00:00.000Z" });
  assert.equal(contradiction.reason, "contradiction"); assert.equal(contradiction.contradicts_entry_id, entry.id);
  assert.equal((await service.inspect()).entries[0].content, "Use concise executive summaries");
  const updated = await service.accept(personal, contradiction.id, "2026-07-11T13:01:00.000Z");
  assert.equal(updated.content, "Use detailed technical explanations"); assert.equal((await service.inspect()).revisions.length, 2);
});

test("edit, disable, export, delete and cleanup are explicit user controls", async () => {
  const { persistence, service, space, entry } = await acceptedFixture();
  const edited = await service.edit(personal, entry.id, { content: "Use short decision memos" }, "2026-07-11T13:00:00.000Z"); assert.equal(edited.content, "Use short decision memos");
  await service.setSpaceEnabled(personal, space.id, false, "2026-07-11T13:01:00.000Z");
  assert.deepEqual(await service.recall({ actor: personal, query: "short decision", now: "2026-07-11T13:02:00.000Z" }), []);
  await service.setSpaceEnabled(personal, space.id, true, "2026-07-11T13:03:00.000Z");
  const exported = await service.export(personal, "2026-07-11T13:04:00.000Z"); assert.equal(exported.entries.length, 1); assert.equal(exported.revisions.length, 2);
  const deleted = await service.delete(personal, entry.id, "2026-07-11T13:05:00.000Z"); assert.equal(deleted.status, "deleted"); assert.equal(deleted.content, "");
  assert.equal(persistence.cleanupRequests.length, 1); assert.deepEqual((await service.export(personal, NOW)).entries, []);
  assert.deepEqual(await service.recall({ actor: personal, query: "short decision", now: "2026-07-11T13:06:00.000Z" }), []);
});

test("compaction references durable events without replacing them", async () => {
  const persistence = new InMemoryMemoryPersistence(); const service = new MemoryService(persistence, policy);
  const space = await service.createSpace(personal, { scope: scope("project"), label: "Project memory", now: NOW });
  const events = [
    { event_id: "evt_10", run_id: "run_1", sequence: 10, occurred_at: NOW, summary_fragment: "Approved outline" },
    { event_id: "evt_11", run_id: "run_1", sequence: 11, occurred_at: NOW, summary_fragment: "Created memo" },
  ];
  const proposal = await service.proposeCompaction(personal, space.id, events, "The outline was approved before the memo was created.", NOW);
  assert.equal(proposal.status, "proposed"); assert.equal(proposal.reason, "compaction"); assert.deepEqual(proposal.provenance.source_event_ids, ["evt_10", "evt_11"]);
  assert.deepEqual(events.map((event) => event.event_id), ["evt_10", "evt_11"]);
});

test("team memory and restricted facts are policy gated", async () => {
  const service = new MemoryService(new InMemoryMemoryPersistence(), policy);
  await assert.rejects(service.createSpace(personal, { scope: scope("team"), label: "Team memory", now: NOW }), (error: unknown) => error instanceof MemoryPolicyError && error.code === "team.gated");
  const space = await service.createSpace(personal, { scope: scope("user"), label: "My memory", now: NOW });
  await assert.rejects(service.remember({ actor: personal, space_id: space.id, type: "semantic_fact", key: "credential", content: "Restricted fact", sensitivity: "restricted", provenance, now: NOW }), (error: unknown) => error instanceof MemoryPolicyError && error.code === "sensitivity.denied");
});

test("enabled team memory is limited to current team membership", async () => {
  const enabledPolicy = { ...policy, team_memory_enabled: true }; const service = new MemoryService(new InMemoryMemoryPersistence(), enabledPolicy);
  const space = await service.createSpace(personal, { scope: scope("team"), label: "Finance playbook", now: NOW });
  const proposal = await service.remember({ actor: personal, space_id: space.id, type: "procedure", key: "forecast-review", content: "Review forecast assumptions monthly", provenance, now: NOW }); await service.accept(personal, proposal.id, NOW);
  const outsider = { ...personal, team_ids: ["team_other"] };
  assert.deepEqual(await service.recall({ actor: outsider, query: "forecast assumptions", now: NOW }), []);
  assert.equal((await service.recall({ actor: personal, query: "forecast assumptions", now: NOW })).length, 1);
});

test("expiry fails closed at recall and the sweep schedules derived cleanup", async () => {
  const persistence = new InMemoryMemoryPersistence(); const service = new MemoryService(persistence, policy);
  const space = await service.createSpace(personal, { scope: scope("user"), label: "My memory", now: NOW });
  const proposal = await service.remember({ actor: personal, space_id: space.id, type: "semantic_fact", key: "temporary-office", content: "Use the west conference room", expires_at: "2026-07-12T00:00:00.000Z", provenance, now: NOW });
  const entry = await service.accept(personal, proposal.id, NOW);
  assert.deepEqual(await service.recall({ actor: personal, query: "west conference room", now: "2026-07-12T00:00:01.000Z" }), []);
  const expired = await service.expireDue("2026-07-12T00:00:01.000Z"); assert.equal(expired[0].status, "expired"); assert.equal(expired[0].id, entry.id);
  assert.equal(persistence.cleanupRequests[0].reason, "expired");
});

test("rejected proposals cannot be accepted", async () => {
  const persistence = new InMemoryMemoryPersistence(); const service = new MemoryService(persistence, policy);
  const space = await service.createSpace(personal, { scope: scope("user"), label: "My memory", now: NOW });
  const proposal = await service.remember({ actor: personal, space_id: space.id, type: "semantic_fact", key: "office", content: "Chicago", provenance, now: NOW });
  const rejected = await service.reject(personal, proposal.id, "Not useful", NOW); assert.equal(rejected.status, "rejected");
  await assert.rejects(service.accept(personal, proposal.id, NOW), (error: unknown) => error instanceof MemoryPolicyError && error.code === "proposal.decided");
});
