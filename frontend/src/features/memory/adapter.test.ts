import { describe, expect, it } from "vitest";
import { filterMemoryEntries, memoryReasonLabel, memoryScopeLabels } from "./adapter";
import type { MemoryEntryView } from "./model";

const entries: MemoryEntryView[] = [
  { id: "mem_1", spaceId: "space_user", scope: "user", type: "preference", key: "writing-style", content: "Use short decision memos", sensitivity: "normal", updatedAt: "2026-07-11T12:00:00.000Z", expiresAt: null, sourceEventIds: ["evt_1"] },
  { id: "mem_2", spaceId: "space_project", scope: "project", type: "decision", key: "launch-date", content: "Target the October review window", sensitivity: "normal", updatedAt: "2026-07-11T12:00:00.000Z", expiresAt: null, sourceEventIds: ["evt_2"] },
];

describe("memory UI adapter", () => {
  it("filters by explicit scope and text", () => { expect(filterMemoryEntries(entries, "user", "decision")).toEqual([entries[0]]); expect(filterMemoryEntries(entries, "project", "decision")).toEqual([]); });
  it("uses plain-language scope and contradiction labels", () => { expect(memoryScopeLabels.user).toBe("Only me"); expect(memoryReasonLabel("contradiction")).toContain("Conflicts"); });
});
