import { motion } from "framer-motion";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { clearMvpBypassSession } from "../lib/mvpBypass";
import { supabase } from "../lib/supabaseClient";
import { AmbientBackground, AppBrand } from "./protectedUi";
import { studioColors } from "../lib/theme";

const primaryNav = [
  { label: "Home", path: "/dashboard", icon: "⌂", color: studioColors.home },
  { label: "Chat", path: "/chat", icon: "☰", color: studioColors.chat },
  { label: "Writing", path: "/writing", icon: "✎", color: studioColors.writing },
  { label: "Research", path: "/research", icon: "◉", color: studioColors.research },
  { label: "Image", path: "/image", icon: "◧", color: studioColors.image },
  { label: "Data", path: "/data", icon: "▤", color: studioColors.data },
  { label: "Finance", path: "/finance", icon: "△", color: studioColors.finance },
];

const secondaryNav = [
  { label: "Artifacts", path: "/artifacts", icon: "▣", color: studioColors.artifacts },
  { label: "Settings", path: "/settings", icon: "⋯", color: studioColors.settings },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);

  const handleSignOut = async () => {
    clearMvpBypassSession();
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/");
  };

  return (
    <div className="app-shell">
      <AmbientBackground />

      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`app-sidebar ${expanded ? "" : "is-collapsed"}`.trim()}
      >
        <div className="app-sidebar-top">
          <NavLink to="/dashboard" className="brand-link">
            <AppBrand compact={!expanded} />
          </NavLink>
          <button className="sidebar-toggle" onClick={() => setExpanded((value) => !value)} type="button">
            {expanded ? "‹" : "›"}
          </button>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav">
          {primaryNav.map((item) => (
            <NavLink key={item.path} to={item.path} className="sidebar-link">
              <span className="sidebar-link-icon" style={{ background: `${item.color}18`, color: item.color }}>
                {item.icon}
              </span>
              {expanded ? <span>{item.label}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-section-label">Library</div>
        <nav className="sidebar-nav">
          {secondaryNav.map((item) => (
            <NavLink key={item.path} to={item.path} className="sidebar-link">
              <span className="sidebar-link-icon" style={{ background: `${item.color}18`, color: item.color }}>
                {item.icon}
              </span>
              {expanded ? <span>{item.label}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-row">
            <div className="sidebar-user-avatar">{user?.email?.slice(0, 1).toUpperCase() ?? "U"}</div>
            {expanded ? (
              <div className="sidebar-user-copy">
                <strong>{user?.email ?? "MVP Preview User"}</strong>
                <span>Workspace access active</span>
              </div>
            ) : null}
          </div>
          <button className="button button-secondary sidebar-signout" onClick={handleSignOut} type="button">
            {expanded ? "Sign out" : "↗"}
          </button>
        </div>
      </motion.aside>

      <main className={`app-main ${expanded ? "" : "is-wide"}`.trim()}>
        <Outlet />
      </main>
    </div>
  );
}
