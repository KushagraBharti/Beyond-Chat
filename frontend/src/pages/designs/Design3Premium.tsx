import { Link, useNavigate } from "react-router-dom";
import { STUDIOS, useDashboardData } from "./useDashboardData";

// Design 3 — Editorial Today (Notion / Height / Arc-inspired)
// Warm off-white canvas, serif display, content-first, sidebar + single scrolling column.

const css = `
.ed { min-height: 100vh; background: #F8F6F1; color: #1D1B17; font-family: 'Inter', system-ui, sans-serif; display: grid; grid-template-columns: 240px 1fr; }
.ed-side { padding: 24px 16px; border-right: 1px solid #EBE7DD; position: sticky; top: 0; height: 100vh; overflow-y: auto; background: #F4F1EA; }
.ed-ws { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 8px; margin-bottom: 20px; }
.ed-ws-ico { width: 28px; height: 28px; border-radius: 7px; background: #1D1B17; color: #F8F6F1; display: grid; place-items: center; font-size: 13px; font-weight: 700; font-family: 'Georgia', serif; }
.ed-ws-name { font-weight: 600; font-size: 14px; letter-spacing: -0.01em; }
.ed-ws-sub { font-size: 11px; color: #8C847A; }
.ed-section { font-size: 11px; font-weight: 600; color: #8C847A; text-transform: uppercase; letter-spacing: 0.06em; margin: 18px 10px 6px; }
.ed-navlink { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 7px; font-size: 14px; color: #4A443B; text-decoration: none; cursor: pointer; }
.ed-navlink:hover { background: #EBE7DD; }
.ed-navlink.active { background: #1D1B17; color: #F8F6F1; }
.ed-navlink .ic { width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.5; }

.ed-main { padding: 56px 72px 80px; max-width: 820px; }
.ed-date { font-size: 13px; color: #8C847A; letter-spacing: 0.02em; margin-bottom: 6px; }
.ed-h1 { font-family: 'Georgia', 'Times New Roman', serif; font-size: 44px; font-weight: 500; letter-spacing: -0.02em; margin: 0 0 10px; line-height: 1.1; }
.ed-intro { font-size: 16px; line-height: 1.6; color: #4A443B; margin: 0 0 32px; max-width: 560px; }
.ed-intro b { color: #1D1B17; font-weight: 600; }

.ed-cta { display: flex; gap: 10px; margin-bottom: 48px; }
.ed-btn { padding: 9px 16px; border-radius: 8px; border: 1px solid #1D1B17; background: #1D1B17; color: #F8F6F1; font-size: 14px; font-weight: 500; cursor: pointer; }
.ed-btn.g { background: transparent; color: #1D1B17; }

.ed-block { margin-bottom: 44px; }
.ed-block-h { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #EBE7DD; }
.ed-block-h h2 { margin: 0; font-family: 'Georgia', serif; font-size: 20px; font-weight: 500; letter-spacing: -0.01em; }
.ed-block-meta { font-size: 12px; color: #8C847A; }

.ed-item { display: grid; grid-template-columns: 64px 1fr auto; gap: 18px; padding: 14px 0; border-bottom: 1px solid #EFEBE0; align-items: baseline; }
.ed-item:last-child { border-bottom: 0; }
.ed-item-t { font-family: ui-monospace, monospace; font-size: 12px; color: #8C847A; font-variant-numeric: tabular-nums; }
.ed-item-title { font-size: 15px; font-weight: 500; line-height: 1.4; }
.ed-item-meta { font-size: 13px; color: #8C847A; margin-top: 3px; }
.ed-item-tag { font-size: 11px; color: #8C847A; padding: 2px 8px; border: 1px solid #EBE7DD; border-radius: 999px; }

.ed-check { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #EFEBE0; align-items: flex-start; }
.ed-check:last-child { border-bottom: 0; }
.ed-box { width: 16px; height: 16px; border: 1.5px solid #B7AE9E; border-radius: 4px; margin-top: 2px; flex-shrink: 0; cursor: pointer; }
.ed-box:hover { border-color: #1D1B17; }
.ed-check-title { font-size: 15px; font-weight: 500; }
.ed-check-meta { font-size: 13px; color: #8C847A; margin-top: 2px; }

.ed-int { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ed-intcard { background: #fff; border: 1px solid #EBE7DD; border-radius: 10px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; }
.ed-intcard-n { font-size: 14px; font-weight: 600; }
.ed-intcard-d { font-size: 12px; color: #8C847A; margin-top: 2px; }
.ed-intcard-s { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #4A443B; }
.ed-intcard-s .dot { width: 6px; height: 6px; border-radius: 50%; }
.ed-intcard-s .dot.on { background: #3F8F5D; }
.ed-intcard-s .dot.off { background: #B4544A; }
.ed-intcard-s .dot.na { background: #C4BBA7; }

.ed-studios { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0; border-top: 1px solid #EBE7DD; }
.ed-studio { padding: 18px 4px; border-bottom: 1px solid #EBE7DD; text-decoration: none; color: inherit; display: flex; justify-content: space-between; align-items: center; transition: padding 0.15s; }
.ed-studio:hover { padding-left: 10px; }
.ed-studio:nth-child(odd) { padding-right: 20px; border-right: 1px solid #EBE7DD; }
.ed-studio:nth-child(even) { padding-left: 20px; }
.ed-studio-n { font-family: 'Georgia', serif; font-size: 17px; font-weight: 500; }
.ed-studio-b { font-size: 12px; color: #8C847A; margin-top: 2px; }
.ed-studio-ar { color: #8C847A; font-size: 18px; }

.ed-empty { padding: 24px 0; color: #8C847A; font-size: 14px; font-style: italic; }

@media (max-width: 860px) { .ed { grid-template-columns: 1fr; } .ed-side { display: none; } .ed-main { padding: 32px 24px 60px; } .ed-int, .ed-studios { grid-template-columns: 1fr; } }
`;

