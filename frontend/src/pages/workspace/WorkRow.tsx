import { NavLink } from "react-router-dom";
import { statusLabel, type WorkFixture } from "../../features/workspace/adapter";

export function WorkRow({ work }: { work: WorkFixture }) {
  return <NavLink to={`/work/${work.id}`} className="workspace-work-row"><span className={`workspace-status is-${work.status}`} aria-label={statusLabel[work.status]} /><span><b>{work.title}</b><small>{work.project} · {work.updated}</small></span><em>{statusLabel[work.status]}</em></NavLink>;
}
