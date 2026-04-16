import { Link, useNavigate } from "react-router-dom";
import { STUDIOS, useDashboardData } from "./useDashboardData";

// Design 1 — Operator Console (Linear/Vercel-inspired)
// Dense monochrome surface, keyboard-first feel, 1px borders, mono accents.

const css = `
.op { min-height: 100vh; background: #FAFAFA; color: #0A0A0A; font-family: 'Inter', system-ui, sans-serif; }
.op-top { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid #EAEAEA; background: #fff; position: sticky; top: 0; z-index: 2; }
.op-brand { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 13px; letter-spacing: -0.01em; }
.op-dot { width: 8px; height: 8px; background: #0A0A0A; border-radius: 2px; }
.op-crumbs { color: #8A8A8A; font-size: 12px; font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
.op-crumbs b { color: #0A0A0A; font-weight: 500; }
.op-actions { display: flex; gap: 8px; align-items: center; }
.op-kbd { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border: 1px solid #EAEAEA; border-radius: 6px; background: #fff; font-size: 12px; color: #525252; }
.op-kbd kbd { font-family: ui-monospace, monospace; font-size: 11px; background: #F4F4F4; padding: 1px 5px; border-radius: 3px; border: 1px solid #EAEAEA; }
.op-btn { padding: 6px 12px; border: 1px solid #0A0A0A; background: #0A0A0A; color: #fff; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; }
.op-btn.ghost { background: #fff; color: #0A0A0A; border-color: #EAEAEA; }

.op-head { padding: 40px 24px 24px; max-width: 1180px; margin: 0 auto; }
.op-eyebrow { font-family: ui-monospace, monospace; font-size: 11px; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
.op-h1 { font-size: 28px; letter-spacing: -0.02em; font-weight: 600; margin: 0 0 6px; }
.op-sub { color: #525252; font-size: 14px; margin: 0; }

.op-stats { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #EAEAEA; border-radius: 10px; background: #fff; max-width: 1180px; margin: 24px auto 0; overflow: hidden; }
.op-stat { padding: 16px 18px; border-right: 1px solid #EAEAEA; }
.op-stat:last-child { border-right: 0; }
.op-stat-label { font-family: ui-monospace, monospace; font-size: 10px; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
.op-stat-val { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
.op-stat-delta { font-size: 11px; color: #16A34A; margin-left: 6px; font-weight: 500; }

.op-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; max-width: 1180px; margin: 16px auto 40px; padding: 0 24px; }
.op-card { border: 1px solid #EAEAEA; border-radius: 10px; background: #fff; overflow: hidden; }
.op-card-h { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #EAEAEA; }
.op-card-h h3 { margin: 0; font-size: 13px; font-weight: 600; letter-spacing: -0.01em; }
.op-card-h span { font-family: ui-monospace, monospace; font-size: 11px; color: #8A8A8A; }
.op-row { display: grid; grid-template-columns: 80px 1fr auto; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #F4F4F4; align-items: center; }
.op-row:last-child { border-bottom: 0; }
.op-row-time { font-family: ui-monospace, monospace; font-size: 12px; color: #525252; }
.op-row-title { font-size: 13px; font-weight: 500; }
.op-row-meta { font-size: 12px; color: #8A8A8A; margin-top: 2px; }
.op-row-tag { font-family: ui-monospace, monospace; font-size: 10px; color: #525252; background: #F4F4F4; padding: 3px 7px; border-radius: 4px; }

.op-empty { padding: 40px 16px; text-align: center; color: #8A8A8A; font-size: 13px; }

.op-int { padding: 8px; }
.op-int-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 6px; }
.op-int-row:hover { background: #FAFAFA; }
.op-int-name { font-size: 13px; font-weight: 500; }
.op-int-det { font-size: 11px; color: #8A8A8A; margin-top: 1px; }
.op-int-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-family: ui-monospace, monospace; color: #525252; text-transform: lowercase; }
.op-int-dot { width: 6px; height: 6px; border-radius: 50%; }
.op-int-dot.on { background: #16A34A; }
.op-int-dot.off { background: #DC2626; }
.op-int-dot.na { background: #D4D4D4; }

.op-studios-wrap { max-width: 1180px; margin: 0 auto 40px; padding: 0 24px; }
.op-studios-inner { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #EAEAEA; border-radius: 10px; background: #fff; overflow: hidden; }
.op-studio { padding: 16px; border-right: 1px solid #EAEAEA; border-bottom: 1px solid #EAEAEA; text-decoration: none; color: inherit; transition: background 0.12s; }
.op-studio:hover { background: #FAFAFA; }
.op-studio:nth-child(4n) { border-right: 0; }
.op-studio:nth-last-child(-n+4) { border-bottom: 0; }
.op-studio-k { font-family: ui-monospace, monospace; font-size: 10px; color: #8A8A8A; text-transform: uppercase; }
.op-studio-n { font-size: 14px; font-weight: 600; margin: 6px 0 4px; letter-spacing: -0.01em; }
.op-studio-b { font-size: 12px; color: #525252; line-height: 1.5; }

@media (max-width: 860px) { .op-stats, .op-grid, .op-studios-inner { grid-template-columns: 1fr; } .op-stat, .op-studio { border-right: 0; } }
`;

