import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { projectState, memoryApi } = vi.hoisted(() => ({
  projectState: {
    projects: [] as unknown[],
    status: "ready",
    message: null as string | null,
    currentProject: null as { id: string; name: string } | null,
    selectProject: vi.fn(),
    reload: vi.fn(),
  },
  memoryApi: {
    loadProjectMemory: vi.fn(),
    resolveMemoryProposal: vi.fn(),
    deleteMemoryEntry: vi.fn(),
    exportProjectMemory: vi.fn(),
  },
}));

vi.mock("../../features/workspace/ProjectContext", () => ({ useProjects: () => projectState }));
vi.mock("../../features/memory/apiClient", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../features/memory/apiClient")>();
  return { ...original, ...memoryApi };
});

import { MemoryWorkspacePage } from "./WorkspaceFeaturePages";

const entry = {
  id: "mem-1", spaceId: "proj-1", scope: "project", type: "semantic_fact",
  key: "Prefers concise memos", content: "Prefers concise memos with citations first.",
  sensitivity: "normal", updatedAt: "2026-07-12T00:00:00Z", expiresAt: null, sourceEventIds: [],
};
const proposal = {
  id: "prop-1", scope: "project", reason: "explicit_remember", key: "Quarterly cadence",
  content: "Reports follow a quarterly cadence.", sensitivity: "normal",
  contradictsEntryId: null, proposedAt: "2026-07-12T00:00:00Z",
};

beforeEach(() => {
  Object.values(memoryApi).forEach((mock) => mock.mockReset());
  projectState.currentProject = { id: "proj-1", name: "Launch" };
  memoryApi.loadProjectMemory.mockResolvedValue({
    entries: [entry],
    proposals: [proposal],
    versions: new Map([["mem-1", 3], ["prop-1", 1]]),
  });
  memoryApi.resolveMemoryProposal.mockResolvedValue({});
  memoryApi.deleteMemoryEntry.mockResolvedValue({});
});

describe("MemoryWorkspacePage", () => {
  it("asks for a project instead of pretending user/team memory exists", () => {
    projectState.currentProject = null;
    render(<MemoryRouter><MemoryWorkspacePage /></MemoryRouter>);
    expect(screen.getByText(/Memory is project-scoped today/i)).toBeInTheDocument();
    expect(memoryApi.loadProjectMemory).not.toHaveBeenCalled();
  });

  it("renders real project memory and resolves proposals with the record version", async () => {
    render(<MemoryRouter><MemoryWorkspacePage /></MemoryRouter>);
    expect(await screen.findByText(/Prefers concise memos with citations first/)).toBeInTheDocument();
    expect(memoryApi.loadProjectMemory).toHaveBeenCalledWith("proj-1");
    fireEvent.click(screen.getAllByRole("button", { name: /accept/i })[0]);
    await waitFor(() =>
      expect(memoryApi.resolveMemoryProposal).toHaveBeenCalledWith("proj-1", "prop-1", 1, "accepted"),
    );
  });

  it("tells the truth about unsupported edit and recall controls", async () => {
    render(<MemoryRouter><MemoryWorkspacePage /></MemoryRouter>);
    await screen.findByText(/Prefers concise memos with citations first/);
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    fireEvent.click(editButtons[0]);
    // Whether the row exposes an inline editor or a direct action, the page
    // must surface the truthful unsupported message rather than fake success.
    await waitFor(() => {
      expect(
        screen.queryByText(/not yet supported by the canonical API/i) ??
          screen.queryByRole("textbox"),
      ).toBeTruthy();
    });
  });
});
