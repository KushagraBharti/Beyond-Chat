import { useMemo, useState } from "react";
import { filterMemoryEntries } from "../../features/memory/adapter";
import type { MemoryEntryView, MemoryProposalView, MemoryScopeKind, MemoryUiActions, RecallExplanationView } from "../../features/memory/model";
import { MemoryEntryRow } from "./MemoryEntryRow";
import { MemoryProposalQueue } from "./MemoryProposalQueue";
import "./memory.css";

export interface MemoryInspectorProps extends MemoryUiActions {
  readonly entries: readonly MemoryEntryView[];
  readonly proposals: readonly MemoryProposalView[];
  readonly explanations?: readonly RecallExplanationView[];
  readonly disabledSpaceIds?: readonly string[];
  readonly state?: "ready" | "loading" | "error";
  readonly errorMessage?: string;
}

export function MemoryInspector(props: MemoryInspectorProps) {
  const [scope, setScope] = useState<MemoryScopeKind | "all">("all"); const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterMemoryEntries(props.entries, scope, query), [props.entries, query, scope]); const explanations = new Map(props.explanations?.map((item) => [item.entryId, item]));
  if (props.state === "loading") return <section className="memory-inspector" aria-busy="true"><div className="memory-skeleton is-heading" /><div className="memory-skeleton" /><div className="memory-skeleton" /></section>;
  if (props.state === "error") return <section className="memory-inspector"><div className="memory-error" role="alert"><strong>Memory could not be loaded</strong><p>{props.errorMessage ?? "Try again after the connection recovers."}</p></div></section>;
  return <section className="memory-inspector" aria-labelledby="memory-title">
    <header className="memory-header"><div><p className="memory-eyebrow">Context controls</p><h1 id="memory-title">Memory</h1><p>Review what agents can recall, where it applies, and why it appeared.</p></div><button type="button" className="memory-button" onClick={() => void props.onExport()}>Export my memory</button></header>
    <div className="memory-privacy-note"><strong>Personal memory stays personal.</strong><span>Shared agents receive it only when you attach it explicitly.</span></div>
    <MemoryProposalQueue proposals={props.proposals} onAccept={props.onAcceptProposal} onReject={props.onRejectProposal} />
    <section className="memory-library" aria-labelledby="memory-library-title"><header><div><p className="memory-eyebrow">Active context</p><h2 id="memory-library-title">Memory library</h2></div><label className="memory-search">Search memories<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by topic or content" /></label></header>
      <div className="memory-scope-tabs" role="group" aria-label="Filter by memory scope">{(["all", "user", "project", "team"] as const).map((value) => <button type="button" key={value} aria-pressed={scope === value} onClick={() => setScope(value)}>{value === "all" ? "All" : value === "user" ? "Only me" : value === "project" ? "This project" : "Team"}</button>)}</div>
      {filtered.length === 0 ? <div className="memory-empty"><strong>No memories match this view</strong><p>Change the scope or search phrase. New memories appear only after acceptance.</p></div> : <div className="memory-entry-list">{filtered.map((entry) => <MemoryEntryRow key={entry.id} entry={entry} explanation={explanations.get(entry.id)} onEdit={props.onEditEntry} onDelete={props.onDeleteEntry} />)}</div>}
    </section>
    <section className="memory-space-controls" aria-labelledby="memory-space-title"><div><h2 id="memory-space-title">Recall controls</h2><p>Disabling a space removes it from future retrieval without deleting its revision history.</p></div>{[...new Set(props.entries.map((entry) => entry.spaceId))].map((spaceId) => { const entry = props.entries.find((item) => item.spaceId === spaceId); const enabled = !props.disabledSpaceIds?.includes(spaceId); return <label key={spaceId}><span>{entry?.scope === "user" ? "Personal memory" : entry?.scope === "project" ? "Project memory" : "Team memory"}<small>{enabled ? "Included in recall" : "Excluded from recall"}</small></span><input type="checkbox" checked={enabled} onChange={(event) => void props.onSetSpaceEnabled(spaceId, event.target.checked)} /></label>; })}</section>
  </section>;
}