export default function Design1Executive() {
  const navigate = useNavigate();
  const { workspaceName, reminders, calendarEvents, providers } = useDashboardData();
  const providerList = Object.values(providers);
  const live = providerList.filter((p) => p.status === "connected").length;

  return (
    <div className="op">
      <style>{css}</style>
      <header className="op-top">
        <div className="op-brand"><span className="op-dot" /> Beyond Chat</div>
        <div className="op-crumbs">workspace / <b>{workspaceName.toLowerCase().replace(/\s+/g, "-")}</b> / overview</div>
        <div className="op-actions">
          <span className="op-kbd"><kbd>⌘</kbd><kbd>K</kbd></span>
          <button className="op-btn ghost" onClick={() => navigate("/dashboard")}>Exit preview</button>
          <button className="op-btn" onClick={() => navigate("/chat")}>New chat</button>
        </div>
      </header>

      <div className="op-head">
        <div className="op-eyebrow">Overview · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</div>
        <h1 className="op-h1">Good morning, {workspaceName}.</h1>
        <p className="op-sub">{reminders.length} open reminder{reminders.length === 1 ? "" : "s"} · {calendarEvents.length} event{calendarEvents.length === 1 ? "" : "s"} today · {live}/{providerList.length || 0} integrations live</p>
      </div>

      <div className="op-stats" style={{ padding: "0 24px", maxWidth: 1180, margin: "24px auto 0", border: "none", background: "transparent" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: "1px solid #EAEAEA", borderRadius: 10, background: "#fff", overflow: "hidden" }}>
          <div className="op-stat"><div className="op-stat-label">Reminders</div><div className="op-stat-val">{reminders.length}<span className="op-stat-delta">open</span></div></div>
          <div className="op-stat"><div className="op-stat-label">Events today</div><div className="op-stat-val">{calendarEvents.length}</div></div>
          <div className="op-stat"><div className="op-stat-label">Integrations</div><div className="op-stat-val">{live}/{providerList.length || 0}</div></div>
          <div className="op-stat"><div className="op-stat-label">Studios</div><div className="op-stat-val">{STUDIOS.length}</div></div>
        </div>
      </div>

      <div className="op-grid">
        <div className="op-card">
          <div className="op-card-h"><h3>Today's agenda</h3><span>GOOGLE CALENDAR</span></div>
          {calendarEvents.length ? calendarEvents.map((e) => (
            <div key={e.id} className="op-row">
              <div className="op-row-time">{new Date(e.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              <div><div className="op-row-title">{e.title}</div><div className="op-row-meta">{e.location || "—"}</div></div>
              <span className="op-row-tag">EVENT</span>
            </div>
          )) : <div className="op-empty">Calendar not connected. Agenda will appear here when linked.</div>}
        </div>

        <div className="op-card">
          <div className="op-card-h"><h3>Integrations</h3><span>{live} LIVE</span></div>
          <div className="op-int">
            {providerList.length ? providerList.map((p) => (
              <div key={p.label} className="op-int-row">
                <div>
                  <div className="op-int-name">{p.label}</div>
                  <div className="op-int-det">{p.details}</div>
                </div>
                <span className="op-int-status">
                  <span className={`op-int-dot ${p.status === "connected" ? "on" : p.status === "disconnected" ? "off" : "na"}`} />
                  {p.status.replace("_", " ")}
                </span>
              </div>
            )) : <div className="op-empty">No integrations configured.</div>}
          </div>
        </div>
      </div>

      <div className="op-studios-wrap">
        <div className="op-studios-inner">
          {STUDIOS.map((s) => (
            <Link key={s.key} to={s.path} className="op-studio">
              <div className="op-studio-k">{s.key.toUpperCase()}</div>
              <div className="op-studio-n">{s.label}</div>
              <div className="op-studio-b">{s.blurb}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
