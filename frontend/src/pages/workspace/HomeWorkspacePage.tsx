import { NavLink } from "react-router-dom";
import { builtInAgents, workFixtures } from "../../features/workspace/adapter";
import { PageHeader, WorkspaceState } from "../../components/workspace/WorkspacePrimitives";
import { WorkRow } from "./WorkRow";

export function HomeWorkspacePage() {
  return <section className="workspace-page">
    <PageHeader eyebrow="Home" title="Pick up where the work is." />
    <div className="workspace-home-grid">
      <section className="workspace-feature"><div><p className="workspace-kicker">Active work</p><h2>{workFixtures[0].title}</h2><p>{workFixtures[0].goal}</p><NavLink to="/work/work.market-brief" className="workspace-primary-link">Open task</NavLink></div><span className="workspace-orbit" aria-hidden="true">02</span></section>
      <section className="workspace-panel"><h2>Approvals waiting</h2><p className="workspace-muted">One fixture task is paused at a consequence boundary.</p><NavLink to="/work/work.q3-model" className="workspace-row-link"><span>Q3 scenario model</span><b>Inspect state</b></NavLink></section>
    </div>
    <div className="workspace-columns">
      <section className="workspace-panel"><h2>Recent work</h2>{workFixtures.map((work) => <WorkRow key={work.id} work={work} />)}</section>
      <section className="workspace-panel"><h2>Saved agents</h2>{builtInAgents.map((agent) => <NavLink key={agent.id} to="/agents" className="workspace-row-link"><span><b>{agent.name}</b><small>{agent.description}</small></span><i>v{agent.version}</i></NavLink>)}</section>
    </div>
    <WorkspaceState state="disconnected">Notion is a disconnected fixture. Reconnect controls are not available until the Apps control plane exists.</WorkspaceState>
  </section>;
}
