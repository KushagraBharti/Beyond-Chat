import { useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { workspaceRole } from "../../features/workspace/adapter";
import { useAuth } from "../../context/AuthContext";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
import "../../styles/workspace/workspace.css";
import "../../styles/workspace/workspace-integration.css";

export function WorkspaceLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeMenu = () => {
    setOpen(false);
    window.setTimeout(() => menuButton.current?.focus(), 0);
  };
  const role = workspaceRole(user?.user_metadata);
  return <div className="workspace-shell">
    <a className="workspace-skip" href="#workspace-main">Skip to workspace content</a>
    <header className="workspace-mobile-head"><strong>Beyond</strong><button ref={menuButton} type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="workspace-navigation">Menu</button></header>
    <WorkspaceNavigation role={role} email={user?.email} open={open} onClose={closeMenu} onSignOut={() => void signOut().finally(() => navigate("/login", { replace: true }))} />
    <main id="workspace-main" className="workspace-main"><Outlet /></main>
  </div>;
}
