import { useMemo, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { AgentBuilderWorkspace } from "../../components/agent-builder";
import { AutomationWorkspace } from "../../components/automations";
import { CollaborationRail } from "../../components/collaboration/CollaborationRail";
import { PresenceStrip } from "../../components/collaboration/PresenceStrip";
import { MemoryInspector } from "../../components/memory";
import { OutputWorkbench } from "../../components/outputs/OutputWorkbench";
import { PageHeader, WorkspaceState } from "../../components/workspace/WorkspacePrimitives";
import { LiveAgentBuilderAdapter } from "../../features/agent-builder";
import { LiveAutomationAdapter } from "../../features/automations/liveAdapter";
import {
  deleteMemoryEntry,
  exportProjectMemory,
  loadProjectMemory,
  rememberInProject,
  resolveMemoryProposal,
  type MemoryRecords,
} from "../../features/memory/apiClient";
import type { OutputView } from "../../features/outputs/model";
import { integrationAvailability } from "../../features/integration/apiClient";
import { useSection } from "../../features/workspace/hooks";
import { useProjects } from "../../features/workspace/ProjectContext";
import { sessionRequest } from "../../lib/sessionClient";
import type { ProductRecordSummary } from "../../features/workspace/api";
import { useAuth } from "../../context/AuthContext";

export function AgentBuilderPage() {
  const { currentProject } = useProjects();
  const adapter = useMemo(() => currentProject ? new LiveAgentBuilderAdapter(currentProject.id) : null, [currentProject]);
  if (!adapter) return <section className="workspace-page"><WorkspaceState state="empty"><NavLink to="/projects">Choose a current project</NavLink> before building an agent.</WorkspaceState></section>;
  return <section className="workspace-page"><AgentBuilderWorkspace adapter={adapter} initialDirectory={[]} /></section>;
}

export function MemoryWorkspacePage() {
  const [notice, setNotice] = useState("");
  const [memoryDraft, setMemoryDraft] = useState("");
  const { currentProject } = useProjects();
  const projectId = currentProject?.id ?? null;
  const memory = useSection<MemoryRecords>(
    () => (projectId ? loadProjectMemory(projectId) : Promise.resolve({ entries: [], proposals: [], versions: new Map() })),
    projectId ?? "no-project",
  );

  if (!projectId) {
    return (
      <section className="workspace-page">
        <WorkspaceState state="empty">
          Memory is project-scoped today. <NavLink to="/projects">Choose a current project</NavLink> to review its
          memory. User and team memory spaces are not yet available and are not simulated.
        </WorkspaceState>
      </section>
    );
  }

  const records = memory.data ?? { entries: [], proposals: [], versions: new Map<string, number>() };
  const say = (text: string) => setNotice(text);
  const act = async (action: () => Promise<unknown>, success: string) => {
    setNotice("");
    try {
      await action();
      memory.reload();
      say(success);
    } catch (cause) {
      say(cause instanceof Error ? `No change was saved. ${cause.message}` : "No change was saved.");
    }
  };
  const versionOf = (id: string) => records.versions.get(id);

  return (
    <section className="workspace-page">
      {memory.status === "error" || memory.status === "forbidden" ? (
        <WorkspaceState state="error">{memory.message ?? "Project memory could not be loaded."}</WorkspaceState>
      ) : null}
      {notice ? <WorkspaceState state="error">{notice}</WorkspaceState> : null}
      <form className="workspace-form" onSubmit={(event) => {
        event.preventDefault();
        const content = memoryDraft.trim();
        if (!content) return;
        void act(() => rememberInProject(projectId, content), "Memory saved.").then(() => setMemoryDraft(""));
      }}>
        <label><span>Remember for {currentProject?.name}</span><textarea rows={3} value={memoryDraft} onChange={(event) => setMemoryDraft(event.target.value)} placeholder="A durable preference, fact, or instruction" /></label>
        <button className="workspace-button" disabled={!memoryDraft.trim()}>Remember</button>
      </form>
      <MemoryInspector
        entries={records.entries}
        proposals={records.proposals}
        state={memory.status === "loading" ? "loading" : memory.status === "error" ? "error" : "ready"}
        errorMessage={memory.message ?? undefined}
        onAcceptProposal={(proposalId) => {
          const version = versionOf(proposalId);
          if (version === undefined) return say("This proposal is no longer current; reload and retry.");
          void act(() => resolveMemoryProposal(projectId, proposalId, version, "accepted"), "Proposal accepted.");
        }}
        onRejectProposal={(proposalId) => {
          const version = versionOf(proposalId);
          if (version === undefined) return say("This proposal is no longer current; reload and retry.");
          void act(() => resolveMemoryProposal(projectId, proposalId, version, "rejected"), "Proposal rejected.");
        }}
        onEditEntry={() => say("Editing memory content is not yet supported by the canonical API; delete and re-add instead.")}
        onDeleteEntry={(entryId) => {
          const version = versionOf(entryId);
          if (version === undefined) return say("This memory is no longer current; reload and retry.");
          void act(() => deleteMemoryEntry(projectId, entryId, version), "Memory deleted. Derived-index cleanup follows.");
        }}
        onSetSpaceEnabled={() => say("Per-space recall controls are not yet supported by the canonical API.")}
        onExport={() => {
          void act(async () => {
            const value = await exportProjectMemory(projectId);
            const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `beyond-memory-${projectId}.json`;
            anchor.click();
            URL.revokeObjectURL(url);
          }, "Memory exported.");
        }}
      />
    </section>
  );
}

const outputFixture: OutputView = {
  id: "output.preview", title: "Reviewable output preview", kind: "document", lifecycle: "ready_for_review", capability: "preview_only",
  capabilityMessage: "This deterministic preview is not a persisted backend artifact.", activeVersionId: "version.preview",
  versions: [{ id: "version.preview", ordinal: 1, label: "Preview", author: "Local fixture", createdAt: "2026-07-11T00:00:00.000Z", branchId: "main" }],
  preview: { kind: "document", blocks: [{ id: "heading", type: "heading", text: "Output review surface" }, { id: "body", type: "paragraph", text: "Live artifact loading will replace this preview when the canonical outputs API is available." }] },
  validation: [{ code: "persistence", status: "warning", message: "No canonical output/version API is mounted." }],
};

export function OutputWorkspacePage() {
  const { outputId } = useParams();
  const { currentProject } = useProjects();
  const { user } = useAuth();
  const [notice, setNotice] = useState("");
  const [commentReload, setCommentReload] = useState(0);
  const [reviewReload, setReviewReload] = useState(0);
  const output = useSection(
    () => currentProject && outputId ? sessionRequest<ProductRecordSummary>(`/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/outputs/${encodeURIComponent(outputId)}`) : Promise.reject(new Error("Choose the output's project first.")),
    `${currentProject?.id ?? "none"}:${outputId ?? "none"}`,
  );
  const comments = useSection(
    () => currentProject && outputId ? sessionRequest<{ items: ProductRecordSummary[] }>(`/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/outputs/${encodeURIComponent(outputId)}/comments`) : Promise.resolve({ items: [] }),
    `${currentProject?.id ?? "none"}:${outputId ?? "none"}:comments:${commentReload}`,
  );
  const reviews = useSection(
    () => currentProject && outputId ? sessionRequest<{ items: ProductRecordSummary[] }>(`/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/outputs/${encodeURIComponent(outputId)}/reviews`) : Promise.resolve({ items: [] }),
    `${currentProject?.id ?? "none"}:${outputId ?? "none"}:reviews:${reviewReload}`,
  );
  const notSent = (action: string) => setNotice(`${action} was not sent. ${integrationAvailability.deferred.collaboration}`);
  const actions = { onSelectVersion: () => undefined, onCheckpoint: () => notSent("Checkpoint"), onRestore: () => notSent("Restore"), onCompare: () => notSent("Compare"), onBranch: () => notSent("Branch"), onPromote: () => notSent("Promote") };
  if (output.status === "loading") return <section className="workspace-page"><WorkspaceState state="loading">Loading output…</WorkspaceState></section>;
  if (output.status !== "ready" || !output.data) return <section className="workspace-page"><WorkspaceState state="error">{output.message ?? "Output not found."}</WorkspaceState></section>;
  const record = output.data;
  const title = typeof record.payload["name"] === "string" ? record.payload["name"] : `Output ${record.id.slice(0, 8)}`;
  const body = typeof record.payload["description"] === "string" ? record.payload["description"] : "";
  const liveOutput: OutputView = { ...outputFixture, id: record.id, title, lifecycle: record.state === "draft" ? "working" : "ready_for_review", capability: "supported", capabilityMessage: "Persisted in the project output store.", activeVersionId: `v${record.version}`, versions: [{ id: `v${record.version}`, ordinal: record.version, label: `Version ${record.version}`, author: record.created_by ?? "Organization member", createdAt: record.created_at, branchId: "main" }], preview: { kind: "document", blocks: [{ id: "heading", type: "heading", text: title }, { id: "body", type: "paragraph", text: body }] } };
  const commentViews = (comments.data?.items ?? []).map((item) => ({ id: item.id, author: item.created_by ?? "Organization member", body: String(item.payload["body"] ?? ""), createdAt: item.created_at, anchorLabel: "Output", resolved: item.state === "resolved", replies: [] }));
  const reviewViews = (reviews.data?.items ?? []).map((item) => ({ id: item.id, reviewer: String(item.payload["reviewer_ids"] instanceof Array ? item.payload["reviewer_ids"][0] : "Organization reviewer"), status: item.state as "pending" | "approved" | "changes_requested", note: typeof item.payload["instructions"] === "string" ? item.payload["instructions"] : null }));
  return <section className="workspace-page"><PageHeader eyebrow="Outputs" title={title}><NavLink className="workspace-button is-quiet" to="/work">Back to work</NavLink></PageHeader>{notice ? <WorkspaceState state="error">{notice}</WorkspaceState> : null}<PresenceStrip collaborators={[]} progress={null} /><div className="workspace-task-grid"><OutputWorkbench output={liveOutput} actions={actions} /><CollaborationRail comments={commentViews} reviews={reviewViews} canComment actions={{ onAddComment: async (body) => { if (!currentProject || !outputId) return; await sessionRequest(`/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/outputs/${encodeURIComponent(outputId)}/comments`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ body }) }); setCommentReload((value) => value + 1); }, onMention: () => undefined, onResolve: async (commentId) => { if (!currentProject) return; await sessionRequest(`/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/comments/${encodeURIComponent(commentId)}/resolve`, { method: "POST" }); setCommentReload((value) => value + 1); }, onRequestReview: async () => { if (!currentProject || !outputId) return; await sessionRequest(`/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/outputs/${encodeURIComponent(outputId)}/reviews`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ reviewer_ids: [user?.email ?? user?.id ?? "organization-reviewer"], instructions: "Review this output and leave specific feedback." }) }); setReviewReload((value) => value + 1); } }} /></div></section>;
}

