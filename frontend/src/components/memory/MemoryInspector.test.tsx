import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryInspector } from "./MemoryInspector";

const entry = { id: "mem_1", spaceId: "space_user", scope: "user" as const, type: "preference" as const, key: "writing-style", content: "Use short decision memos", sensitivity: "normal" as const, updatedAt: "2026-07-11T12:00:00.000Z", expiresAt: null, sourceEventIds: ["evt_1"] };
const actions = { onAcceptProposal: vi.fn(), onRejectProposal: vi.fn(), onEditEntry: vi.fn(), onDeleteEntry: vi.fn(), onSetSpaceEnabled: vi.fn(), onExport: vi.fn() };

describe("MemoryInspector", () => {
  it("explains recall and exposes explicit controls", () => {
    render(<MemoryInspector {...actions} entries={[entry]} proposals={[]} explanations={[{ entryId: entry.id, scope: "user", reasons: ["personal_owner", "2_query_terms_matched"], sourceEventIds: ["evt_1"], lastUpdatedAt: entry.updatedAt, score: .84 }]} />);
    expect(screen.getByText("Personal memory stays personal.")).toBeInTheDocument(); fireEvent.click(screen.getByText("Why was this recalled?")); expect(screen.getByText("84% match")).toBeInTheDocument(); expect(screen.getByText("Source events: evt_1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export my memory" })); expect(actions.onExport).toHaveBeenCalledOnce();
  });
  it("asks for delete confirmation and can disable recall", () => {
    render(<MemoryInspector {...actions} entries={[entry]} proposals={[]} />); fireEvent.click(screen.getByRole("button", { name: "Delete" })); expect(screen.getByRole("button", { name: "Delete now" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox")); expect(actions.onSetSpaceEnabled).toHaveBeenCalledWith("space_user", false);
  });
});
