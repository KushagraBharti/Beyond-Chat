import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authState, api, projectState } = vi.hoisted(() => ({
  authState: { session: null as unknown, refreshSession: vi.fn() },
  api: {
    getWorkspaceCapabilities: vi.fn(),
    listOrganizationRecent: vi.fn(),
    getOrganizationCatalog: vi.fn(),
  },
  projectState: {
    projects: [] as unknown[],
    status: "ready" as string,
    message: null as string | null,
    currentProject: null,
    selectProject: vi.fn(),
    reload: vi.fn(),
  },
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("../../features/workspace/ProjectContext", () => ({ useProjects: () => projectState }));
vi.mock("../../features/workspace/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../features/workspace/api")>();
  return { ...original, ...api };
});

import { HomeWorkspacePage } from "./HomeWorkspacePage";

function record(id: string, kind: string, name: string, state = "draft") {
  return {
    id, kind, state, version: 1,
    scope: { organization_id: "org-a", project_id: "proj-1", team_id: null },
    payload: { name }, created_by: "p",
    created_at: "2026-07-12T00:00:00Z", updated_at: "2026-07-12T00:00:00Z",
  };
}

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  authState.session = { profileId: "p", email: "u@example.com", organizationId: "org-a", workosOrganizationId: "org_w", role: "member" };
  projectState.projects = [];
  projectState.status = "ready";
  api.getWorkspaceCapabilities.mockResolvedValue({
    runtime_execution: false,
    providers: {
      models: { state: "unavailable", externally_verified: false },
      retrieval: { state: "unavailable", externally_verified: false },
      actions: { state: "unavailable", externally_verified: false },
      billing: { state: "unavailable", externally_verified: false },
    },
  });
  api.listOrganizationRecent.mockResolvedValue({ items: [] });
  api.getOrganizationCatalog.mockResolvedValue({ built_in_agents: [], skills: [], tools: [], apps: [], mcp_servers: [] });
});

describe("HomeWorkspacePage", () => {
  it("renders truthful empty sections for a brand-new organization", async () => {
    render(<MemoryRouter><HomeWorkspacePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/No approvals are waiting/i)).toBeInTheDocument());
    expect(screen.getByText(/Durable agent runs are not yet enabled/i)).toBeInTheDocument();
    expect(screen.getByText(/No outputs exist yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No projects yet/i)).toBeInTheDocument();
    // The old hardcoded fixture data must never reappear.
    expect(screen.queryByText("Market entry brief")).not.toBeInTheDocument();
    expect(screen.queryByText("Q3 scenario model")).not.toBeInTheDocument();
    expect(screen.queryByText(/Notion is a disconnected fixture/i)).not.toBeInTheDocument();
  });

  it("keeps the rest of the dashboard usable when one section fails", async () => {
    api.listOrganizationRecent.mockImplementation((surface: string) =>
      surface === "outputs"
        ? Promise.reject(new Error("outputs backend down"))
        : Promise.resolve({ items: surface === "approvals" ? [record("a1", "capability_approval", "Send email approval", "pending")] : [] }),
    );
    render(<MemoryRouter><HomeWorkspacePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/outputs backend down/i)).toBeInTheDocument());
    expect(await screen.findByText("Send email approval")).toBeInTheDocument();
    expect(screen.getByText(/No automations are configured/i)).toBeInTheDocument();
  });

  it("marks built-in agents as runtime-unavailable until the server says otherwise", async () => {
    render(<MemoryRouter><HomeWorkspacePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText(/runtime not enabled/i).length).toBeGreaterThan(0));
  });

  it("lists real projects from the project context", async () => {
    projectState.projects = [{
      id: "proj-9", organizationId: "org-a", name: "Launch plan", slug: "launch-plan",
      description: null, visibility: "organization", createdBy: "p", createdAt: null, updatedAt: null,
    }];
    render(<MemoryRouter><HomeWorkspacePage /></MemoryRouter>);
    expect(await screen.findByText("Launch plan")).toBeInTheDocument();
  });
});
