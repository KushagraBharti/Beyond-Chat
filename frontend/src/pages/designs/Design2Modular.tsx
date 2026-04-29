import { Link, useNavigate } from "react-router-dom";
import { STUDIOS, useDashboardData } from "./useDashboardData";

// Design 2 — Metrics Surface (Stripe-inspired)
// White canvas, soft shadows, rounded cards, single indigo accent, data-forward.

const css = `
.mx { min-height: 100vh; background: #F6F8FB; color: #1A1F36; font-family: -apple-system, 'Inter', system-ui, sans-serif; }
.mx-top { background: #fff; border-bottom: 1px solid #E6E9EF; padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; }
.mx-brand { display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 15px; }
.mx-logo { width: 28px; height: 28px; background: linear-gradient(135deg, #635BFF 0%, #4338CA 100%); border-radius: 7px; }
.mx-nav { display: flex; gap: 28px; }
.mx-nav a { color: #697386; font-size: 14px; font-weight: 500; text-decoration: none; padding: 6px 0; border-bottom: 2px solid transparent; }
.mx-nav a.active { color: #1A1F36; border-bottom-color: #635BFF; }
.mx-user { display: flex; align-items: center; gap: 12px; }
.mx-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #635BFF, #9333EA); color: #fff; display: grid; place-items: center; font-weight: 600; font-size: 13px; }

.mx-wrap { max-width: 1200px; margin: 0 auto; padding: 32px; }
.mx-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px; }
.mx-h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em; }
.mx-sub { color: #697386; font-size: 14px; margin: 0; }
.mx-cta { display: flex; gap: 8px; }
.mx-btn { padding: 8px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; border: 1px solid transparent; }
.mx-btn-p { background: #635BFF; color: #fff; }
.mx-btn-p:hover { background: #5147d9; }
.mx-btn-s { background: #fff; color: #1A1F36; border-color: #E6E9EF; }

.mx-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.mx-kpi { background: #fff; border: 1px solid #E6E9EF; border-radius: 10px; padding: 18px 20px; box-shadow: 0 1px 2px rgba(26,31,54,0.04); }
.mx-kpi-label { color: #697386; font-size: 12px; font-weight: 500; margin-bottom: 8px; }
.mx-kpi-val { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
.mx-kpi-sub { font-size: 12px; color: #697386; margin-top: 4px; }
.mx-kpi-up { color: #0E6245; font-weight: 500; }

.mx-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px; }
.mx-card { background: #fff; border: 1px solid #E6E9EF; border-radius: 10px; box-shadow: 0 1px 2px rgba(26,31,54,0.04); overflow: hidden; }
.mx-card-h { padding: 16px 20px; border-bottom: 1px solid #E6E9EF; display: flex; justify-content: space-between; align-items: center; }
.mx-card-h h3 { margin: 0; font-size: 15px; font-weight: 600; }
.mx-card-h a { font-size: 13px; color: #635BFF; text-decoration: none; font-weight: 500; }

.mx-chart { padding: 20px; height: 140px; background: linear-gradient(180deg, rgba(99,91,255,0.06) 0%, rgba(99,91,255,0) 100%); position: relative; }
.mx-chart svg { width: 100%; height: 100%; }

.mx-table { width: 100%; border-collapse: collapse; }
.mx-table th { text-align: left; padding: 10px 20px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #697386; font-weight: 600; background: #FAFBFC; border-bottom: 1px solid #E6E9EF; }
.mx-table td { padding: 14px 20px; border-bottom: 1px solid #F3F4F6; font-size: 14px; }
.mx-table tr:last-child td { border-bottom: 0; }
.mx-pill { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
.mx-pill.on { background: #E8F7EE; color: #0E6245; }
.mx-pill.off { background: #FDEEEE; color: #B52F26; }
.mx-pill.na { background: #F3F4F6; color: #697386; }
.mx-pill .d { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

.mx-list { padding: 8px; }
.mx-list-row { padding: 12px 14px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
.mx-list-row:hover { background: #FAFBFC; }
.mx-list-name { font-size: 14px; font-weight: 500; }
.mx-list-meta { font-size: 12px; color: #697386; margin-top: 2px; }

.mx-studios { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.mx-studio { background: #fff; border: 1px solid #E6E9EF; border-radius: 10px; padding: 16px; text-decoration: none; color: inherit; transition: all 0.15s; box-shadow: 0 1px 2px rgba(26,31,54,0.04); }
.mx-studio:hover { border-color: #635BFF; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,91,255,0.12); }
.mx-studio-ico { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #EEF0FE, #E0E7FF); margin-bottom: 10px; display: grid; place-items: center; font-size: 14px; font-weight: 700; color: #635BFF; }
.mx-studio-n { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.mx-studio-b { font-size: 12px; color: #697386; line-height: 1.4; }
.mx-empty { padding: 36px; text-align: center; color: #697386; font-size: 13px; }

@media (max-width: 960px) { .mx-kpis, .mx-studios { grid-template-columns: repeat(2, 1fr); } .mx-grid { grid-template-columns: 1fr; } }
`;

