import { useState } from "react";
import { NavLink, useLocation, useParams } from "react-router-dom";
import { takePromotionDraft } from "../../features/workspace/adapter";
import { getWorkspaceCapabilities } from "../../features/workspace/api";
import { useSection } from "../../features/workspace/hooks";
import { DisabledControl, PageHeader, WorkspaceState } from "../../components/workspace/WorkspacePrimitives";

export function WorkListPage() {
  const capabilities = useSection(getWorkspaceCapabilities, "work-list");
  const runtimeEnabled = capabilities.status === "ready" && capabilities.data?.runtime_execution === true;
  return (
    <section className="workspace-page">
      <PageHeader eyebrow="Work" title="Durable tasks, visible control." />
      <div className="workspace-panel">
        <div className="workspace-list-head">
          <h2>All work</h2>
          <NavLink className="workspace-button" to="/work/new">New task</NavLink>
        </div>
        {capabilities.status === "loading" ? (
          <p className="workspace-muted" role="status">Checking runtime availability…</p>
        ) : runtimeEnabled ? (
          <p className="workspace-muted">No durable tasks exist yet. Start one from Chat to see it here.</p>
        ) : (
          <WorkspaceState state="disconnected">
            Durable agent runs are not yet enabled for this workspace, so there are no tasks to list. No sample tasks
            are shown in their place.
          </WorkspaceState>
        )}
      </div>
    </section>
  );
}

function NewWorkDraft() {
  const [draft, setDraft] = useState(() => takePromotionDraft());
  if (!draft) return <WorkspaceState state="empty">Start in Chat to bring an explicit draft and reference chips into Work.</WorkspaceState>;
  return (
    <section className="workspace-panel workspace-promotion">
      <label htmlFor="work-goal">Goal carried from Chat</label>
      <textarea id="work-goal" value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} />
      <div className="workspace-chip-list">
        {draft.references.map((chip) => <span className="workspace-chip" key={chip.id}>{chip.kind}: {chip.label}</span>)}
      </div>
      <DisabledControl explanation="Durable run creation is not yet enabled for this workspace, so this draft cannot be saved as a server task.">Save draft unavailable</DisabledControl>
      <p className="workspace-footnote">No run was created. Saving and execution require the durable runtime to be enabled.</p>
    </section>
  );
}

export function WorkDetailPage() {
  const location = useLocation();
  const { workId } = useParams();
  const isNew = location.pathname.endsWith("/new");
  if (isNew) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="New Work" title="Turn this chat into a task" />
        <NewWorkDraft />
      </section>
    );
  }
  return (
    <section className="workspace-page">
      <PageHeader eyebrow="Work" title="This task is not available." />
      <WorkspaceState state="error">
        No durable task matches {workId ? `"${workId}"` : "this URL"}. Durable runs are not yet enabled for this
        workspace, and nothing was substituted in their place.
      </WorkspaceState>
      <NavLink className="workspace-button" to="/work">Return to all work</NavLink>
    </section>
  );
}
