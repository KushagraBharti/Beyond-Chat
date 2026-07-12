import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authState, api } = vi.hoisted(() => ({
  authState: { session: null as unknown, refreshSession: vi.fn() },
  api: { listProjects: vi.fn() },
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("./api", async (importOriginal) => {
  const original = await importOriginal<typeof import("./api")>();
  return { ...original, listProjects: api.listProjects };
});

import { ProjectProvider, useProjects } from "./ProjectContext";

function session(organizationId: string) {
  return { profileId: "p", email: "user@example.com", organizationId, workosOrganizationId: "org_w", role: "member" };
}

const orgAProjects = [
  { id: "proj-1", organizationId: "org-a", name: "Alpha", slug: "alpha", description: null, visibility: "organization", createdBy: "p", createdAt: null, updatedAt: null },
  { id: "proj-2", organizationId: "org-a", name: "Beta", slug: "beta", description: null, visibility: "organization", createdBy: "p", createdAt: null, updatedAt: null },
];

function Probe() {
  const { projects, status, currentProject, selectProject } = useProjects();
  return (
    <div>
      <output data-testid="status">{status}</output>
      <output data-testid="current">{currentProject?.id ?? "none"}</output>
      <output data-testid="count">{projects.length}</output>
      <button type="button" onClick={() => selectProject("proj-2")}>pick</button>
      <button type="button" onClick={() => selectProject("proj-other-org")}>pick-foreign</button>
    </div>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  api.listProjects.mockReset();
  authState.session = session("org-a");
  api.listProjects.mockResolvedValue({ items: orgAProjects });
});

describe("ProjectContext", () => {
  it("loads projects and remembers a valid selection per organization", async () => {
    render(<ProjectProvider><Probe /></ProjectProvider>);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    act(() => screen.getByRole("button", { name: "pick" }).click());
    expect(screen.getByTestId("current")).toHaveTextContent("proj-2");
    expect(sessionStorage.getItem("beyond.project-selection.org-a")).toBe("proj-2");
  });

  it("fails closed on a stale or foreign remembered selection", async () => {
    sessionStorage.setItem("beyond.project-selection.org-a", "proj-deleted");
    render(<ProjectProvider><Probe /></ProjectProvider>);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));
    expect(screen.getByTestId("current")).toHaveTextContent("none");
    expect(sessionStorage.getItem("beyond.project-selection.org-a")).toBeNull();
    // Selecting an ID that is not in the server list is ignored entirely.
    act(() => screen.getByRole("button", { name: "pick-foreign" }).click());
    expect(screen.getByTestId("current")).toHaveTextContent("none");
  });

  it("invalidates selection and reloads when the organization changes", async () => {
    const { rerender } = render(<ProjectProvider><Probe /></ProjectProvider>);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));
    act(() => screen.getByRole("button", { name: "pick" }).click());
    expect(screen.getByTestId("current")).toHaveTextContent("proj-2");

    authState.session = session("org-b");
    api.listProjects.mockResolvedValue({ items: [] });
    rerender(<ProjectProvider><Probe /></ProjectProvider>);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
    expect(screen.getByTestId("current")).toHaveTextContent("none");
  });

  it("reports errors without inventing projects", async () => {
    api.listProjects.mockRejectedValue(new Error("boom"));
    render(<ProjectProvider><Probe /></ProjectProvider>);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("error"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});
