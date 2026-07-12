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
  setMemoryEntryEnabled,
  updateMemoryEntry,
  type MemoryRecords,
} from "../../features/memory/apiClient";
import type { OutputView } from "../../features/outputs/model";
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
    () => (projectId ? loadProjectMemory(projectId) : Promise.resolve({ entries: [], proposals: [], disabledSpaceIds: [], versions: new Map() })),
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

  const records = memory.data ?? { entries: [], proposals: [], disabledSpaceIds: [], versions: new Map<string, number>() };
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
        disabledSpaceIds={records.disabledSpaceIds}
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
        onEditEntry={(entryId, content) => {
          const version = versionOf(entryId);
          const entry = records.entries.find((item) => item.id === entryId);
          if (version === undefined || !entry) return say("This memory is no longer current; reload and retry.");
          return act(() => updateMemoryEntry(projectId, entryId, version, content, entry.sensitivity, entry.expiresAt), "Memory revision saved.");
        }}
        onDeleteEntry={(entryId) => {
          const version = versionOf(entryId);
          if (version === undefined) return say("This memory is no longer current; reload and retry.");
          void act(() => deleteMemoryEntry(projectId, entryId, version), "Memory deleted. Derived-index cleanup follows.");
        }}
        onSetSpaceEnabled={(_spaceId, enabled) => {
          const entries = records.entries.filter((entry) => versionOf(entry.id) !== undefined);
          void act(() => Promise.all(entries.map((entry) => setMemoryEntryEnabled(projectId, entry.id, versionOf(entry.id)!, enabled))), enabled ? "Project memory enabled for recall." : "Project memory disabled for recall.");
        }}
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
  const [versionReload, setVersionReload] = useState(0);
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
  const versions = useSection(
    () => currentProject && outputId ? sessionRequest<{ items: ProductRecordSummary[] }>(`/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/outputs/${encodeURIComponent(outputId)}/versions`) : Promise.resolve({ items: [] }),
    `${currentProject?.id ?? "none"}:${outputId ?? "none"}:versions:${versionReload}`,
  );
  if (output.status === "loading") return <section className="workspace-page"><WorkspaceState state="loading">Loading output…</WorkspaceState></section>;
  if (output.status !== "ready" || !output.data) return <section className="workspace-page"><WorkspaceState state="error">{output.message ?? "Output not found."}</WorkspaceState></section>;
  const record = output.data;
  const title = typeof record.payload["name"] === "string" ? record.payload["name"] : `Output ${record.id.slice(0, 8)}`;
  const body = typeof record.payload["description"] === "string" ? record.payload["description"] : "";
  const versionRecords = [...(versions.data?.items ?? [])].reverse();
  const outputVersions = versionRecords.length ? versionRecords.map((item, index) => ({ id: item.id, ordinal: index + 1, label: String(item.payload["change_summary"] ?? `Version ${index + 1}`), author: item.created_by ?? "Organization member", createdAt: item.created_at, branchId: String(item.payload["branch_id"] ?? "main") })) : [{ id: `base:${record.id}`, ordinal: 1, label: "Version 1", author: record.created_by ?? "Organization member", createdAt: record.created_at, branchId: "main" }];
  const activeVersionId = outputVersions.at(-1)!.id;
  const contentFor = (versionId: string): Record<string, unknown> => {
    const selected = versionRecords.find((item) => item.id === versionId);
    const content = selected?.payload["content"];
    return content && typeof content === "object" && !Array.isArray(content) ? content as Record<string, unknown> : { name: title, description: body };
  };
  const appendVersion = async (content: Record<string, unknown>, parentVersionId: string | null, changeSummary: string) => {
    if (!currentProject || !outputId) return;
    await sessionRequest(`/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/outputs/${encodeURIComponent(outputId)}/versions`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ content, parent_version_id: parentVersionId, change_summary: changeSummary }) });
    setVersionReload((value) => value + 1);
    setNotice(`${changeSummary} saved.`);
  };
  const actions = {
    onSelectVersion: () => undefined,
    onCheckpoint: () => appendVersion(contentFor(activeVersionId), activeVersionId.startsWith("base:") ? null : activeVersionId, "Checkpoint"),
    onRestore: (versionId: string) => appendVersion(contentFor(versionId), versionId.startsWith("base:") ? null : versionId, "Restored version"),
    onCompare: (beforeVersionId: string, afterVersionId: string) => { setNotice(JSON.stringify(contentFor(beforeVersionId)) === JSON.stringify(contentFor(afterVersionId)) ? "The selected versions are identical." : "The selected versions contain different content."); },
    onBranch: (versionId: string) => appendVersion({ ...contentFor(versionId), branch_id: crypto.randomUUID() }, versionId.startsWith("base:") ? null : versionId, "Branched version"),
    onPromote: (versionId: string) => appendVersion(contentFor(versionId), versionId.startsWith("base:") ? null : versionId, "Promoted to main"),
  };
  const liveOutput: OutputView = { ...outputFixture, id: record.id, title, lifecycle: record.state === "draft" ? "working" : "ready_for_review", capability: "supported", capabilityMessage: "Persisted in the project output store.", activeVersionId, versions: outputVersions, preview: { kind: "document", blocks: [{ id: "heading", type: "heading", text: title }, { id: "body", type: "paragraph", text: body }] }, validation: [{ code: "persistence", status: "passed", message: "Output and version history are persisted in canonical project records." }] };
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
        void sessionRequest<ProductRecordSummary>(`/api/v2/product/projects/${encodeURIComponent(currentProject!.id)}/automations`, {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({ name: automationName, description: "General Agent scheduled work", agent_version_id: "general:v1", trigger: { kind: "schedule", interval_minutes: 1440 }, max_cost_cents: 500, max_actions: 10, configuration: { overlap: "skip", max_attempts: 3 } }),
        }).then(async (created) => {
          await sessionRequest(`/api/v2/product/projects/${encodeURIComponent(currentProject!.id)}/automations/${encodeURIComponent(created.id)}/versions`, {
            method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() },
          });
          await sessionRequest(`/api/v2/product/projects/${encodeURIComponent(currentProject!.id)}/automations/${encodeURIComponent(created.id)}/state/resume`, {
            method: "POST", headers: { "If-Match": String(created.version) },
          });
          setAutomationName(""); setAutomationNotice("Automation published and scheduled."); setAutomationReload((value) => value + 1);
        }).catch((error) => setAutomationNotice(error instanceof Error ? error.message : "Automation could not be created."));
      }}>
        <label><span>New daily automation</span><input value={automationName} onChange={(event) => setAutomationName(event.target.value)} placeholder="Daily market brief" required /></label>
        <button className="workspace-button" disabled={!automationName.trim()}>Create automation</button>
      </form>
      {automationNotice ? <WorkspaceState state="error">{automationNotice}</WorkspaceState> : null}
      <AutomationWorkspace key={`${currentProject!.id}:${automationReload}`} adapter={adapter} />
    </section>
  );
}
