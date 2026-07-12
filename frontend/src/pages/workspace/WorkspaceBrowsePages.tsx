import { useId, useRef, type KeyboardEvent } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { builtInAgents, canAccessAdmin, capabilityFixtures, knowledgeSourceFixtures, policyAuditFixtures, workspaceRole, type CapabilityView } from "../../features/workspace/adapter";
import { PageHeader, WorkspaceState } from "../../components/workspace/WorkspacePrimitives";
import { OrganizationPanel } from "../../components/organizations/OrganizationPanel";

type BrowseConcept = "projects" | "agents" | "knowledge" | "automations" | "settings" | "admin";
const copy: Readonly<Record<BrowseConcept, readonly [string, string]>> = {
  projects: ["Projects", "Context, work, sources, outputs, and automations live together."], agents: ["Agents", "Immutable built-ins are available now; custom publishing awaits the control plane."], knowledge: ["Knowledge & Apps", "Connections show actual readiness, scope, and health."], automations: ["Automations", "Schedules and triggers will create durable tasks, not background chat."], settings: ["Settings", "Personal workspace preferences stay separate from organizational policy."], admin: ["Admin", "Organization roles, policies, usage, and approved apps belong here."],
};

function CapabilityState({ state }: { state: string }) {
  return <span className={`workspace-state-pill is-${state.replaceAll("_", "-")}`}>{state.replaceAll("_", " ")}</span>;
}

const capabilityViews: readonly { readonly id: CapabilityView; readonly label: string }[] = [
  { id: "apps", label: "Apps" }, { id: "skills", label: "Skills" }, { id: "mcp", label: "MCP" }, { id: "sources", label: "Sources" }, { id: "policy", label: "Policy & audit" },
];

function KnowledgeAppsBrowser() {
  const baseId = useId();
  const tabs = useRef(new Map<CapabilityView, HTMLButtonElement>());
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("view") as CapabilityView | null;
  const view = capabilityViews.some((item) => item.id === requested) ? requested as CapabilityView : "apps";
  const capabilities = capabilityFixtures.filter((item) => item.kind === view.slice(0, -1) || (view === "mcp" && item.kind === "mcp"));
  const selectView = (nextView: CapabilityView) => {
    setSearchParams({ view: nextView });
    tabs.current.get(nextView)?.focus();
  };
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
      {view === "sources" ? <div className="workspace-capability-list">{knowledgeSourceFixtures.map((source) => <article key={source.id} className="workspace-capability-row"><div><span className="workspace-capability-meta">{source.mode} · {source.freshness}</span><h2>{source.label}</h2><p>{source.access}</p><small>{source.citation}</small></div><CapabilityState state={source.state} /></article>)}</div> : null}
      {view === "policy" ? <div className="workspace-capability-list">{policyAuditFixtures.map((entry) => <article key={entry.id} className="workspace-capability-row"><div><span className="workspace-capability-meta">Contract snapshot</span><h2>{entry.label}</h2><p>{entry.detail}</p></div><CapabilityState state={entry.state} /></article>)}</div> : null}
      {view !== "sources" && view !== "policy" ? <div className="workspace-capability-list">{capabilities.map((item) => <article key={item.id} className="workspace-capability-row"><div><span className="workspace-capability-meta">{item.kind} · {item.scope} · {item.version}</span><h2>{item.label}</h2><p>{item.detail}</p></div><CapabilityState state={item.state} /></article>)}</div> : null}
      {view === "apps" ? <WorkspaceState state="disconnected">Connection controls are read-only until Phase 2 identity and Phase 3 audit/approval APIs are available.</WorkspaceState> : null}
      {view === "sources" ? <p className="workspace-footnote">These are deterministic offline fixtures. Retrieval remains deny-by-default, permission-filtered before scoring, and citation-bound to an exact accessible revision.</p> : null}
    </section>
  </>;
}

function GenericBrowse({ concept }: { concept: BrowseConcept }) {
  const [title, description] = copy[concept];
  return <section className="workspace-page"><PageHeader eyebrow={concept === "knowledge" ? "Knowledge & Apps" : concept} title={title}>{concept === "agents" ? <NavLink className="workspace-button is-quiet" to="/agents/new">Build an agent</NavLink> : null}</PageHeader><p className="workspace-lead">{description}</p>{concept === "agents" ? <section className="workspace-panel"><div className="workspace-agent-grid">{builtInAgents.map((agent) => { const slug = agent.name.toLowerCase().replace(" agent", ""); return <article key={agent.id}><span>Built-in · immutable v{agent.version}</span><h2>{agent.name}</h2><p>{agent.description}</p><small>{agent.dexter_parity?.status === "legacy_adapter_required" ? "Finance uses the existing Dexter adapter for parity." : "Published configuration."}</small><NavLink className="workspace-primary-link" to={`/agents/${slug}`}>Open {agent.name}</NavLink></article>; })}</div></section> : concept === "knowledge" ? <KnowledgeAppsBrowser /> : <section className="workspace-panel"><WorkspaceState state="empty">This deliberately empty state does not imply that an action succeeded or a connection exists.</WorkspaceState></section>}</section>;
}
export const ProjectsPage = () => <GenericBrowse concept="projects" />;
export const AgentsPage = () => <GenericBrowse concept="agents" />;
export const KnowledgeAppsPage = () => <GenericBrowse concept="knowledge" />;
export const SettingsWorkspacePage = () => <section className="workspace-page"><PageHeader eyebrow="Settings" title="Settings" /><p className="workspace-lead">Personal preferences stay separate from organizational policy.</p><OrganizationPanel /></section>;
export function AdminPage() { const { user } = useAuth(); return canAccessAdmin(workspaceRole(user?.user_metadata)) ? <section className="workspace-page"><PageHeader eyebrow="Admin" title="Organization administration" /><p className="workspace-lead">Manage provider-backed onboarding with server-enforced organization roles.</p><OrganizationPanel admin /></section> : <section className="workspace-page"><PageHeader eyebrow="Admin" title="Admin access is restricted." /><WorkspaceState state="permission_denied">Owner or Admin access is required. Your current role cannot view organization policy or usage.</WorkspaceState></section>; }
