import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { builtInAgents, canAccessAdmin, workspaceRole, type CapabilityView } from "../../features/workspace/adapter";
import {
  createProject,
  executeGeneralAgent,
  getOrganizationCatalog,
  getWorkspaceCapabilities,
  listOrganizationRecent,
  recordTitle,
  type ProductRecordSummary,
} from "../../features/workspace/api";
import { useSection } from "../../features/workspace/hooks";
import { useProjects } from "../../features/workspace/ProjectContext";
import { sessionRequest } from "../../lib/sessionClient";
import { PageHeader, WorkspaceState } from "../../components/workspace/WorkspacePrimitives";
import { BillingPanel } from "../../components/organizations/BillingPanel";
import { OrganizationPanel } from "../../components/organizations/OrganizationPanel";

function CapabilityState({ state }: { state: string }) {
  return <span className={`workspace-state-pill is-${state.replaceAll("_", "-")}`}>{state.replaceAll("_", " ")}</span>;
}

const capabilityViews: readonly { readonly id: CapabilityView; readonly label: string }[] = [
  { id: "apps", label: "Apps" }, { id: "skills", label: "Skills" }, { id: "mcp", label: "MCP" }, { id: "sources", label: "Sources" }, { id: "policy", label: "Readiness" },
];

function CatalogRows({ records, kindLabel }: { records: ProductRecordSummary[]; kindLabel: string }) {
  if (records.length === 0) {
    return <p className="workspace-muted">No {kindLabel} are registered for this organization. Nothing is simulated here.</p>;
  }
  return (
    <div className="workspace-capability-list">
      {records.map((record) => (
        <article key={record.id} className="workspace-capability-row">
          <div>
            <span className="workspace-capability-meta">
              {record.kind.replaceAll("_", " ")} · {record.scope.project_id ? "project" : "organization"} scope · v{record.version}
            </span>
            <h2>{recordTitle(record)}</h2>
            <p>{typeof record.payload["description"] === "string" ? (record.payload["description"] as string) : "No description recorded."}</p>
          </div>
          <CapabilityState state={record.state} />
        </article>
      ))}
    </div>
  );
}

function KnowledgeSources() {
  const { currentProject } = useProjects();
  const [reloadKey, setReloadKey] = useState(0);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const sources = useSection(
    () =>
      currentProject
        ? sessionRequest<{ items: ProductRecordSummary[] }>(
            `/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/knowledge/sources`,
          )
        : Promise.resolve({ items: [] as ProductRecordSummary[] }),
    `${currentProject?.id ?? "none"}:${reloadKey}`,
  );
  if (!currentProject) {
    return (
      <WorkspaceState state="empty">
        Knowledge sources are project-scoped. <NavLink to="/projects">Choose a current project</NavLink> to see its sources.
      </WorkspaceState>
    );
  }
  if (sources.status === "loading") return <p className="workspace-muted" role="status">Loading sources…</p>;
  if (sources.status === "error" || sources.status === "forbidden") {
    return <WorkspaceState state="error">{sources.message ?? "Sources could not be loaded."}</WorkspaceState>;
  }
  const items = sources.data?.items ?? [];
  async function addSource(event: FormEvent) {
    event.preventDefault();
    if (!currentProject) return;
    setSaving(true);
    setSaveError(null);
    try {
      await sessionRequest(`/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/knowledge/sources`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ name, description: content, configuration: { type: "manual" } }),
      });
      setName("");
      setContent("");
      setReloadKey((value) => value + 1);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The source could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  return <div className="workspace-stack">
    {items.length ? <CatalogRows records={items} kindLabel="sources" /> : <p className="workspace-muted">No knowledge sources are connected to {currentProject.name} yet.</p>}
    {saveError ? <WorkspaceState state="error">{saveError}</WorkspaceState> : null}
    <form className="workspace-form" onSubmit={(event) => void addSource(event)}>
      <label><span>Source name</span><input required value={name} onChange={(event) => setName(event.target.value)} disabled={saving} /></label>
      <label><span>Source content or URL</span><textarea required rows={5} value={content} onChange={(event) => setContent(event.target.value)} disabled={saving} /></label>
      <button className="workspace-button" disabled={saving || !name.trim() || !content.trim()}>Add source</button>
    </form>
  </div>;
}