export function AutomationsWorkspacePage() {
  const { currentProject } = useProjects();
  const [automationName, setAutomationName] = useState("");
  const [automationReload, setAutomationReload] = useState(0);
  const [automationNotice, setAutomationNotice] = useState("");
  const adapter = useMemo(
    () => (currentProject ? new LiveAutomationAdapter(currentProject.id) : null),
    [currentProject],
  );
  if (!adapter) {
    return (
      <section className="workspace-page">
        <WorkspaceState state="empty">
          Automations are project-scoped. <NavLink to="/projects">Choose a current project</NavLink> to manage its
          automations. Nothing is simulated in the meantime.
        </WorkspaceState>
      </section>
    );
  }
  return (
    <section className="workspace-page">
      <form className="workspace-form" onSubmit={(event) => {
        event.preventDefault();
        setAutomationNotice("");
        void sessionRequest(`/api/v2/product/projects/${encodeURIComponent(currentProject!.id)}/automations`, {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({ name: automationName, description: "General Agent scheduled work", agent_version_id: "general", trigger: { kind: "schedule", interval_minutes: 1440 }, max_cost_cents: 500, max_actions: 10, configuration: {} }),
        }).then(() => { setAutomationName(""); setAutomationNotice("Automation created. Resume it when ready to run."); setAutomationReload((value) => value + 1); }).catch((error) => setAutomationNotice(error instanceof Error ? error.message : "Automation could not be created."));
      }}>
        <label><span>New daily automation</span><input value={automationName} onChange={(event) => setAutomationName(event.target.value)} placeholder="Daily market brief" required /></label>
        <button className="workspace-button" disabled={!automationName.trim()}>Create automation</button>
      </form>
      {automationNotice ? <WorkspaceState state="error">{automationNotice}</WorkspaceState> : null}
      <AutomationWorkspace key={`${currentProject!.id}:${automationReload}`} adapter={adapter} />
    </section>
  );
}
