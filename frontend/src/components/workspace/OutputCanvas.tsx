import { useId, useRef, useState, type KeyboardEvent } from "react";
import { NavLink } from "react-router-dom";
import type { WorkFixture } from "../../features/workspace/adapter";
import { WorkspaceState } from "./WorkspacePrimitives";

export function OutputCanvas({ work }: { work: WorkFixture }) {
  const [active, setActive] = useState(work.outputs[0]?.id ?? "");
  const baseId = useId();
  const tabs = useRef(new Map<string, HTMLButtonElement>());
  const output = work.outputs.find((item) => item.id === active);
  if (!output) return <section className="workspace-output"><WorkspaceState state="empty">Output metadata will arrive from the durable task API.</WorkspaceState></section>;
  return <section className="workspace-output">
    <div className="workspace-output-tabs" role="tablist" aria-label="Task outputs">
      {work.outputs.map((item, index) => <button key={item.id} ref={(node) => { if (node) tabs.current.set(item.id, node); else tabs.current.delete(item.id); }} id={`${baseId}-${item.id}-tab`} role="tab" type="button" aria-selected={item.id === active} aria-controls={`${baseId}-${item.id}-panel`} tabIndex={item.id === active ? 0 : -1} onClick={() => setActive(item.id)} onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
        const last = work.outputs.length - 1;
        const next = event.key === "ArrowRight" || event.key === "ArrowDown" ? (index + 1) % work.outputs.length : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (index - 1 + work.outputs.length) % work.outputs.length : event.key === "Home" ? 0 : event.key === "End" ? last : index;
        if (next === index) return;
        event.preventDefault();
        const nextId = work.outputs[next].id;
        setActive(nextId);
        tabs.current.get(nextId)?.focus();
      }}>{item.label}</button>)}
    </div>
    <div id={`${baseId}-${output.id}-panel`} role="tabpanel" aria-labelledby={`${baseId}-${output.id}-tab`} className={`workspace-output-preview is-${output.type}`}><span>{output.type.replace("_", " ")}</span><h3>{output.label}</h3><p>Output state: {output.state.replaceAll("_", " ")}. This deterministic preview is not a generated file.</p><NavLink className="workspace-primary-link" to={`/outputs/${output.id}`}>Open review surface</NavLink></div>
  </section>;
}
