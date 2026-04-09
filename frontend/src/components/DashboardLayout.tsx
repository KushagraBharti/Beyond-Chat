import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { setStoredWorkspaceId } from "../lib/api";
import { setMvpBypassActive } from "../lib/mvpBypass";
import { supabase } from "../lib/supabaseClient";
import { AppBrand } from "./protectedUi";

const primaryNav = [
  { label: "Home", path: "/dashboard", icon: "⌂" },
  { label: "Chat", path: "/chat", icon: "☰" },
  { label: "Writing", path: "/writing", icon: "✎" },
  { label: "Research", path: "/research", icon: "◉" },
  { label: "Image", path: "/image", icon: "◧" },
  { label: "Data", path: "/data", icon: "▤" },
  { label: "Finance", path: "/finance", icon: "△" },
];

const secondaryNav = [
  { label: "Artifacts", path: "/artifacts", icon: "▣" },
  { label: "Settings", path: "/settings", icon: "⋯" },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, mvpBypassActive } = useAuth();
  const [expanded, setExpanded] = useState(true);

  const handleSignOut = async () => {
    setStoredWorkspaceId(null);
    setMvpBypassActive(false);
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.10),transparent_34%),#f5f5f4] text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-4 px-3 py-3 md:px-4">
        <aside
          className={`sticky top-3 hidden h-[calc(100vh-1.5rem)] flex-col rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-[0_24px_80px_rgba(28,25,23,0.08)] backdrop-blur xl:flex ${
            expanded ? "w-72" : "w-24"
          }`}
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <NavLink to="/dashboard" className="overflow-hidden">
              <AppBrand compact={!expanded} />
            </NavLink>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:text-stone-900"
              onClick={() => setExpanded((value) => !value)}
              type="button"
            >
              {expanded ? "‹" : "›"}
            </button>
          </div>

          {expanded ? <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-stone-500">Workspace</div> : null}
          <nav className="flex flex-col gap-1.5">
            {primaryNav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                    isActive ? "bg-stone-950 text-white shadow-lg" : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                  }`
                }
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-base text-stone-800">
                  {item.icon}
                </span>
                {expanded ? <span>{item.label}</span> : null}
              </NavLink>
            ))}
          </nav>

          {expanded ? <div className="mt-6 px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-stone-500">Library</div> : null}
          <nav className="flex flex-col gap-1.5">
            {secondaryNav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                    isActive ? "bg-stone-950 text-white shadow-lg" : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                  }`
                }
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-base text-stone-800">
                  {item.icon}
                </span>
                {expanded ? <span>{item.label}</span> : null}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-4 rounded-[1.75rem] border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-rose-500 text-sm font-bold text-white">
                {user?.email?.slice(0, 1).toUpperCase() ?? "U"}
              </div>
              {expanded ? (
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-stone-900">{user?.email ?? "Workspace user"}</div>
                  <div className="truncate text-xs text-stone-500">
                    {mvpBypassActive ? "Local bypass workspace access" : "Supabase workspace access"}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 transition hover:-translate-y-0.5 hover:bg-stone-100"
              onClick={handleSignOut}
              type="button"
            >
              {expanded ? "Sign out" : "↗"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
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

          <div className="min-h-[calc(100vh-2rem)] rounded-[2rem] border border-white/60 bg-white/45 p-4 shadow-[0_20px_80px_rgba(28,25,23,0.06)] backdrop-blur md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
