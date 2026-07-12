import { useState } from "react";
import { NavLink, useLocation, useParams } from "react-router-dom";
import { takePromotionDraft, workFixtures } from "../../features/workspace/adapter";
import { DisabledControl, PageHeader, WorkspaceState } from "../../components/workspace/WorkspacePrimitives";
import { OutputCanvas } from "../../components/workspace/OutputCanvas";
import { WorkRow } from "./WorkRow";

export function WorkListPage() {
  return <section className="workspace-page"><PageHeader eyebrow="Work" title="Durable tasks, visible control." /><div className="workspace-panel"><div className="workspace-list-head"><h2>All work</h2><NavLink className="workspace-button" to="/work/new">New task</NavLink></div>{workFixtures.map((work) => <WorkRow key={work.id} work={work} />)}</div></section>;
}

function NewWorkDraft() {
  const [draft, setDraft] = useState(() => takePromotionDraft());
  if (!draft) return <WorkspaceState state="empty">Start in Chat to bring an explicit draft and reference chips into Work.</WorkspaceState>;
  return <section className="workspace-panel workspace-promotion"><label htmlFor="work-goal">Goal carried from Chat</label><textarea id="work-goal" value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} /><div className="workspace-chip-list">{draft.references.map((chip) => <span className="workspace-chip" key={chip.id}>{chip.kind}: {chip.label}</span>)}</div><DisabledControl explanation="The Phase 3 command API is not available, so this draft cannot be saved as a server task.">Save draft unavailable</DisabledControl><p className="workspace-footnote">No run was created. Saving and execution require the Phase 3 command API.</p></section>;
}

function FixtureTask({ work }: { work: (typeof workFixtures)[number] }) {
  return <div className="workspace-task-grid">
    <section className="workspace-panel workspace-conversation"><h2>Conversation & plan</h2><p>{work.goal}</p><ol><li className="is-done">Confirm scope and evidence</li><li className="is-active">Prepare the deliverable</li><li>Request review before publishing</li></ol><div className="workspace-tool-card"><b>Knowledge retrieval</b><span>Fixture event · no external source was queried</span></div><div className="workspace-tool-card"><b>Document canvas</b><span>Fixture event · output remains reviewable</span></div><div className="workspace-controls"><DisabledControl explanation="Cancellation needs a durable run identifier from the Phase 3 API.">Cancel unavailable</DisabledControl><DisabledControl explanation="Resume needs a durable run checkpoint from the Phase 3 API.">Resume unavailable</DisabledControl></div></section>
    <aside className="workspace-task-side"><section className="workspace-panel"><h2>Approval</h2><p>This fixture task is paused before a consequential action. The UI cannot approve or request approval without the durable command API.</p><DisabledControl explanation="Approval requests must be persisted and policy-checked by the Phase 3 API.">Approval unavailable</DisabledControl></section><section className="workspace-panel"><h2>Sources</h2><p className="workspace-muted">The source drawer awaits the knowledge API.</p><DisabledControl explanation="Source access must be permission-checked by the knowledge API.">Source drawer unavailable</DisabledControl></section></aside>
  </div>;
}

export function WorkDetailPage() {
  const location = useLocation();
  const { workId } = useParams();
  const isNew = location.pathname.endsWith("/new");
  const routeWorkId = workId ?? location.pathname.split("/").at(-1);
  const work = workFixtures.find((item) => item.id === routeWorkId);
  const [reconnectState, setReconnectState] = useState<"disconnected" | "local_preview">("disconnected");
  if (!isNew && !work) {
    return <section className="workspace-page"><PageHeader eyebrow="Work" title="This task is not available." /><WorkspaceState state="error">No fixture or durable task matched this URL. Nothing else was substituted in its place.</WorkspaceState><NavLink className="workspace-button" to="/work">Return to all work</NavLink></section>;
  }
  return <section className="workspace-page">
    <PageHeader eyebrow={isNew ? "New Work" : "Work"} title={isNew ? "Turn this chat into a task" : work!.title}><button className="workspace-button is-quiet" type="button" onClick={() => setReconnectState("local_preview")}>Inspect local reconnect state</button></PageHeader>
    {reconnectState === "disconnected" ? <WorkspaceState state="disconnected">The durable event API is unavailable. Timeline entries are local fixtures, not recovered server events.</WorkspaceState> : <WorkspaceState state="loading">Local reconnect preview only. No network replay or server recovery was performed.</WorkspaceState>}
    {isNew ? <NewWorkDraft /> : <><FixtureTask work={work!} /><OutputCanvas work={work!} /></>}
  </section>;
}