export default function Design3Premium() {
  const navigate = useNavigate();
  const { workspaceName, reminders, calendarEvents, providers } = useDashboardData();
  const providerList = Object.entries(providers);
  const live = providerList.filter(([, p]) => p.status === "connected").length;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="ed">
      <style>{css}</style>
      <aside className="ed-side">
        <div className="ed-ws">
          <div className="ed-ws-ico">{workspaceName.slice(0, 1)}</div>
          <div>
            <div className="ed-ws-name">{workspaceName}</div>
            <div className="ed-ws-sub">Personal workspace</div>
          </div>
        </div>

        <div className="ed-section">Workspace</div>
        <a className="ed-navlink active"><span className="ic" /> Today</a>
        <a className="ed-navlink" onClick={() => navigate("/chat")}><span className="ic" /> Inbox</a>
        <a className="ed-navlink" onClick={() => navigate("/artifacts")}><span className="ic" /> Artifacts</a>

        <div className="ed-section">Studios</div>
        {STUDIOS.slice(0, 6).map((s) => (
          <a key={s.key} className="ed-navlink" onClick={() => navigate(s.path)}><span className="ic" /> {s.label}</a>
        ))}

        <div className="ed-section">Account</div>
        <a className="ed-navlink" onClick={() => navigate("/settings")}><span className="ic" /> Settings</a>
        <a className="ed-navlink" onClick={() => navigate("/dashboard")}><span className="ic" /> Exit preview</a>
      </aside>

      <main className="ed-main">
        <div className="ed-date">{today}</div>
        <h1 className="ed-h1">Today</h1>
        <p className="ed-intro">
          You have <b>{calendarEvents.length} event{calendarEvents.length === 1 ? "" : "s"}</b> scheduled and <b>{reminders.length} open reminder{reminders.length === 1 ? "" : "s"}</b>.
          {" "}{live} of {providerList.length || 0} integrations are live.
        </p>

        <div className="ed-cta">
          <button className="ed-btn" onClick={() => navigate("/chat")}>Start a new chat</button>
          <button className="ed-btn g" onClick={() => navigate("/writing")}>Open writing</button>
        </div>

        <section className="ed-block">
          <div className="ed-block-h"><h2>Agenda</h2><span className="ed-block-meta">Google Calendar</span></div>
          {calendarEvents.length ? calendarEvents.map((e) => (
            <div key={e.id} className="ed-item">
              <div className="ed-item-t">{new Date(e.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              <div>
                <div className="ed-item-title">{e.title}</div>
                <div className="ed-item-meta">{e.location || "No location"}</div>
              </div>
              <span className="ed-item-tag">Event</span>
            </div>
          )) : <div className="ed-empty">Nothing on the calendar today.</div>}
        </section>

        <section className="ed-block">
          <div className="ed-block-h"><h2>Reminders</h2><span className="ed-block-meta">{reminders.length} open</span></div>
          {reminders.length ? reminders.map((r) => (
            <div key={r.id} className="ed-check">
              <div className="ed-box" />
              <div style={{ flex: 1 }}>
                <div className="ed-check-title">{r.title}</div>
                <div className="ed-check-meta">{r.note} · Due {new Date(r.due_at).toLocaleString()}</div>
              </div>
            </div>
          )) : <div className="ed-empty">You're caught up. Nothing pending.</div>}
        </section>

        <section className="ed-block">
          <div className="ed-block-h"><h2>Integrations</h2><span className="ed-block-meta">{live} live</span></div>
          {providerList.length ? (
            <div className="ed-int">
              {providerList.map(([key, p]) => (
                <div key={key} className="ed-intcard">
                  <div>
                    <div className="ed-intcard-n">{p.label}</div>
                    <div className="ed-intcard-d">{p.details}</div>
                  </div>
                  <span className="ed-intcard-s">
                    <span className={`dot ${p.status === "connected" ? "on" : p.status === "disconnected" ? "off" : "na"}`} />
                    {p.status === "connected" ? "Live" : p.status === "disconnected" ? "Error" : "Off"}
                  </span>
                </div>
              ))}
            </div>
          ) : <div className="ed-empty">No integrations yet.</div>}
        </section>

        <section className="ed-block">
          <div className="ed-block-h"><h2>Studios</h2><span className="ed-block-meta">{STUDIOS.length} available</span></div>
          <div className="ed-studios">
            {STUDIOS.map((s) => (
              <Link key={s.key} to={s.path} className="ed-studio">
                <div>
                  <div className="ed-studio-n">{s.label}</div>
                  <div className="ed-studio-b">{s.blurb}</div>
                </div>
                <span className="ed-studio-ar">→</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