export default function Design2Modular() {
  const navigate = useNavigate();
  const { workspaceName, reminders, calendarEvents, providers } = useDashboardData();
  const providerList = Object.entries(providers);
  const live = providerList.filter(([, p]) => p.status === "connected").length;
  const initials = workspaceName.slice(0, 2).toUpperCase();

  return (
    <div className="mx">
      <style>{css}</style>
      <header className="mx-top">
        <div className="mx-brand"><span className="mx-logo" /> Beyond Chat</div>
        <nav className="mx-nav">
          <a className="active" href="#">Overview</a>
          <a href="#">Activity</a>
          <a href="#">Integrations</a>
          <a href="#">Settings</a>
        </nav>
        <div className="mx-user">
          <button className="mx-btn mx-btn-s" onClick={() => navigate("/dashboard")}>Exit preview</button>
          <div className="mx-avatar">{initials}</div>
        </div>
      </header>

      <div className="mx-wrap">
        <div className="mx-head">
          <div>
            <h1 className="mx-h1">{workspaceName}</h1>
            <p className="mx-sub">Overview · Last 30 days</p>
          </div>
          <div className="mx-cta">
            <button className="mx-btn mx-btn-s" onClick={() => navigate("/settings")}>Manage</button>
            <button className="mx-btn mx-btn-p" onClick={() => navigate("/chat")}>+ New chat</button>
          </div>
        </div>

        <div className="mx-kpis">
          <div className="mx-kpi"><div className="mx-kpi-label">Open reminders</div><div className="mx-kpi-val">{reminders.length}</div><div className="mx-kpi-sub">Internal queue</div></div>
          <div className="mx-kpi"><div className="mx-kpi-label">Events today</div><div className="mx-kpi-val">{calendarEvents.length}</div><div className="mx-kpi-sub">From calendar</div></div>
          <div className="mx-kpi"><div className="mx-kpi-label">Active integrations</div><div className="mx-kpi-val">{live}<span style={{ fontSize: 14, color: "#697386", fontWeight: 400 }}> / {providerList.length || 0}</span></div><div className="mx-kpi-sub mx-kpi-up">● Healthy</div></div>
          <div className="mx-kpi"><div className="mx-kpi-label">Studios available</div><div className="mx-kpi-val">{STUDIOS.length}</div><div className="mx-kpi-sub">Across workspace</div></div>
        </div>

        <div className="mx-grid">
          <div className="mx-card">
            <div className="mx-card-h"><h3>Today's schedule</h3><a href="#">View calendar →</a></div>
            {calendarEvents.length ? (
              <table className="mx-table">
                <thead><tr><th>Time</th><th>Event</th><th>Location</th><th></th></tr></thead>
                <tbody>
                  {calendarEvents.map((e) => (
                    <tr key={e.id}>
                      <td style={{ color: "#697386", fontVariantNumeric: "tabular-nums" }}>{new Date(e.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                      <td style={{ fontWeight: 500 }}>{e.title}</td>
                      <td style={{ color: "#697386" }}>{e.location || "—"}</td>
                      <td><span className="mx-pill on"><span className="d" /> Confirmed</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="mx-empty">No events on today's calendar.</div>}
            <div className="mx-chart">
              <svg viewBox="0 0 400 100" preserveAspectRatio="none">
                <path d="M0,70 C50,60 80,40 120,45 C160,50 200,25 240,30 C280,35 320,55 400,40" fill="none" stroke="#635BFF" strokeWidth="2" />
                <path d="M0,70 C50,60 80,40 120,45 C160,50 200,25 240,30 C280,35 320,55 400,40 L400,100 L0,100 Z" fill="url(#g)" />
                <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#635BFF" stopOpacity="0.2" /><stop offset="100%" stopColor="#635BFF" stopOpacity="0" /></linearGradient></defs>
              </svg>
            </div>
          </div>

          <div className="mx-card">
            <div className="mx-card-h"><h3>Integrations</h3><a href="#">All →</a></div>
            <div className="mx-list">
              {providerList.length ? providerList.map(([key, p]) => (
                <div key={key} className="mx-list-row">
                  <div>
                    <div className="mx-list-name">{p.label}</div>
                    <div className="mx-list-meta">{p.details}</div>
                  </div>
                  <span className={`mx-pill ${p.status === "connected" ? "on" : p.status === "disconnected" ? "off" : "na"}`}><span className="d" /> {p.status === "connected" ? "Live" : p.status === "disconnected" ? "Error" : "Off"}</span>
                </div>
              )) : <div className="mx-empty">Connect your first integration.</div>}
            </div>
          </div>
        </div>

        <div className="mx-card" style={{ marginBottom: 24 }}>
          <div className="mx-card-h"><h3>Reminders</h3><a href="#">Manage →</a></div>
          <div className="mx-list">
            {reminders.length ? reminders.map((r) => (
              <div key={r.id} className="mx-list-row">
                <div>
                  <div className="mx-list-name">{r.title}</div>
                  <div className="mx-list-meta">{r.note} · Due {new Date(r.due_at).toLocaleString()}</div>
                </div>
                <span className="mx-pill na">{r.source}</span>
              </div>
            )) : <div className="mx-empty">You're all caught up.</div>}
          </div>
        </div>

        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "#1A1F36" }}>Quick access</h2>
        <div className="mx-studios">
          {STUDIOS.map((s) => (
            <Link key={s.key} to={s.path} className="mx-studio">
              <div className="mx-studio-ico">{s.label[0]}</div>
              <div className="mx-studio-n">{s.label}</div>
              <div className="mx-studio-b">{s.blurb}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