function AppConnections() {
  const { currentProject } = useProjects();
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<string, string>>({});
  const connections = useSection(
    () => currentProject
      ? sessionRequest<{ items: ProductRecordSummary[] }>(
          `/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/connections`,
        )
      : Promise.resolve({ items: [] as ProductRecordSummary[] }),
    `${currentProject?.id ?? "none"}:${reloadKey}`,
  );

  async function connectApp(app: { name: string; toolkit: string; description: string }) {
    if (!currentProject) return;
    setBusy(app.toolkit);
    setError(null);
    try {
      const record = await sessionRequest<ProductRecordSummary & { oauth?: { redirect_url?: string } }>(
        `/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/connections`,
        {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({
            name: app.name,
            description: app.description,
            configuration: { toolkit: app.toolkit },
          }),
        },
      );
      const redirectUrl = record.oauth?.redirect_url;
      if (!redirectUrl) throw new Error(`${app.name} authorization is not available yet.`);
      window.location.assign(redirectUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${app.name} could not be connected.`);
      setReloadKey((value) => value + 1);
      setBusy(null);
    }
  }

  async function checkConnection(connection: ProductRecordSummary) {
    if (!currentProject) return;
    setBusy(connection.id);
    setError(null);
    try {
      const result = await sessionRequest<{ status: string }>(
        `/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/connections/${encodeURIComponent(connection.id)}/status`,
      );
      setHealth((current) => ({ ...current, [connection.id]: result.status }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection health could not be checked.");
    } finally {
      setBusy(null);
    }
  }

  async function disconnectConnection(connection: ProductRecordSummary) {
    if (!currentProject) return;
    setBusy(connection.id);
    setError(null);
    try {
      await sessionRequest(
        `/api/v2/product/projects/${encodeURIComponent(currentProject.id)}/connections/${encodeURIComponent(connection.id)}/disconnect`,
        { method: "POST", headers: { "If-Match": String(connection.version) } },
      );
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection could not be disconnected.");
    } finally {
      setBusy(null);
    }
  }

  if (!currentProject) {
    return <WorkspaceState state="empty">Choose a current project before connecting an app.</WorkspaceState>;
  }
  if (connections.status === "loading") return <p className="workspace-muted" role="status">Loading connections…</p>;
  if (connections.status === "error" || connections.status === "forbidden") {
    return <WorkspaceState state="error">{connections.message ?? "Connections could not be loaded."}</WorkspaceState>;
  }
  const items = connections.data?.items ?? [];
  const apps = [
    { name: "GitHub", toolkit: "GITHUB", description: "Read repositories and profile information", action: "Opening GitHub…" },
    { name: "Gmail", toolkit: "GMAIL", description: "Search and read email messages", action: "Opening Google…" },
  ];
  return <div className="workspace-stack">
    {error ? <WorkspaceState state="error">{error}</WorkspaceState> : null}
    {apps.map((app) => {
      const connection = items.find((record) => recordTitle(record).toLowerCase() === app.name.toLowerCase() && record.state !== "disconnected");
      return connection ? (
        <article key={app.toolkit} className="workspace-capability-row">
          <div><span className="workspace-capability-meta">Project app · read-only</span><h2>{app.name}</h2><p>{app.name} is {connection.state.replaceAll("_", " ")} for {currentProject.name}.</p></div>
          <div className="workspace-stack">
            <CapabilityState state={health[connection.id] ?? connection.state} />
            {connection.state === "active" ? <>
              <button type="button" className="workspace-button is-quiet" disabled={busy !== null} onClick={() => void checkConnection(connection)}>Check health</button>
              <button type="button" className="workspace-button is-quiet" disabled={busy !== null} onClick={() => void disconnectConnection(connection)}>Disconnect</button>
            </> : null}
          </div>
        </article>
      ) : (
        <article key={app.toolkit} className="workspace-capability-row">
          <div><span className="workspace-capability-meta">Composio · read-only access</span><h2>{app.name}</h2><p>Connect {app.name} so agents can {app.description.toLowerCase()} in this project.</p></div>
          <button type="button" className="workspace-button" disabled={busy !== null} onClick={() => void connectApp(app)}>{busy === app.toolkit ? app.action : `Connect ${app.name}`}</button>
        </article>
      );
    })}
  </div>;
}

function ReadinessView() {
  const capabilities = useSection(getWorkspaceCapabilities, "readiness");
  if (capabilities.status === "loading") return <p className="workspace-muted" role="status">Loading readiness…</p>;
  if (capabilities.status !== "ready" || !capabilities.data) {
    return <WorkspaceState state="error">{capabilities.message ?? "Readiness could not be verified."}</WorkspaceState>;
  }
  const report = capabilities.data;
  const rows: Array<[string, string, string]> = [
    ["Durable runtime", report.runtime_execution ? "ready" : "unavailable",
      report.runtime_execution ? "Durable agent runs are enabled." : "Durable agent runs are not yet enabled for this workspace."],
    ...(Object.entries(report.providers) as Array<[string, { state: string; externally_verified: boolean }]>).map(
      ([capability, value]): [string, string, string] => [
        `${capability[0].toUpperCase()}${capability.slice(1)} provider`,
        value.externally_verified && value.state === "ready" ? "ready" : "unavailable",
        value.externally_verified && value.state === "ready"
          ? "Server-verified and available."
          : "Not externally verified; the workspace will not pretend otherwise.",
      ],
    ),
  ];
  return (
    <div className="workspace-capability-list">
      {rows.map(([label, state, detail]) => (
        <article key={label} className="workspace-capability-row">
          <div>
            <span className="workspace-capability-meta">Server-computed readiness</span>
            <h2>{label}</h2>
            <p>{detail}</p>
          </div>
          <CapabilityState state={state} />
        </article>
      ))}
    </div>
  );
}

function KnowledgeAppsBrowser() {
  const baseId = useId();
  const tabs = useRef(new Map<CapabilityView, HTMLButtonElement>());
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("view") as CapabilityView | null;
  const view = capabilityViews.some((item) => item.id === requested) ? (requested as CapabilityView) : "apps";
  const catalog = useSection(getOrganizationCatalog, "catalog");
  const selectView = (nextView: CapabilityView) => {
    setSearchParams({ view: nextView });
    tabs.current.get(nextView)?.focus();
  };
  const catalogRecords = (key: "apps" | "skills" | "mcp_servers"): ProductRecordSummary[] =>
    catalog.status === "ready" || catalog.status === "empty" ? (catalog.data?.[key] ?? []) : [];
  return <>
    <div className="workspace-section-tabs" role="tablist" aria-label="Knowledge and capability views">
      {capabilityViews.map((item, index) => <button key={item.id} ref={(node) => { if (node) tabs.current.set(item.id, node); else tabs.current.delete(item.id); }} id={`${baseId}-${item.id}-tab`} role="tab" type="button" aria-selected={view === item.id} aria-controls={`${baseId}-panel`} tabIndex={view === item.id ? 0 : -1} onClick={() => setSearchParams({ view: item.id })} onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
        const last = capabilityViews.length - 1;
        const next = event.key === "ArrowRight" || event.key === "ArrowDown" ? (index + 1) % capabilityViews.length : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (index - 1 + capabilityViews.length) % capabilityViews.length : event.key === "Home" ? 0 : event.key === "End" ? last : index;
        if (next === index) return;
        event.preventDefault();
        selectView(capabilityViews[next].id);
      }}>{item.label}</button>)}
    </div>
    <section id={`${baseId}-panel`} className="workspace-panel" role="tabpanel" aria-labelledby={`${baseId}-${view}-tab`}>
      {catalog.status === "loading" && view !== "sources" && view !== "policy" ? <p className="workspace-muted" role="status">Loading catalog…</p> : null}
      {catalog.status === "error" && view !== "sources" && view !== "policy" ? <WorkspaceState state="error">{catalog.message ?? "The catalog could not be loaded."}</WorkspaceState> : null}
      {view === "apps" ? <AppConnections /> : null}
      {view === "skills" && catalog.status !== "loading" && catalog.status !== "error" ? <CatalogRows records={catalogRecords("skills")} kindLabel="skills" /> : null}
      {view === "mcp" && catalog.status !== "loading" && catalog.status !== "error" ? <CatalogRows records={catalogRecords("mcp_servers")} kindLabel="MCP servers" /> : null}
      {view === "sources" ? <KnowledgeSources /> : null}
      {view === "policy" ? <ReadinessView /> : null}
    </section>
  </>;
}

export function ProjectsPage() {
  const { session } = useAuth();
  const { projects, status, message, currentProject, selectProject, reload } = useProjects();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"organization" | "private">("organization");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isViewer = session?.role === "viewer";

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const project = await createProject({ name, description: description || undefined, visibility });
      setName("");
      setDescription("");
      reload();
      navigate(`/projects/${project.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The project could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace-page">
      <PageHeader eyebrow="Projects" title="Projects" />
      <p className="workspace-lead">Context, work, sources, outputs, and automations live together.</p>
      {error ? <WorkspaceState state="error">{error}</WorkspaceState> : null}
      <div className="workspace-columns">
        <section className="workspace-panel" aria-labelledby="projects-list-title">
          <h2 id="projects-list-title">All projects</h2>
          {status === "loading" ? (
            <p className="workspace-muted" role="status">Loading projects…</p>
          ) : status === "error" ? (
            <WorkspaceState state="error">{message ?? "Projects could not be loaded."}</WorkspaceState>
          ) : projects.length === 0 ? (
            <p className="workspace-muted">No projects exist in this organization yet. Create the first one to give durable work a home.</p>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="workspace-row-link">
                <span>
                  <b><NavLink to={`/projects/${project.id}`}>{project.name}</NavLink></b>
                  <small>{project.visibility === "private" ? "Private" : "Organization"} · {project.slug}</small>
                </span>
                <button
                  type="button"
                  className="workspace-button is-quiet"
                  disabled={currentProject?.id === project.id}
                  onClick={() => selectProject(project.id)}
                >
                  {currentProject?.id === project.id ? "Current" : "Make current"}
                </button>
              </div>
            ))
          )}
        </section>
        <section className="workspace-panel" aria-labelledby="projects-create-title">
          <h2 id="projects-create-title">Create a project</h2>
          {isViewer ? (
            <WorkspaceState state="permission_denied">Viewers cannot create projects. Ask a member or admin.</WorkspaceState>
          ) : (
            <form onSubmit={(event) => void handleCreate(event)} className="workspace-form">
              <label>
                <span>Name</span>
                <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} />
              </label>
              <label>
                <span>Description (optional)</span>
                <textarea rows={3} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} disabled={busy} />
              </label>
              <label>
                <span>Visibility</span>
                <select value={visibility} onChange={(event) => setVisibility(event.target.value as "organization" | "private")} disabled={busy}>
                  <option value="organization">Visible to the organization</option>
                  <option value="private">Private to members</option>
                </select>
              </label>
              <button className="workspace-button" disabled={busy || !name.trim()}>Create project</button>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}

export function AgentsPage() {
  const capabilities = useSection(getWorkspaceCapabilities, "agents");
  const published = useSection(() => listOrganizationRecent("agents"), "agents");
  const { currentProject } = useProjects();
  const [agentPrompts, setAgentPrompts] = useState<Record<string, string>>({});
  const [agentResults, setAgentResults] = useState<Record<string, string>>({});
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const runtimeEnabled = capabilities.status === "ready" && capabilities.data?.runtime_execution === true;
  async function runPublishedAgent(record: ProductRecordSummary) {
    if (!currentProject) return;
    const prompt = agentPrompts[record.id]?.trim();
    if (!prompt) return;
    const manifest = (record.payload["manifest"] ?? {}) as Record<string, unknown>;
    const configuration = (manifest["configuration"] ?? {}) as Record<string, unknown>;
    const publishedInstructions = String(configuration["instructions"] ?? "").trim();
    setRunningAgent(record.id);
    try {
      const result = await executeGeneralAgent({
        projectId: currentProject.id,
        prompt,
        agentVersionId: record.id,
        instructions: publishedInstructions || "Follow the published agent configuration.",
      });
      setAgentResults((current) => ({ ...current, [record.id]: result.text }));
    } catch (cause) {
      setAgentResults((current) => ({ ...current, [record.id]: cause instanceof Error ? cause.message : "The agent run failed." }));
    } finally {
      setRunningAgent(null);
    }
  }
  return (
    <section className="workspace-page">
      <PageHeader eyebrow="agents" title="Agents">
        <NavLink className="workspace-button is-quiet" to="/agents/new">Build an agent</NavLink>
      </PageHeader>
      <p className="workspace-lead">Built-in agents are published immutable configurations; execution readiness is verified server-side.</p>
      {capabilities.status !== "loading" && !runtimeEnabled ? (
        <WorkspaceState state="disconnected">
          The durable runtime is not yet enabled, so agents cannot execute runs from here. Their configurations below are
          real; their execution is truthfully unavailable.
        </WorkspaceState>
      ) : null}
      <section className="workspace-panel">
        <div className="workspace-agent-grid">
          {builtInAgents.map((agent) => {
            const slug = agent.name.toLowerCase().replace(" agent", "");
            return (
              <article key={agent.id}>
                <span>Built-in · immutable v{agent.version}{runtimeEnabled ? "" : " · runtime unavailable"}</span>
                <h2>{agent.name}</h2>
                <p>{agent.description}</p>
                <small>{agent.dexter_parity?.status === "legacy_adapter_required" ? "Finance uses the existing Dexter adapter for parity." : "Published configuration."}</small>
                <NavLink className="workspace-primary-link" to={`/agents/${slug}`}>Open {agent.name}</NavLink>
              </article>
            );
          })}
        </div>
      </section>
      <section className="workspace-panel" aria-labelledby="org-agents-title">
        <h2 id="org-agents-title">Organization agents</h2>
        {published.status === "loading" ? (
          <p className="workspace-muted" role="status">Loading…</p>
        ) : published.status === "error" || published.status === "forbidden" ? (
          <WorkspaceState state="error">{published.message ?? "Published agents could not be loaded."}</WorkspaceState>
        ) : (published.data?.items.length ?? 0) === 0 ? (
          <p className="workspace-muted">No organization agents have been published yet.</p>
        ) : (
          published.data!.items.map((record) => (
            <article key={record.id} className="workspace-form">
              <span><b>{recordTitle(record)}</b><small>published immutable version · v{record.version}</small></span>
              <label><span>Run this agent</span><textarea rows={2} value={agentPrompts[record.id] ?? ""} onChange={(event) => setAgentPrompts((current) => ({ ...current, [record.id]: event.target.value }))} placeholder="Give the published agent a task" /></label>
              <button type="button" className="workspace-button" disabled={!runtimeEnabled || !currentProject || runningAgent !== null || !agentPrompts[record.id]?.trim()} onClick={() => void runPublishedAgent(record)}>{runningAgent === record.id ? "Running on Modal…" : "Run published version"}</button>
              {agentResults[record.id] ? <WorkspaceState state="ready">{agentResults[record.id]}</WorkspaceState> : null}
            </article>
          ))
        )}
      </section>
    </section>
  );
}

export function KnowledgeAppsPage() {
  return (
    <section className="workspace-page">
      <PageHeader eyebrow="Knowledge & Apps" title="Knowledge & Apps" />
      <p className="workspace-lead">Connections show actual readiness, scope, and health — never simulated state.</p>
      <KnowledgeAppsBrowser />
    </section>
  );
}

export const SettingsWorkspacePage = () => <section className="workspace-page"><PageHeader eyebrow="Settings" title="Settings" /><p className="workspace-lead">Personal preferences stay separate from organizational policy.</p><OrganizationPanel /><BillingPanel /></section>;

export function AdminPage() {
  const { user } = useAuth();
  return canAccessAdmin(workspaceRole(user?.user_metadata)) ? (
    <section className="workspace-page">
      <PageHeader eyebrow="Admin" title="Organization administration" />
      <p className="workspace-lead">Manage provider-backed onboarding with server-enforced organization roles.</p>
      <OrganizationPanel admin />
    </section>
  ) : (
    <section className="workspace-page">
      <PageHeader eyebrow="Admin" title="Admin access is restricted." />
      <WorkspaceState state="permission_denied">Owner or Admin access is required. Your current role cannot view organization policy or usage.</WorkspaceState>
    </section>
  );
}
