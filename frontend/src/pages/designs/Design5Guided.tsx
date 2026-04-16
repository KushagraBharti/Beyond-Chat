import { Link, useNavigate } from "react-router-dom";
import { STUDIOS, useDashboardData } from "./useDashboardData";

const css = `
.guide {
  min-height: 100vh;
  background: #f4f4f7;
  color: #1a1c1e;
  font-family: 'Inter', system-ui, sans-serif;
  padding: 64px 24px;
}
.guide-container {
  max-width: 600px;
  margin: 0 auto;
}
.guide-header {
  margin-bottom: 48px;
}
.guide-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
}
.guide-header p {
  color: #6a6f75;
  font-size: 16px;
}
.guide-section {
  margin-bottom: 40px;
}
.guide-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6a6f75;
  margin-bottom: 16px;
}
.guide-card {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  border: 1px solid #e1e4e8;
  display: flex;
  align-items: center;
  gap: 20px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  margin-bottom: 12px;
}
.guide-card:hover {
  transform: scale(1.02);
  border-color: #0066ff;
  box-shadow: 0 8px 24px rgba(0,0,0,0.05);
}
.guide-card-icon {
  width: 48px;
  height: 48px;
  background: #f0f7ff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #0066ff;
}
.guide-card-content h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
}
.guide-card-content p {
  margin: 0;
  font-size: 14px;
  color: #6a6f75;
}
.guide-action-btn {
  background: #0066ff;
  color: #fff;
  border: none;
  padding: 16px;
  border-radius: 16px;
  width: 100%;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 24px;
}
.guide-mini-list {
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e1e4e8;
  overflow: hidden;
}
.guide-mini-item {
  padding: 16px 24px;
  border-bottom: 1px solid #f0f2f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.guide-mini-item:last-child { border-bottom: 0; }
.guide-mini-item span { font-size: 14px; font-weight: 500; }
.guide-mini-item time { font-size: 12px; color: #6a6f75; }
.guide-back {
  position: fixed; top: 24px; right: 24px;
  font-size: 12px; font-weight: 600; color: #6a6f75; text-decoration: none;
}
`;

export default function Design5Guided() {
  const { workspaceName, reminders, calendarEvents, loaded } = useDashboardData();
  const navigate = useNavigate();

  return (
    <div className="guide">
      <style>{css}</style>
      <Link to="/dashboard" className="guide-back">Close</Link>

      <div className="guide-container">
        <header className="guide-header">
          <h1>Welcome back, {loaded ? workspaceName.split(' ')[0] : 'Beyond'}</h1>
          <p>Here is what's on your radar for today.</p>
        </header>

        <section className="guide-section">
          <div className="guide-label">Priority Action</div>
          <Link to="/chat" className="guide-card" style={{ background: '#0066ff', color: '#fff', borderColor: '#0066ff' }}>
            <div className="guide-card-icon" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>✦</div>
            <div className="guide-card-content">
              <h3>Start Today's Focus</h3>
              <p style={{ color: 'rgba(255,255,255,0.8)' }}>Initialize a new reasoning stream for your current task.</p>
            </div>
          </Link>
        </section>

        <section className="guide-section">
          <div className="guide-label">Next Up</div>
          {calendarEvents.length ? (
            <div className="guide-mini-list">
              {calendarEvents.slice(0, 3).map(ev => (
                <div key={ev.id} className="guide-mini-item">
                  <span>{ev.title}</span>
                  <time>{new Date(ev.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                </div>
              ))}
            </div>
          ) : (
            <div className="guide-card">
              <div className="guide-card-icon">○</div>
              <div className="guide-card-content">
                <h3>Schedule is Clear</h3>
                <p>Enjoy the uninterrupted time for deep work.</p>
              </div>
            </div>
          )}
        </section>

        <section className="guide-section">
          <div className="guide-label">Quick Access</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Link to="/writing" className="guide-card" style={{ padding: '16px', gap: '12px', marginBottom: 0 }}>
              <div className="guide-card-icon" style={{ width: '32px', height: '32px', fontSize: '14px' }}>W</div>
              <div className="guide-card-content">
                <h3 style={{ fontSize: '14px' }}>Writing</h3>
              </div>
            </Link>
            <Link to="/research" className="guide-card" style={{ padding: '16px', gap: '12px', marginBottom: 0 }}>
              <div className="guide-card-icon" style={{ width: '32px', height: '32px', fontSize: '14px' }}>R</div>
              <div className="guide-card-content">
                <h3 style={{ fontSize: '14px' }}>Research</h3>
              </div>
            </Link>
          </div>
        </section>

        <section className="guide-section">
          <div className="guide-label">Recent Reminders</div>
          <div className="guide-mini-list">
            {reminders.length ? reminders.slice(0, 3).map(r => (
              <div key={r.id} className="guide-mini-item">
                <span>{r.title}</span>
                <time>{new Date(r.due_at).toLocaleDateString()}</time>
              </div>
            )) : (
              <div className="guide-mini-item">
                <span>No pending reminders</span>
              </div>
            )}
          </div>
        </section>

        <button className="guide-action-btn" onClick={() => navigate("/artifacts")}>View Saved Artifacts</button>
      </div>
    </div>
  );
}
