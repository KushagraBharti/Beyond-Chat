import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { InMemoryMemoryPersistence, MemoryService, type MemoryActor, type MemoryPolicy } from "../src/index.ts";

interface Fixture { id: string; query: string; memory: string; updated_at?: string; expires_at?: string; expected_recall: boolean }
const fixtures = JSON.parse(await readFile(new URL("../../../fixtures/phase8-memory/evals.json", import.meta.url), "utf8")) as Fixture[];
const actor: MemoryActor = { organization_id: "org_eval", user_id: "user_eval", project_id: "project_eval", team_ids: [], agent_audience: "personal", attached_personal_space_ids: [] };
const policy: MemoryPolicy = { team_memory_enabled: false, allow_sensitive_memory: false, allow_restricted_memory: false, default_retention_days: null, max_recall_age_days: 90 };
const now = "2026-07-11T12:00:00.000Z";

for (const fixture of fixtures) test(`memory eval: ${fixture.id}`, async () => {
  const service = new MemoryService(new InMemoryMemoryPersistence(), policy);
  const createdAt = fixture.updated_at ?? now;
  const space = await service.createSpace(actor, { scope: { kind: "user", organization_id: actor.organization_id, owner_id: actor.user_id }, label: "Eval memory", now: createdAt });
  const proposal = await service.remember({ actor, space_id: space.id, type: "preference", key: "memo-format", content: fixture.memory, provenance: { source_event_ids: ["evt_eval"], source_run_id: "run_eval", source_output_id: null, created_by_user_id: actor.user_id }, expires_at: fixture.expires_at, now: createdAt });
  await service.accept(actor, proposal.id, createdAt);
  const recalled = await service.recall({ actor, query: fixture.query, now });
  assert.equal(recalled.length > 0, fixture.expected_recall);
});
