import { useId, type ReactNode } from "react";
import type { WorkspaceUiState } from "../../features/workspace/adapter";

const stateCopy: Readonly<Record<WorkspaceUiState, { readonly title: string; readonly tone: "neutral" | "warning" | "error" }>> = {
  loading: { title: "Loading workspace data", tone: "neutral" },
  empty: { title: "Nothing to show yet", tone: "neutral" },
  error: { title: "This preview could not be loaded", tone: "error" },
  disconnected: { title: "Connection paused", tone: "warning" },
  permission_denied: { title: "You do not have access", tone: "warning" },
};

export function WorkspaceState({ state, children }: { state: WorkspaceUiState; children: ReactNode }) {
  const copy = stateCopy[state];
  return <div className={`workspace-notice is-${copy.tone}`} role={state === "error" || state === "permission_denied" ? "alert" : "status"} data-workspace-state={state}><strong>{copy.title}</strong><span>{children}</span></div>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <header className="workspace-page-head"><div><p>{eyebrow}</p><h1>{title}</h1></div>{children}</header>;
}

export function DisabledControl({ children, explanation }: { children: ReactNode; explanation: string }) {
  const explanationId = useId();
  return <span className="workspace-disabled-control"><button className="workspace-button is-quiet" type="button" disabled aria-describedby={explanationId}>{children}</button><span id={explanationId} className="sr-only">{explanation}</span></span>;
}
