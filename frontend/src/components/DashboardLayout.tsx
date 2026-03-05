import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { clearMvpBypassSession } from "../lib/mvpBypass";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

const heading = "'Bricolage Grotesque', sans-serif";
const body = "'Plus Jakarta Sans', sans-serif";

const c = {
  canvas: "#F2F2F0",
  surface: "#FFFFFF",
  ink: "#0D0D0D",
  primary: "#4F3FE8",
  accent: "#E55613",
  muted: "#6B6B70",
  border: "#E2E2E0",
  subtle: "#EAEAE8",
};

const studioColors: Record<string, string> = {
  writing: "#4F3FE8",
  research: "#0E7AE6",
  image: "#E5484D",
  data: "#30A46C",
  finance: "#E55613",
  compare: "#8B5CF6",
};

const navItems = [
  { label: "Home", path: "/dashboard", icon: "⌂" },
  { label: "Writing", path: "/studio/writing", icon: "✎", color: studioColors.writing },
  { label: "Research", path: "/studio/research", icon: "◉", color: studioColors.research },
  { label: "Image", path: "/studio/image", icon: "◧", color: studioColors.image },
  { label: "Data", path: "/studio/data", icon: "▤", color: studioColors.data },
  { label: "Finance", path: "/studio/finance", icon: "△", color: studioColors.finance },
  { label: "Compare", path: "/studio/compare", icon: "⧉", color: studioColors.compare },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    clearMvpBypassSession();
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: body, background: c.canvas }}>
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          width: 240,
          background: c.surface,
          borderRight: `1px solid ${c.border}`,
          display: "flex",
          flexDirection: "column",
          padding: "1.25rem 0",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div style={{ padding: "0 1.25rem", marginBottom: "1.5rem" }}>
          <NavLink to="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ position: "relative", width: 24, height: 24 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 5, background: `linear-gradient(135deg, ${c.primary}, ${c.accent})` }} />
              <div style={{ position: "absolute", inset: 2, borderRadius: 3, background: c.surface }} />
              <div style={{ position: "absolute", inset: 6, borderRadius: 1, background: c.ink }} />
            </div>
            <span style={{ fontFamily: heading, fontSize: "1.05rem", fontWeight: 800, color: c.ink, letterSpacing: "-0.03em" }}>
              Beyond Chat
            </span>
          </NavLink>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "0 0.75rem" }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                padding: "0.55rem 0.65rem",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: "0.88rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? c.ink : c.muted,
                background: isActive ? c.canvas : "transparent",
                transition: "all 0.15s",
              })}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.85rem",
                  borderRadius: 5,
                  background: item.color ? `${item.color}12` : "transparent",
                  color: item.color || c.ink,
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div style={{ padding: "0 0.75rem", borderTop: `1px solid ${c.border}`, paddingTop: "0.75rem", marginTop: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.65rem" }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${c.primary}, ${c.accent})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {user?.email?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: c.ink,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.email ?? "User"}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.85rem",
                color: c.muted,
                padding: "0.25rem",
                borderRadius: 4,
                lineHeight: 1,
              }}
            >
              ↗
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 240, minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
