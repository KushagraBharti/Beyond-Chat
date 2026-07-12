import assert from "node:assert/strict";
import test from "node:test";
import { StructuralValidationAdapter, type OutputVersion } from "../src/index.ts";

const base = { schema_version: "1.0", id: "version_eval", output_id: "output_eval", branch_id: "branch_main", ordinal: 1, parent_version_id: null, content_hash: "hash", checkpoint_label: "eval", created_by: "eval", created_at: "2026-07-11T00:00:00.000Z" } as const;
test("quality eval rejects empty documents and inaccessible images", async () => {
  const validator = new StructuralValidationAdapter();
  const empty = await validator.validate({ ...base, payload: { kind: "document", blocks: [] } } satisfies OutputVersion, base.created_at); assert.equal(empty.status, "failed");
  const image = await validator.validate({ ...base, payload: { kind: "image", asset: { storage_key: "x", media_type: "image/png", width: 1200, height: 800, alt_text: "" } } } satisfies OutputVersion, base.created_at); assert.equal(image.status, "failed");
});
