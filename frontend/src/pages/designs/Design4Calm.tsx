import { Link, useNavigate } from "react-router-dom";
import { STUDIOS, useDashboardData } from "./useDashboardData";

const css = `
.calm-base {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(79, 63, 232, 0.12), transparent 28%),
    radial-gradient(circle at bottom right, rgba(229, 86, 19, 0.1), transparent 30%),
    #f3f2ef;
  color: #121212;
  font-family: "Plus Jakarta Sans", "Inter", system-ui, sans-serif;
}

.calm-base-shell {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  min-height: 100vh;
}

.calm-base-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 22px 18px;
  border-right: 1px solid rgba(18, 18, 18, 0.08);
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(18px);
}

.calm-base-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  margin-bottom: 28px;
}

.calm-base-brand-mark {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: linear-gradient(135deg, #4f3fe8, #e55613);
}

.calm-base-brand-mark::before {
  content: "";
  position: absolute;
  inset: 2px;
  border-radius: 5px;
  background: #ffffff;
}

.calm-base-brand-mark::after {
  content: "";
  position: absolute;
  inset: 7px;
  border-radius: 2px;
  background: #121212;
}

.calm-base-brand-copy strong {
  display: block;
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.calm-base-brand-copy span {
  display: block;
  margin-top: 2px;
  font-size: 0.76rem;
  color: #6b6b70;
}

.calm-base-section-label {
  margin: 0 0 10px 8px;
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 800;
  color: #6b6b70;
}

.calm-base-nav {
  display: grid;
  gap: 6px;
}

.calm-base-navlink {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  text-decoration: none;
  color: #2a2a2d;
  transition: background 140ms ease, transform 140ms ease;
}

.calm-base-navlink:hover {
  background: rgba(255, 255, 255, 0.75);
  transform: translateX(1px);
}

.calm-base-navlink.is-active {
  background: #121212;
  color: #ffffff;
  box-shadow: 0 18px 34px rgba(18, 18, 18, 0.12);
}

.calm-base-navmeta {
  font-size: 0.74rem;
  color: inherit;
  opacity: 0.72;
}

.calm-base-sidebar-footer {
  margin-top: 24px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(18, 18, 18, 0.06);
}

.calm-base-sidebar-footer strong {
  display: block;
  font-size: 0.88rem;
  margin-bottom: 6px;
}

.calm-base-sidebar-footer p {
  font-size: 0.8rem;
  line-height: 1.6;
  color: #6b6b70;
}

.calm-base-sidebar-footer a {
  display: inline-flex;
  margin-top: 12px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #4f3fe8;
  text-decoration: none;
}

.calm-base-main {
  padding: 30px 34px 40px;
}

.calm-base-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.calm-base-topbar-meta {
  display: grid;
  gap: 6px;
}

.calm-base-topbar-meta span {
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #6b6b70;
}

.calm-base-topbar-meta h1 {
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 0.97;
  letter-spacing: -0.05em;
}

.calm-base-topbar-meta p {
  max-width: 42rem;
  color: #6b6b70;
  line-height: 1.7;
}

.calm-base-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.calm-base-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 16px;
  border-radius: 999px;
  border: 1px solid rgba(18, 18, 18, 0.08);
  background: rgba(255, 255, 255, 0.72);
  color: #121212;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
}

.calm-base-btn.primary {
  background: #121212;
  color: #ffffff;
}

.calm-base-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.85fr);
  gap: 16px;
  margin-bottom: 16px;
}

.calm-base-card {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(18, 18, 18, 0.06);
  box-shadow: 0 20px 40px rgba(18, 18, 18, 0.05);
}

.calm-base-card-body {
  padding: 20px;
}

.calm-base-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.calm-base-card-head h2 {
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.calm-base-card-head p {
  margin-top: 6px;
  color: #6b6b70;
  line-height: 1.65;
}

.calm-base-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.42rem 0.72rem;
  border-radius: 999px;
  background: rgba(79, 63, 232, 0.08);
  color: #4f3fe8;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.calm-base-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.calm-base-stat {
  padding: 16px;
  border-radius: 18px;
  background: #f7f6f3;
  border: 1px solid rgba(18, 18, 18, 0.05);
}

.calm-base-stat span {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b6b70;
}

.calm-base-stat strong {
  display: block;
  margin-top: 10px;
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: 2rem;
  letter-spacing: -0.04em;
}

.calm-base-stat p {
  margin-top: 6px;
  color: #6b6b70;
  line-height: 1.6;
}

.calm-base-list {
  display: grid;
  gap: 10px;
}

.calm-base-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  background: #f7f6f3;
  border: 1px solid rgba(18, 18, 18, 0.05);
}

.calm-base-row strong {
  display: block;
  font-size: 0.94rem;
}

.calm-base-row p,
.calm-base-row span {
  color: #6b6b70;
  font-size: 0.82rem;
  line-height: 1.55;
}

.calm-base-studio-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.calm-base-studio {
  display: block;
  padding: 16px;
  border-radius: 18px;
  background: #f7f6f3;
  border: 1px solid rgba(18, 18, 18, 0.05);
  text-decoration: none;
  color: inherit;
  transition: transform 140ms ease, border-color 140ms ease;
}

.calm-base-studio:hover {
  transform: translateY(-1px);
  border-color: rgba(79, 63, 232, 0.22);
}

.calm-base-studio strong {
  display: block;
  margin-bottom: 6px;
  font-size: 0.92rem;
}

.calm-base-studio p {
  font-size: 0.8rem;
  color: #6b6b70;
  line-height: 1.6;
}

.calm-base-right-stack {
  display: grid;
  gap: 16px;
}

.calm-base-status-list {
  display: grid;
  gap: 10px;
}

.calm-base-status-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #f7f6f3;
  border: 1px solid rgba(18, 18, 18, 0.05);
}

.calm-base-status-copy strong {
  display: block;
  font-size: 0.88rem;
}

.calm-base-status-copy span {
  display: block;
  margin-top: 2px;
  font-size: 0.78rem;
  color: #6b6b70;
}

.calm-base-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  color: #121212;
}

.calm-base-status-pill::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
}

.calm-base-status-pill.connected { color: #30a46c; }
.calm-base-status-pill.disconnected { color: #e5484d; }
.calm-base-status-pill.not_configured { color: #b0b0b5; }

.calm-base-note {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(79, 63, 232, 0.08), rgba(229, 86, 19, 0.06));
  border: 1px solid rgba(79, 63, 232, 0.1);
}

.calm-base-note strong {
  display: block;
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.calm-base-note p {
  margin-top: 8px;
  color: #5f5f66;
  line-height: 1.7;
  font-size: 0.88rem;
}

@media (max-width: 1080px) {
  .calm-base-shell {
    grid-template-columns: 1fr;
  }

  .calm-base-sidebar {
    position: static;
    height: auto;
  }

  .calm-base-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .calm-base-main {
    padding: 22px 16px 28px;
  }

  .calm-base-topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .calm-base-overview,
  .calm-base-studio-grid {
    grid-template-columns: 1fr;
  }
}
`;

