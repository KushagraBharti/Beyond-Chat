import { NavLink, useParams } from "react-router-dom";
import {
  getProject,
  listProjectRecords,
  recordTitle,
  type ProductRecordSummary,
} from "../../features/workspace/api";
import { useSection } from "../../features/workspace/hooks";
import { useProjects } from "../../features/workspace/ProjectContext";
import { PageHeader, WorkspaceState } from "../../components/workspace/WorkspacePrimitives";

function items(value: unknown): ProductRecordSummary[] {
  if (Array.isArray(value)) return value as ProductRecordSummary[];
  if (value && typeof value === "object" && Array.isArray((value as { items?: unknown[] }).items)) {
    return (value as { items: ProductRecordSummary[] }).items;
  }
  return [];
}

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const { selectProject, currentProject } = useProjects();
  const project = useSection(() => getProject(projectId), projectId);
  const outputs = useSection(() => listProjectRecords(projectId, "outputs"), projectId);
  const automations = useSection(() => listProjectRecords(projectId, "automations"), projectId);

  if (project.status === "loading") {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Projects" title="Loading project…" />
        <p className="workspace-muted" role="status">Loading…</p>
      </section>
    );
  }
  if (project.status === "error" || project.status === "forbidden" || !project.data) {
    // A cross-organization or unknown project ID is indistinguishable here on
    // purpose: no existence information leaks through this page.
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Projects" title="This project is not available." />
        <WorkspaceState state="error">
          The project does not exist in your current organization, or your role cannot view it.
        </WorkspaceState>
        <NavLink className="workspace-button" to="/projects">Back to projects</NavLink>
      </section>
    );
  }

  const detail = project.data;
  const isCurrent = currentProject?.id === detail.id;

  return (
    <section className="workspace-page">
      <PageHeader eyebrow="Projects" title={detail.name}>
        <button
          type="button"
          className="workspace-button is-quiet"
          disabled={isCurrent}
          onClick={() => selectProject(detail.id)}
        >
          {isCurrent ? "Current project" : "Set as current project"}
        </button>
      </PageHeader>
      <p className="workspace-lead">
        {detail.description || "No description yet."} · {detail.visibility === "private" ? "Private" : "Visible to the organization"}
      </p>
      <div className="workspace-columns">
        <section className="workspace-panel" aria-labelledby="project-outputs">
          <h2 id="project-outputs">Outputs</h2>
          {outputs.status === "loading" ? <p className="workspace-muted" role="status">Loading…</p>
            : outputs.status === "error" ? <WorkspaceState state="error">{outputs.message}</WorkspaceState>
            : items(outputs.data).length === 0 ? <p className="workspace-muted">No outputs in this project yet.</p>
            : items(outputs.data).slice(0, 10).map((record) => (
                <NavLink key={record.id} to={`/outputs/${record.id}`} className="workspace-row-link">
                  <span><b>{recordTitle(record)}</b><small>{record.state.replaceAll("_", " ")}</small></span>
                  <i>Open</i>
                </NavLink>
              ))}
        </section>
        <section className="workspace-panel" aria-labelledby="project-automations">
          <h2 id="project-automations">Automations</h2>
          {automations.status === "loading" ? <p className="workspace-muted" role="status">Loading…</p>
            : automations.status === "error" ? <WorkspaceState state="error">{automations.message}</WorkspaceState>
            : items(automations.data).length === 0 ? <p className="workspace-muted">No automations in this project.</p>
            : items(automations.data).slice(0, 10).map((record) => (
                <div key={record.id} className="workspace-row-link">
                  <span><b>{recordTitle(record)}</b><small>{record.state.replaceAll("_", " ")}</small></span>
                </div>
              ))}
          <h2>Knowledge &amp; memory</h2>
          <p className="workspace-muted">
            Manage this project's sources in <NavLink to="/knowledge-apps?view=sources">Knowledge &amp; Apps</NavLink> and
            its memory in <NavLink to="/memory">Memory</NavLink>{isCurrent ? "" : " after setting it as the current project"}.
          </p>
        </section>
      </div>
    </section>
  );
}
