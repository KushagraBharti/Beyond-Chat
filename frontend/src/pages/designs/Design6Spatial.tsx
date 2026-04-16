import { Link, useNavigate } from "react-router-dom";
import { STUDIOS, useDashboardData } from "./useDashboardData";

const css = `
.spatial {
  min-height: 100vh;
  background: #ecedf0;
  color: #1a1a1a;
  font-family: 'Inter', system-ui, sans-serif;
  display: flex;
  padding: 24px;
  gap: 24px;
}
.spatial-zone {
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(20px);
  border-radius: 32px;
  border: 1px solid rgba(255,255,255,0.4);
  display: flex;
  flex-direction: column;
}
.spatial-left {
  width: 320px;
  padding: 32px;
}
.spatial-center {
  flex: 1;
  padding: 40px;
}
.spatial-right {
  width: 380px;
  padding: 32px;
}
.spatial-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 32px;
}
.spatial-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #888;
  margin-bottom: 16px;
}
.spatial-studio-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.spatial-studio-card {
  aspect-ratio: 1;
  background: #fff;
  border-radius: 24px;
  padding: 20px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}
.spatial-studio-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.06);
}
.spatial-studio-card h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.spatial-studio-card span {
  font-size: 12px;
  color: #888;
  line-height: 1.4;
}
.spatial-item {
  background: #fff;
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}
.spatial-item h5 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}
.spatial-item p {
  margin: 0;
  font-size: 13px;
  color: #666;
}
.spatial-item time {
  font-size: 11px;
  color: #aaa;
  margin-top: 8px;
  display: block;
}
.spatial-back {
  position: fixed; bottom: 32px; right: 32px;
  background: #000; color: #fff; text-decoration: none;
  padding: 12px 24px; border-radius: 100px; font-size: 13px; font-weight: 600;
}
@media (max-width: 1200px) {
  .spatial { flex-direction: column; }
  .spatial-left, .spatial-right { width: 100%; }
}
`;

export default function Design6Spatial() {
  const { workspaceName, reminders, calendarEvents, loaded } = useDashboardData();
  const navigate = useNavigate();

  return (
    <div className="spatial">
      <style>{css}</style>
      <Link to="/dashboard" className="spatial-back">Return to Dashboard</Link>

      <div className="spatial-zone spatial-left">
        <div className="spatial-label">Workspace</div>
        <div className="spatial-title">{loaded ? workspaceName : "Beyond"}</div>
        
        <div className="spatial-label">Calendar</div>
        {calendarEvents.length ? calendarEvents.slice(0, 4).map(ev => (
          <div key={ev.id} className="spatial-item">
            <h5>{ev.title}</h5>
            <p>{ev.location || "Studio"}</p>
            <time>{new Date(ev.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
          </div>
        )) : (
          <p style={{ fontSize: 13, color: '#888' }}>No scheduled events.</p>
        )}
      </div>

      <div className="spatial-zone spatial-center">
        <div className="spatial-label">Central Intelligence</div>
        <div className="spatial-title" style={{ fontSize: 32 }}>Good Morning.</div>
        
        <div className="spatial-label" style={{ marginBottom: 24 }}>Select Studio</div>
        <div className="spatial-studio-grid">
          {STUDIOS.slice(0, 6).map(s => (
            <Link key={s.key} to={s.path} className="spatial-studio-card">
              <h4>{s.label}</h4>
              <span>{s.blurb}</span>
            </Link>
          ))}
        </div>

        <button 
          onClick={() => navigate("/chat")}
          style={{
            width: '100%',
            marginTop: 32,
            padding: 24,
            borderRadius: 24,
            background: '#fff',
            border: 'none',
            fontSize: 18,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          Initialize Stream →
        </button>
      </div>

      <div className="spatial-zone spatial-right">
        <div className="spatial-label">Pending Context</div>
        <div className="spatial-title">Reminders</div>
        
        {reminders.length ? reminders.map(r => (
          <div key={r.id} className="spatial-item">
            <h5>{r.title}</h5>
            <p>{r.note}</p>
            <time>{new Date(r.due_at).toLocaleDateString()}</time>
          </div>
        )) : (
          <p style={{ fontSize: 13, color: '#888' }}>Workspace queue is empty.</p>
        )}
      </div>
    </div>
  );
}
