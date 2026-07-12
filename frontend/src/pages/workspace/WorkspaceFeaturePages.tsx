import { useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { AgentBuilderWorkspace } from "../../components/agent-builder";
import { AutomationWorkspace } from "../../components/automations";
import { CollaborationRail } from "../../components/collaboration/CollaborationRail";
import { PresenceStrip } from "../../components/collaboration/PresenceStrip";
import { MemoryInspector } from "../../components/memory";
import { OutputWorkbench } from "../../components/outputs/OutputWorkbench";
import { PageHeader, WorkspaceState } from "../../components/workspace/WorkspacePrimitives";
import type { AgentBuilderAdapter } from "../../features/agent-builder/adapter";
import type { AutomationUiAdapter } from "../../features/automations/model";
import type { OutputView } from "../../features/outputs/model";
import { integrationAvailability } from "../../features/integration/apiClient";

const unavailable = (surface: keyof typeof integrationAvailability.deferred): never => {
  throw new Error(integrationAvailability.deferred[surface]);
};

const agentAdapter: AgentBuilderAdapter = {
  propose: async () => unavailable("agents"), preflight: async () => unavailable("agents"),
  test: async () => unavailable("agents"), publish: async () => unavailable("agents"),
  search: async () => unavailable("agents"), favorite: async () => unavailable("agents"),
};

const automationAdapter: AutomationUiAdapter = {
  load: async () => unavailable("automations"), pause: async () => unavailable("automations"),
  resume: async () => unavailable("automations"), test: async () => unavailable("automations"),
  retry: async () => unavailable("automations"), resolveApproval: async () => unavailable("automations"),
};

export function AgentBuilderPage() {
  return <section className="workspace-page"><WorkspaceState state="disconnected">{integrationAvailability.deferred.agents} Draft controls are visible, but test and publish never report a local success.</WorkspaceState><AgentBuilderWorkspace adapter={agentAdapter} initialDirectory={[]} /></section>;
}

export function MemoryWorkspacePage() {
  const [notice, setNotice] = useState("");
  const failure = () => setNotice(`No change was saved. ${integrationAvailability.deferred.memory}`);
  return <section className="workspace-page"><WorkspaceState state="disconnected">{integrationAvailability.deferred.memory}</WorkspaceState>{notice ? <WorkspaceState state="error">{notice}</WorkspaceState> : null}<MemoryInspector entries={[]} proposals={[]} onAcceptProposal={failure} onRejectProposal={failure} onEditEntry={failure} onDeleteEntry={failure} onSetSpaceEnabled={failure} onExport={failure} /></section>;
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
  return <section className="workspace-page"><WorkspaceState state="disconnected">{integrationAvailability.deferred.automations} Controls fail closed.</WorkspaceState><AutomationWorkspace adapter={automationAdapter} /></section>;
}
