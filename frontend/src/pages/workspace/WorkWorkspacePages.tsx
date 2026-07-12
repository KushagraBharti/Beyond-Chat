import { useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { takePromotionDraft } from "../../features/workspace/adapter";
import { getWorkspaceCapabilities, listProjectRecords, recordTitle, type ProductRecordSummary } from "../../features/workspace/api";
import { useSection } from "../../features/workspace/hooks";
import { PageHeader, WorkspaceState } from "../../components/workspace/WorkspacePrimitives";
import { useProjects } from "../../features/workspace/ProjectContext";
import { sessionRequest } from "../../lib/sessionClient";

export function WorkListPage() {
  const { currentProject } = useProjects();
  const capabilities = useSection(getWorkspaceCapabilities, "work-list");
  const outputs = useSection(
    () => currentProject ? listProjectRecords(currentProject.id, "outputs") : Promise.resolve({ items: [] }),
    currentProject?.id ?? "no-project",
  );
  const outputItems = Array.isArray(outputs.data) ? outputs.data : outputs.data?.items ?? [];
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
        ) : runtimeEnabled && outputItems.length ? (
          outputItems.map((record) => <div className="workspace-row-link" key={record.id}><span><b>{recordTitle(record)}</b><small>{record.state} · v{record.version}</small></span><NavLink to={`/outputs/${record.id}`}>Open</NavLink></div>)
        ) : runtimeEnabled ? (
          <p className="workspace-muted">No durable work exists yet. Start one from Chat to see it here.</p>
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { currentProject } = useProjects();
  const navigate = useNavigate();
  if (!draft) return <WorkspaceState state="empty">Start in Chat to bring an explicit draft and reference chips into Work.</WorkspaceState>;
  return (
    <section className="workspace-panel workspace-promotion">
      <label htmlFor="work-goal">Goal carried from Chat</label>
      <textarea id="work-goal" value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} />
      <div className="workspace-chip-list">
        {draft.references.map((chip) => <span className="workspace-chip" key={chip.id}>{chip.kind}: {chip.label}</span>)}
      </div>
      {error ? <WorkspaceState state="error">{error}</WorkspaceState> : null}
      <button className="workspace-button" disabled={saving || !currentProject || !draft.prompt.trim()} onClick={() => {
        if (!currentProject) return;
        setSaving(true); setError("");
        void sessionRequest<ProductRecordSummary>(`/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/outputs`, {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({ name: draft.prompt.slice(0, 80), description: draft.prompt, configuration: { kind: "document", references: draft.references } }),
        }).then((record) => navigate(`/outputs/${record.id}`)).catch((cause) => setError(cause instanceof Error ? cause.message : "Work could not be saved.")).finally(() => setSaving(false));
      }}>{saving ? "Saving…" : "Save durable work"}</button>
      {!currentProject ? <p className="workspace-footnote">Choose a current project before saving.</p> : null}
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
