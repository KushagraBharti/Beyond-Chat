import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { queryDiscovery } from "@beyond/product-catalog";
import { discoveryItems, outputTemplates, promotionStorageKey, takePromotionDraft } from "../../features/workspace/adapter";
import { WorkspaceLayout } from "./WorkspaceShell";
import { AdminPage, ChatWorkspacePage, KnowledgeAppsPage, WorkDetailPage } from "../../pages/workspace";
import { canAccessAdmin, workspaceRole } from "../../features/workspace/adapter";

let userMetadata: Record<string, unknown> = {};
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { email: "member@example.com", user_metadata: userMetadata } }),
}));
vi.mock("../../features/workspace/ProjectContext", () => ({
  useProjects: () => ({
    projects: [{ id: "proj-1", organizationId: "org-1", name: "Launch", slug: "launch", description: null, visibility: "organization", createdBy: null, createdAt: null, updatedAt: null }],
    status: "ready", message: null,
    currentProject: { id: "proj-1", organizationId: "org-1", name: "Launch", slug: "launch", description: null, visibility: "organization", createdBy: null, createdAt: null, updatedAt: null },
    selectProject: vi.fn(), reload: vi.fn(),
  }),
}));

function LocationProbe() { return <output data-testid="location">{useLocation().pathname}</output>; }

describe("unified workspace shell", () => {
  it("uses canonical navigation and hides Admin for members", () => {
    userMetadata = {};
    render(<MemoryRouter initialEntries={["/home"]}><Routes><Route element={<WorkspaceLayout />}><Route path="/home" element={<div>Home body</div>} /></Route></Routes></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("resolves typed slash discovery with keyboard insertion and removable chips", () => {
    render(<MemoryRouter><ChatWorkspacePage /></MemoryRouter>);
    const composer = screen.getByRole("textbox", { name: "Chat message" });
    fireEvent.change(composer, { target: { value: "/research" } });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(composer, { key: "Enter" });
    expect(screen.getByRole("button", { name: /agent: Research/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /agent: Research/i }));
    expect(screen.queryByRole("button", { name: /agent: Research/i })).not.toBeInTheDocument();
  });

  it("promotes the chat draft without claiming a run started", () => {
    sessionStorage.clear();
    render(<MemoryRouter initialEntries={["/chat"]}><Routes><Route path="/chat" element={<ChatWorkspacePage />} /><Route path="/work/new" element={<LocationProbe />} /></Routes></MemoryRouter>);
    fireEvent.change(screen.getByRole("textbox", { name: "Chat message" }), { target: { value: "Create a launch brief" } });
    fireEvent.click(screen.getByRole("button", { name: "Promote to Work" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/work/new");
    expect(takePromotionDraft()).toMatchObject({ prompt: "Create a launch brief", source: "chat" });
    expect(sessionStorage.getItem(promotionStorageKey)).toBeNull();
  });

  it("keeps discovery truthful: no fixture connections exist in the built-in set", () => {
    expect(queryDiscovery(discoveryItems, "/notion")).toEqual([]);
    render(<MemoryRouter><ChatWorkspacePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Show reconnect state" }));
    expect(screen.getByText("Connection paused")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Promote to Work" })).toBeDisabled();
  });

  it("never renders fixture tasks: every work id is truthfully unavailable", () => {
    render(<MemoryRouter initialEntries={["/work/work.q3-model"]}><WorkDetailPage /></MemoryRouter>);
    expect(screen.getByText("This task is not available.")).toBeInTheDocument();
    expect(screen.queryByText("Q3 scenario model")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("denies Admin to a member without silently redirecting", () => {
    userMetadata = {};
    render(<MemoryRouter initialEntries={["/admin"]}><Routes><Route path="/admin" element={<AdminPage />} /></Routes></MemoryRouter>);
    expect(screen.getByText("You do not have access")).toBeInTheDocument();
  });

  it("models the planned role hierarchy and keeps Admin denied by default", () => {
    expect(workspaceRole({})).toBe("member");
    expect(canAccessAdmin("owner")).toBe(true);
    expect(canAccessAdmin("admin")).toBe(true);
    expect(canAccessAdmin("builder")).toBe(false);
    expect(canAccessAdmin("viewer")).toBe(false);
  });

  it("uses listbox activedescendant and returns focus after a selection", () => {
    render(<MemoryRouter><ChatWorkspacePage /></MemoryRouter>);
    const composer = screen.getByRole("textbox", { name: "Chat message" });
    fireEvent.change(composer, { target: { value: "/research" } });
    const listbox = screen.getByRole("listbox");
    expect(composer).toHaveAttribute("aria-controls", listbox.id);
    expect(composer).toHaveAttribute("aria-activedescendant");
    fireEvent.keyDown(composer, { key: "Enter" });
    expect(composer).toHaveFocus();
  });

  it("opens browse commands as catalog views instead of inserting misleading chips", () => {
    render(<MemoryRouter initialEntries={["/chat"]}><Routes><Route path="/chat" element={<ChatWorkspacePage />} /><Route path="/knowledge-apps" element={<><LocationProbe /><KnowledgeAppsPage /></>} /></Routes></MemoryRouter>);
    const composer = screen.getByRole("textbox", { name: "Chat message" });
    fireEvent.change(composer, { target: { value: "/skills" } });
    fireEvent.keyDown(composer, { key: "Enter" });
    expect(screen.getByTestId("location")).toHaveTextContent("/knowledge-apps");
    expect(screen.getByRole("tab", { name: "Skills" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("button", { name: /command: skills/i })).not.toBeInTheDocument();
  });

  it("supports roving keyboard selection across Knowledge & Apps tabs", () => {
    render(<MemoryRouter initialEntries={["/knowledge-apps?view=apps"]}><KnowledgeAppsPage /></MemoryRouter>);
    const apps = screen.getByRole("tab", { name: "Apps" });
    apps.focus();
    fireEvent.keyDown(apps, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Skills" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Skills" })).toHaveAttribute("aria-selected", "true");
  });

  it("does not substitute fixture outputs for a new or unknown task", () => {
    const { unmount } = render(<MemoryRouter initialEntries={["/work/new"]}><Routes><Route path="/work/:workId" element={<WorkDetailPage />} /></Routes></MemoryRouter>);
    expect(screen.queryByRole("tab", { name: "Launch brief" })).not.toBeInTheDocument();
    unmount();
    render(<MemoryRouter initialEntries={["/work/unknown"]}><Routes><Route path="/work/:workId" element={<WorkDetailPage />} /></Routes></MemoryRouter>);
    expect(screen.getByText("This task is not available.")).toBeInTheDocument();
    expect(screen.queryByText("Market entry brief")).not.toBeInTheDocument();
  });

  it("keeps every canonical output type available as a template, never as navigation", () => {
    expect(outputTemplates.map((template) => template.output_type)).toEqual(
      expect.arrayContaining(["document", "spreadsheet", "presentation", "chart", "image"]),
    );
  });
});
