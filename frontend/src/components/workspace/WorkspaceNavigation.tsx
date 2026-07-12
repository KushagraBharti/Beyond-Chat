import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { canonicalNavigation, canAccessAdmin, type PlannedWorkspaceRole } from "../../features/workspace/adapter";

const pathFor: Record<string, string> = { home: "/home", chat: "/chat", work: "/work", projects: "/projects", agents: "/agents", knowledge_apps: "/knowledge-apps", automations: "/automations", settings: "/settings", admin: "/admin" };

export function WorkspaceNavigation({ role, email, open, onClose, onSignOut }: { role: PlannedWorkspaceRole; email?: string; open: boolean; onClose: () => void; onSignOut?: () => void }) {
  const firstLink = useRef<HTMLAnchorElement>(null);
  const navigation = canonicalNavigation.filter((item) => item.concept !== "admin" || canAccessAdmin(role));
  useEffect(() => { if (open) firstLink.current?.focus(); }, [open]);
  return <aside id="workspace-navigation" className={`workspace-nav ${open ? "is-open" : ""}`} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
    <div className="workspace-mark"><span aria-hidden="true">B</span><div><strong>Beyond</strong><small>Unified workspace</small></div></div>
    <nav aria-label="Workspace navigation">
      {navigation.map((item, index) => <NavLink key={item.id} ref={index === 0 ? firstLink : undefined} to={pathFor[item.concept]} onClick={onClose} className={({ isActive }) => `workspace-nav-link ${isActive ? "is-active" : ""}`}><span className="workspace-nav-dot" aria-hidden="true" />{item.label}</NavLink>)}
    </nav>
    <nav aria-label="Workspace context" className="workspace-context-nav"><NavLink to="/memory" onClick={onClose} className={({ isActive }) => `workspace-nav-link ${isActive ? "is-active" : ""}`}><span className="workspace-nav-dot" aria-hidden="true" />Memory</NavLink></nav>
    <div className="workspace-nav-footer"><span className="workspace-avatar">{email?.[0]?.toUpperCase() ?? "U"}</span><div><strong>{email?.split("@")[0] ?? "Workspace member"}</strong><small>{role}</small></div>{onSignOut ? <button type="button" onClick={onSignOut}>Sign out</button> : null}</div>
  </aside>;
}
