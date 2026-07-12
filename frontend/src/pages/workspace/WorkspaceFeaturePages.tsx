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
  const [notice, setNotice] = useState("");
  const notSent = (action: string) => setNotice(`${action} was not sent. ${integrationAvailability.deferred.collaboration}`);
  const actions = { onSelectVersion: () => undefined, onCheckpoint: () => notSent("Checkpoint"), onRestore: () => notSent("Restore"), onCompare: () => notSent("Compare"), onBranch: () => notSent("Branch"), onPromote: () => notSent("Promote") };
  return <section className="workspace-page"><PageHeader eyebrow="Outputs" title={outputId ? `Output ${outputId}` : "Output review"}><NavLink className="workspace-button is-quiet" to="/work">Back to work</NavLink></PageHeader><WorkspaceState state="disconnected">Canonical output persistence, comments, reviews, and presence are not connected.</WorkspaceState>{notice ? <WorkspaceState state="error">{notice}</WorkspaceState> : null}<PresenceStrip collaborators={[]} progress={null} /><div className="workspace-task-grid"><OutputWorkbench output={outputFixture} actions={actions} /><CollaborationRail comments={[]} reviews={[]} canComment={false} actions={{ onAddComment: () => notSent("Comment"), onMention: () => notSent("Mention"), onResolve: () => notSent("Resolve"), onRequestReview: () => notSent("Review request") }} /></div></section>;
}

export function AutomationsWorkspacePage() {
  const { currentProject } = useProjects();
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
      <AutomationWorkspace key={currentProject!.id} adapter={adapter} />
    </section>
  );
}
