import assert from "node:assert/strict";
import test from "node:test";
import { CollaborationError, DeterministicRenderAdapter, InMemoryCollaborationPersistence, InMemoryRealtime, InMemoryYjsProvider, OutputCollaborationService, StructuralValidationAdapter, type OutputActor } from "../src/index.ts";

const NOW = "2026-07-11T12:00:00.000Z";
const owner: OutputActor = { organization_id: "org_1", project_id: "project_1", user_id: "user_owner" };
const editor: OutputActor = { ...owner, user_id: "user_editor" };
const reviewer: OutputActor = { ...owner, user_id: "user_reviewer" };
const document = (text: string) => ({ kind: "document" as const, blocks: [{ id: "p1", type: "paragraph" as const, text }] });

function fixture() {
  const persistence = new InMemoryCollaborationPersistence(); const realtime = new InMemoryRealtime();
  let service!: OutputCollaborationService;
  const provider = new InMemoryYjsProvider(async (roomId, actor) => {
    try { const snapshot = await service.inspect(actor); return snapshot.outputs.some((item) => item.id === roomId) && snapshot.shares.some((grant) => grant.user_id === actor.user_id && grant.permissions.includes("edit") && !grant.revoked_at); } catch { return false; }
  });
  service = new OutputCollaborationService(persistence, new DeterministicRenderAdapter(), new StructuralValidationAdapter(), realtime, provider);
  return { persistence, realtime, provider, service };
}

test("versions are immutable, idempotent, conflict checked, diffable and restorable", async () => {
  const { service } = fixture();
  const output = await service.createOutput(owner, { title: "Launch brief", payload: document("Draft"), idempotency_key: "create-1", now: NOW });
  const duplicate = await service.createOutput(owner, { title: "Launch brief", payload: document("Draft"), idempotency_key: "create-1", now: NOW }); assert.equal(duplicate.id, output.id);
  const second = await service.checkpoint(owner, { output_id: output.id, expected_head_version_id: output.head_version_id, payload: document("Reviewed draft"), label: "Reviewer pass", idempotency_key: "checkpoint-1", now: NOW });
  assert.ok((await service.compare(owner, output.head_version_id, second.id)).some((change) => change.path.endsWith(".text")));
  await assert.rejects(service.checkpoint(owner, { output_id: output.id, expected_head_version_id: output.head_version_id, payload: document("Stale write"), label: "stale", idempotency_key: "checkpoint-stale", now: NOW }), (error: unknown) => error instanceof CollaborationError && error.code === "version.conflict");
  const restored = await service.restore(owner, output.id, output.head_version_id, second.id, NOW); assert.equal(restored.payload.kind, "document"); assert.equal(restored.payload.blocks[0].text, "Draft");
});

test("typed render and validation report truthful presentation limitations", async () => {
  const { service } = fixture();
  const output = await service.createOutput(owner, { title: "Board deck", payload: { kind: "presentation", slides: [{ id: "s1", title: "Plan", elements: [] }] }, idempotency_key: "deck", now: NOW });
  const result = await service.renderAndValidate(owner, output.head_version_id, NOW); assert.equal(result.render.capability, "preview_only"); assert.equal(result.render.storage_key, null); assert.equal(result.validation.status, "warning");
});

test("two users co-edit and comment deterministically, then revoke without corrupting durable state", async () => {
  const { service, provider, realtime } = fixture(); const output = await service.createOutput(owner, { title: "Shared memo", payload: document("Base"), idempotency_key: "shared", now: NOW });
  await service.share(owner, owner.project_id, editor.user_id, ["view", "comment", "edit"], NOW); await service.share(owner, owner.project_id, reviewer.user_id, ["view", "comment", "review"], NOW);
  const first = await provider.connect(output.id, owner); const second = await provider.connect(output.id, editor);
  await Promise.all([first.apply([{ kind: "insert", op_id: "op_b", after_id: null, value: "B" }]), second.apply([{ kind: "insert", op_id: "op_a", after_id: null, value: "A" }])]);
  assert.equal((await first.snapshot()).text, "AB"); assert.equal((await second.snapshot()).text, "AB");
  const comment = await service.comment(editor, { output_id: output.id, version_id: output.head_version_id, body: "Please verify this claim.", anchor: { kind: "text", reference: { block_id: "p1", from: 0, to: 4 } }, mentions: [reviewer.user_id], now: NOW }); assert.deepEqual(comment.mentions, [reviewer.user_id]);
  await service.revoke(owner, owner.project_id, editor.user_id, NOW);
  await assert.rejects(second.apply([{ kind: "insert", op_id: "op_c", after_id: "op_b", value: "C" }]), /permission_revoked/);
  assert.equal((await first.snapshot()).text, "AB"); await assert.rejects(service.comment(editor, { output_id: output.id, version_id: output.head_version_id, body: "late", anchor: { kind: "text", reference: {} }, now: NOW }), /permission.denied/);
  assert.ok(realtime.revoked.has(`${owner.project_id}:${editor.user_id}`)); assert.equal((await service.inspect(owner)).comments.length, 1);
});

test("review, branch and promote preserve immutable histories", async () => {
  const { service } = fixture(); const output = await service.createOutput(owner, { title: "Forecast", payload: document("v1"), idempotency_key: "forecast", now: NOW });
  await service.share(owner, owner.project_id, reviewer.user_id, ["view", "comment", "review"], NOW); const review = await service.requestReview(owner, output.id, output.head_version_id, reviewer.user_id, NOW); const decided = await service.decideReview(reviewer, review.id, "changes_requested", "Add assumptions", NOW); assert.equal(decided.status, "changes_requested");
  const branch = await service.branch(owner, output.id, output.head_version_id, "assumptions", NOW); const version = await service.checkpoint(owner, { output_id: output.id, expected_head_version_id: output.head_version_id, payload: document("v2 assumptions"), label: "branch checkpoint", idempotency_key: "branch-checkpoint", branch_id: branch, now: NOW }); const promoted = await service.promote(owner, output.id, version.id, version.id, NOW); assert.equal(promoted.promoted_branch_id, branch);
});

test("spreadsheet, data/chart and image validations are domain aware", async () => {
  const { service } = fixture();
  const payloads = [
    { kind: "spreadsheet" as const, sheets: [{ id: "sheet_1", name: "Model", cells: { A1: { value: 42, formula: "=40+2" } } }] },
    { kind: "data_chart" as const, columns: [{ name: "month", type: "string" as const }], rows: [{ month: "Jul" }], chart: { type: "bar" as const, x: "month", y: [] } },
    { kind: "image" as const, asset: { storage_key: "outputs/chart.png", media_type: "image/png", width: 1200, height: 800, alt_text: "Revenue chart" } },
  ];
  for (const [index, payload] of payloads.entries()) { const output = await service.createOutput(owner, { title: payload.kind, payload, idempotency_key: `typed-${index}`, now: NOW }); assert.equal((await service.renderAndValidate(owner, output.head_version_id, NOW)).validation.status, "passed"); }
});
