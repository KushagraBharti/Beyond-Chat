import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { builtInAgents } from "../../features/workspace/adapter";
import {
  getOrganizationCatalog,
  getWorkspaceCapabilities,
  listOrganizationRecent,
  recordTitle,
  type ProductRecordSummary,
  type SectionState,
} from "../../features/workspace/api";
import { useSection } from "../../features/workspace/hooks";
import { useProjects } from "../../features/workspace/ProjectContext";
import { PageHeader, WorkspaceState } from "../../components/workspace/WorkspacePrimitives";

function SectionBody<T>({ section, empty, children }: {
  section: SectionState<T>;
  empty: string;
  children: (data: T) => ReactNode;
}) {
  if (section.status === "loading") return <p className="workspace-muted" role="status">Loading…</p>;
  if (section.status === "forbidden") {
    return <WorkspaceState state="permission_denied">{section.message ?? "Your role cannot view this section."}</WorkspaceState>;
  }
  if (section.status === "error") {
    return <WorkspaceState state="error">{section.message ?? "This section could not be loaded."}</WorkspaceState>;
  }
  if (section.status === "empty") return <p className="workspace-muted">{empty}</p>;
  return <>{children(section.data as T)}</>;
}

function RecordRows({ items, link }: { items: ProductRecordSummary[]; link: (record: ProductRecordSummary) => string }) {
  return (
    <>
      {items.slice(0, 6).map((record) => (
        <NavLink key={record.id} to={link(record)} className="workspace-row-link">
          <span>
            <b>{recordTitle(record)}</b>
            <small>{record.state.replaceAll("_", " ")} · updated {new Date(record.updated_at).toLocaleDateString()}</small>
          </span>
          <i>{record.kind.replaceAll("_", " ")}</i>
        </NavLink>
      ))}
    </>
  );
}

export function HomeWorkspacePage() {
  const { session } = useAuth();
  const organizationId = session?.organizationId ?? "anonymous";
  const projectsContext = useProjects();
  const capabilities = useSection(getWorkspaceCapabilities, organizationId);
  const outputs = useSection(() => listOrganizationRecent("outputs"), organizationId);
  const approvals = useSection(() => listOrganizationRecent("approvals"), organizationId);
  const agents = useSection(() => listOrganizationRecent("agents"), organizationId);
  const automations = useSection(() => listOrganizationRecent("automations"), organizationId);
  const catalog = useSection(getOrganizationCatalog, organizationId);

  const runtimeEnabled = capabilities.status === "ready" && capabilities.data?.runtime_execution === true;

  return (
    <section className="workspace-page">
      <PageHeader eyebrow="Home" title="Pick up where the work is." />
      <div className="workspace-home-grid">
        <section className="workspace-panel" aria-labelledby="home-active-work">
          <h2 id="home-active-work">Active work</h2>
          {capabilities.status === "loading" ? (
            <p className="workspace-muted" role="status">Checking runtime availability…</p>
          ) : runtimeEnabled ? (
            <p className="workspace-muted">Durable runs are enabled. Start one from Chat or Work.</p>
          ) : (
            <WorkspaceState state="disconnected">
              Durable agent runs are not yet enabled for this workspace, so there is no live work to show. Nothing here
              is simulated.
            </WorkspaceState>
          )}
        </section>
        <section className="workspace-panel" aria-labelledby="home-approvals">
          <h2 id="home-approvals">Approvals waiting</h2>
          <SectionBody section={approvals} empty="No approvals are waiting on you.">
            {(data) => <RecordRows items={data.items} link={(record) => record.scope.project_id ? `/projects/${record.scope.project_id}` : "/projects"} />}
          </SectionBody>
        </section>
      </div>
      <div className="workspace-columns">
        <section className="workspace-panel" aria-labelledby="home-outputs">
          <h2 id="home-outputs">Recent outputs</h2>
          <SectionBody section={outputs} empty="No outputs exist yet. Generated documents and models will appear here.">
            {(data) => <RecordRows items={data.items} link={(record) => `/outputs/${record.id}`} />}
          </SectionBody>
        </section>
        <section className="workspace-panel" aria-labelledby="home-agents">
          <h2 id="home-agents">Saved agents</h2>
          {builtInAgents.map((agent) => (
            <NavLink key={agent.id} to="/agents" className="workspace-row-link">
              <span>
                <b>{agent.name}</b>
                <small>{agent.description}</small>
              </span>
              <i>{runtimeEnabled ? `v${agent.version}` : `v${agent.version} · runtime not enabled`}</i>
            </NavLink>
          ))}
          <SectionBody section={agents} empty="No organization agents have been published.">
            {(data) => <RecordRows items={data.items} link={() => "/agents"} />}
          </SectionBody>
        </section>
      </div>
      <div className="workspace-columns">
        <section className="workspace-panel" aria-labelledby="home-projects">
          <h2 id="home-projects">Current projects</h2>
          {projectsContext.status === "loading" ? (
            <p className="workspace-muted" role="status">Loading…</p>
          ) : projectsContext.status === "error" ? (
            <WorkspaceState state="error">{projectsContext.message ?? "Projects could not be loaded."}</WorkspaceState>
          ) : projectsContext.projects.length === 0 ? (
            <p className="workspace-muted">
              No projects yet. <NavLink to="/projects">Create the first project</NavLink> to give work a durable home.
            </p>
          ) : (
            projectsContext.projects.slice(0, 6).map((project) => (
              <NavLink key={project.id} to={`/projects/${project.id}`} className="workspace-row-link">
                <span>
                  <b>{project.name}</b>
                  <small>{project.visibility === "private" ? "Private" : "Organization"} · {project.slug}</small>
                </span>
                <i>Open</i>
              </NavLink>
            ))
          )}
        </section>
        <section className="workspace-panel" aria-labelledby="home-connections">
          <h2 id="home-connections">Knowledge &amp; apps</h2>
          <SectionBody
            section={catalog}
            empty="No apps, skills, or MCP servers are registered for this organization yet."
          >
            {(data) => (
              <p className="workspace-muted">
                {data.apps.length} app{data.apps.length === 1 ? "" : "s"}, {data.skills.length} skill
                {data.skills.length === 1 ? "" : "s"}, {data.mcp_servers.length} MCP server
                {data.mcp_servers.length === 1 ? "" : "s"} registered. <NavLink to="/knowledge-apps">Review readiness</NavLink>
              </p>
            )}
          </SectionBody>
          <h2 id="home-automations">Automations</h2>
          <SectionBody section={automations} empty="No automations are configured.">
            {(data) => <RecordRows items={data.items} link={() => "/automations"} />}
          </SectionBody>
        </section>
      </div>
    </section>
  );
}
