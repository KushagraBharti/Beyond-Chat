import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { setStoredWorkspaceId } from "../lib/api";
import { supabase } from "../lib/supabaseClient";
import { AppBrand } from "./protectedUi";

type NavItem = {
  label: string;
  path: string;
  icon: ReactNode;
  accent: string;
};

function SidebarIcon({
  children,
  active,
  accent,
}: {
  children: ReactNode;
  active: boolean;
  accent: string;
}) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition ${
        active
          ? "border-white/20 bg-white/10 text-white"
          : "border-stone-200 group-hover:border-stone-300 group-hover:bg-white"
      }`}
      style={active ? undefined : { background: `${accent}14`, color: accent }}
    >
      {children}
    </span>
  );
}

function DashboardGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="14" width="7" height="6.5" rx="1.5" />
    </svg>
  );
}

function ChatGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 7.5A3.5 3.5 0 0 1 8 4h8A3.5 3.5 0 0 1 19.5 7.5v4A3.5 3.5 0 0 1 16 15H10.5L6 18v-3H8A3.5 3.5 0 0 1 4.5 11.5z" />
      <path d="M8 8.75h8" />
      <path d="M8 11.75h5" />
    </svg>
  );
}

function PencilGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 20 4.5-1 9.2-9.2a2.2 2.2 0 1 0-3.1-3.1L5.4 15.9 4 20Z" />
      <path d="M13.5 6.5 17.5 10.5" />
    </svg>
  );
}

function NotebookGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.5h10.5A2.5 2.5 0 0 1 20 6v12a2.5 2.5 0 0 1-2.5 2.5H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
      <path d="M8.5 7.5h8" />
      <path d="M8.5 11.5h8" />
      <path d="M8.5 15.5h5" />
      <path d="M5 7.5h-.5" />
      <path d="M5 11.5h-.5" />
      <path d="M5 15.5h-.5" />
    </svg>
  );
}

function ImageGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="m20.5 16.5-5.4-5.4L7 19.5" />
    </svg>
  );
}

function DataGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18h16" />
      <path d="M7 18V10" />
      <path d="M12 18V6" />
      <path d="M17 18v-4" />
    </svg>
  );
}

function FinanceGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 18 10 12.5l3.2 3.2L19 9.5" />
      <path d="M19 14V9.5h-4.5" />
    </svg>
  );
}

function ArchiveGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="4" rx="1.5" />
      <path d="M5.5 9.5v8.5A2 2 0 0 0 7.5 20h9a2 2 0 0 0 2-2V9.5" />
      <path d="M10 13h4" />
    </svg>
  );
}

function SettingsGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z" />
    </svg>
  );
}

function CollapseGlyph({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M9 4v16" />
      {collapsed ? <path d="m16 12-3-3v6l3-3Z" /> : <path d="m14 12 3-3v6l-3-3Z" />}
    </svg>
  );
}

function ExitGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 6H6.5A2.5 2.5 0 0 0 4 8.5v7A2.5 2.5 0 0 0 6.5 18H10" />
      <path d="M14 8.5 18 12l-4 3.5" />
      <path d="M18 12H9" />
    </svg>
  );
}

const primaryNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: <DashboardGlyph />, accent: "#0D0D0D" },
  { label: "Chat", path: "/chat", icon: <ChatGlyph />, accent: "#111827" },
  { label: "Writing", path: "/writing", icon: <PencilGlyph />, accent: "#4F3FE8" },
  { label: "Research", path: "/research", icon: <NotebookGlyph />, accent: "#0E7AE6" },
  { label: "Image", path: "/image", icon: <ImageGlyph />, accent: "#E5484D" },
  { label: "Data", path: "/data", icon: <DataGlyph />, accent: "#30A46C" },
  { label: "Finance", path: "/finance", icon: <FinanceGlyph />, accent: "#E55613" },
];

const secondaryNav: NavItem[] = [
  { label: "Artifacts", path: "/artifacts", icon: <ArchiveGlyph />, accent: "#A855F7" },
  { label: "Settings", path: "/settings", icon: <SettingsGlyph />, accent: "#6B6B70" },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const collapsed = !expanded;

  const handleSignOut = async () => {
    setStoredWorkspaceId(null);
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.10),transparent_34%),#f5f5f4] text-stone-950">
      <div className="flex min-h-screen w-full gap-4 px-3 py-3 md:px-4">
        <aside
          className={`sticky top-3 hidden h-[calc(100vh-1.5rem)] flex-col rounded-[2rem] border border-white/70 bg-white/80 px-4 pt-4 pb-7 shadow-[0_24px_80px_rgba(28,25,23,0.08)] backdrop-blur xl:flex ${
            expanded ? "w-64" : "w-24"
          }`}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-6 flex items-center justify-between gap-3">
              <NavLink to="/dashboard" className="overflow-hidden">
                <AppBrand compact={collapsed} />
              </NavLink>
              <button
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:border-stone-300 hover:text-stone-900"
                onClick={() => setExpanded((value) => !value)}
                type="button"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <CollapseGlyph collapsed={collapsed} />
              </button>
            </div>

            {expanded ? <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-stone-500">Workspace</div> : null}
            <nav className="flex flex-col gap-1.5">
              {primaryNav.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group flex items-center rounded-2xl px-3 py-3 text-sm font-medium transition ${
                      collapsed ? "justify-center" : "gap-3"
                    } ${isActive ? "bg-stone-950 text-white shadow-lg" : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <SidebarIcon active={isActive} accent={item.accent}>
                        {item.icon}
                      </SidebarIcon>
                      {expanded ? <span className={isActive ? "text-white" : "text-inherit"}>{item.label}</span> : null}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {expanded ? <div className="mt-6 px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-stone-500">Library</div> : null}
            <nav className="flex flex-col gap-1.5">
              {secondaryNav.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group flex items-center rounded-2xl px-3 py-3 text-sm font-medium transition ${
                      collapsed ? "justify-center" : "gap-3"
                    } ${isActive ? "bg-stone-950 text-white shadow-lg" : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <SidebarIcon active={isActive} accent={item.accent}>
                        {item.icon}
                      </SidebarIcon>
                      {expanded ? <span className={isActive ? "text-white" : "text-inherit"}>{item.label}</span> : null}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className={`${expanded ? "flex items-end justify-start gap-3 pl-3 pr-2" : "flex flex-col items-center gap-3"}`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-rose-500 text-sm font-bold text-white">
              {user?.email?.slice(0, 1).toUpperCase() ?? "U"}
            </div>

            <button
              className={`group flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white text-stone-700 transition hover:-translate-y-0.5 hover:border-[#4F3FE8] hover:bg-[#4F3FE8] hover:text-white hover:shadow-[0_14px_36px_rgba(79,63,232,0.32)] ${
                expanded ? "min-w-[122px] px-4 py-3" : "h-11 w-11"
              }`}
              onClick={handleSignOut}
              type="button"
              aria-label="Sign out"
              title="Sign out"
            >
              <ExitGlyph />
              {expanded ? <span className="text-sm font-semibold">Sign out</span> : null}
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="mb-4 flex items-center gap-3 rounded-[1.75rem] border border-white/60 bg-white/75 px-4 py-3 shadow-[0_16px_50px_rgba(28,25,23,0.06)] backdrop-blur xl:hidden">
            <AppBrand compact={false} />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[...primaryNav, ...secondaryNav].map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ${
                      isActive ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-700"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex min-h-[calc(100vh-2rem)] flex-1 flex-col rounded-[2rem] border border-white/60 bg-white/45 p-4 shadow-[0_20px_80px_rgba(28,25,23,0.06)] backdrop-blur md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