export default function Design4Calm() {
  const navigate = useNavigate();
  const { workspaceName, reminders, calendarEvents, providers } = useDashboardData();
  const providerList = Object.values(providers);
  const liveProviders = providerList.filter((provider) => provider.status === "connected").length;
  const firstName = workspaceName.split(" ")[0] || "Beyond";

  return (
    <div className="calm-base">
      <style>{css}</style>

      <div className="calm-base-shell">
        <aside className="calm-base-sidebar">
          <Link to="/dashboard" className="calm-base-brand">
            <span className="calm-base-brand-mark" />
            <span className="calm-base-brand-copy">
              <strong>Beyond Chat</strong>
              <span>Preview · Minimal Base</span>
            </span>
          </Link>

          <div className="calm-base-section-label">Studios</div>
          <nav className="calm-base-nav">
            {STUDIOS.map((studio) => (
              <Link
                key={studio.key}
                to={studio.path}
                className={`calm-base-navlink ${studio.key === "chat" ? "is-active" : ""}`}
              >
                <span>{studio.label}</span>
                <span className="calm-base-navmeta">Open</span>
              </Link>
            ))}
          </nav>

          <div className="calm-base-sidebar-footer">
            <strong>Design 4</strong>
            <p>
              Minimal base UI for the dashboard. Quiet overview, simple sidebar, no extra motion, and enough structure for iterative refinement.
            </p>
            <Link to="/dashboard">Exit preview</Link>
          </div>
        </aside>

        <main className="calm-base-main">
          <div className="calm-base-topbar">
            <div className="calm-base-topbar-meta">
              <span>Workspace Overview</span>
              <h1>Good morning, {firstName}.</h1>
              <p>A calm overview for the day with studios on the left and only the most useful signals visible up front.</p>
            </div>

            <div className="calm-base-actions">
              <button className="calm-base-btn" type="button" onClick={() => navigate("/settings")}>
                Manage workspace
              </button>
              <button className="calm-base-btn primary" type="button" onClick={() => navigate("/chat")}>
                Open chat
              </button>
            </div>
          </div>

          <div className="calm-base-grid">
            <section className="calm-base-card">
              <div className="calm-base-card-body">
                <div className="calm-base-card-head">
                  <div>
                    <h2>Today at a glance</h2>
                    <p>A simple summary that helps the workspace feel useful immediately without turning into a dashboard of noise.</p>
                  </div>
                  <span className="calm-base-pill">Overview</span>
                </div>

                <div className="calm-base-overview">
                  <div className="calm-base-stat">
                    <span>Reminders</span>
                    <strong>{reminders.length}</strong>
                    <p>Open items saved inside the workspace.</p>
                  </div>
                  <div className="calm-base-stat">
                    <span>Agenda</span>
                    <strong>{calendarEvents.length}</strong>
                    <p>Events visible from the calendar preview.</p>
                  </div>
                  <div className="calm-base-stat">
                    <span>Providers</span>
                    <strong>{liveProviders}</strong>
                    <p>Connected integrations currently reporting healthy status.</p>
                  </div>
                </div>
              </div>
            </section>

            <aside className="calm-base-right-stack">
              <section className="calm-base-card">
                <div className="calm-base-card-body">
                  <div className="calm-base-card-head">
                    <div>
                      <h2>System health</h2>
                      <p>Provider status stays visible but quiet.</p>
                    </div>
                  </div>

                  <div className="calm-base-status-list">
                    {providerList.length ? (
                      providerList.slice(0, 4).map((provider) => (
                        <div key={provider.label} className="calm-base-status-item">
                          <div className="calm-base-status-copy">
                            <strong>{provider.label}</strong>
                            <span>{provider.details}</span>
                          </div>
                          <span className={`calm-base-status-pill ${provider.status}`}>{provider.status.replaceAll("_", " ")}</span>
                        </div>
                      ))
                    ) : (
                      <div className="calm-base-row">
                        <div>
                          <strong>No providers configured</strong>
                          <p>Connect providers to populate this panel.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="calm-base-note">
                <strong>Base direction</strong>
                <p>Sidebar for navigation. Calm summary first. Agenda and reminders as the main work surfaces. Everything else should earn its place.</p>
              </section>
            </aside>
          </div>

          <div className="calm-base-grid">
            <section className="calm-base-card">
              <div className="calm-base-card-body">
                <div className="calm-base-card-head">
                  <div>
                    <h2>Agenda</h2>
                    <p>Upcoming events with enough detail to act, nothing more.</p>
                  </div>
                  <span className="calm-base-pill">Calendar</span>
                </div>

                <div className="calm-base-list">
                  {calendarEvents.length ? (
                    calendarEvents.map((event) => (
                      <div key={event.id} className="calm-base-row">
                        <div>
                          <strong>{event.title}</strong>
                          <p>{event.location || "No location"}</p>
                        </div>
                        <span>{new Date(event.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    ))
                  ) : (
                    <div className="calm-base-row">
                      <div>
                        <strong>No events scheduled</strong>
                        <p>Connect Google Calendar or leave this card in an empty state until then.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="calm-base-card">
              <div className="calm-base-card-body">
                <div className="calm-base-card-head">
                  <div>
                    <h2>Reminders</h2>
                    <p>Internal reminders keep the dashboard useful even without other integrations.</p>
                  </div>
                  <span className="calm-base-pill">Tasks</span>
                </div>

                <div className="calm-base-list">
                  {reminders.length ? (
                    reminders.map((reminder) => (
                      <div key={reminder.id} className="calm-base-row">
                        <div>
                          <strong>{reminder.title}</strong>
                          <p>{reminder.note}</p>
                        </div>
                        <span>{new Date(reminder.due_at).toLocaleDateString()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="calm-base-row">
                      <div>
                        <strong>No reminders yet</strong>
                        <p>This card should still feel intentional even when the workspace is empty.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <section className="calm-base-card">
            <div className="calm-base-card-body">
              <div className="calm-base-card-head">
                <div>
                  <h2>Studios</h2>
                  <p>Direct entry points with minimal visual noise so the main dashboard stays calm.</p>
                </div>
                <span className="calm-base-pill">Navigation</span>
              </div>

              <div className="calm-base-studio-grid">
                {STUDIOS.map((studio) => (
                  <Link key={studio.key} to={studio.path} className="calm-base-studio">
                    <strong>{studio.label}</strong>
                    <p>{studio.blurb}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
