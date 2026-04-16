import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCalendarEvents,
  getProviderStatuses,
  getReminders,
  getWorkspace,
  type ProviderRecord,
  type Reminder,
} from "../../lib/api";
import { fadeUp, stagger, studioColors } from "../../lib/theme";
import { EmptyState, MotionCard, PageSection, PrimaryButton, SecondaryButton, StatusBadge } from "../../components/protectedUi";

export default function HomePage() {
  const navigate = useNavigate();
  const [workspaceName, setWorkspaceName] = useState("Beyond Chat");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<Array<{ id: string; title: string; startsAt: string; location: string }>>([]);
  const [providers, setProviders] = useState<Record<string, ProviderRecord>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [workspaceResponse, reminderResponse, providerResponse, eventResponse] = await Promise.all([
          getWorkspace(),
          getReminders(),
          getProviderStatuses(),
          getCalendarEvents(),
        ]);

        if (!active) {
          return;
        }

        setWorkspaceName(workspaceResponse.workspace.name);
        setReminders(reminderResponse.items);
        setProviders(providerResponse.providers);
        setCalendarEvents(eventResponse.items);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard.");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const providerList = Object.entries(providers);

  return (
    <motion.div className="page-wrap" variants={stagger} initial="hidden" animate="visible">
      <PageSection
        eyebrow="Workspace Home"
        title={`Hello, ${workspaceName}`}
        description="A productivity surface for calendar, reminders, integrations, and studio entry points."
        actions={
          <div className="inline-actions">
            <PrimaryButton type="button" onClick={() => navigate("/chat")}>
              Open Today’s Focus
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => navigate("/settings")}>
              Review Integrations
            </SecondaryButton>
          </div>
        }
      />

      {error ? <div className="error-copy">{error}</div> : null}

      {/* TEMPORARY - dashboard design previews for internal review */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "14px 18px",
          marginBottom: 16,
          borderRadius: 14,
          border: "1px solid #0066ff",
          background: "rgba(0, 102, 255, 0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#0066ff",
                fontWeight: 700,
              }}
            >
              Internal · Design Directions
            </div>
            <div style={{ fontSize: 13, color: "#1a1c1e", marginTop: 2 }}>
              Select a concept to preview the new product directions.
            </div>
          </div>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              textTransform: "uppercase",
              color: "#0066ff",
              background: "#fff",
              padding: "2px 6px",
              border: "1px solid #0066ff",
              borderRadius: 4,
            }}
          >
            New
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            { n: 1, label: "Operator Console" },
            { n: 2, label: "Metrics Surface" },
            { n: 3, label: "Editorial Today" },
            { n: 4, label: "Minimal Base" },
          ].map((d) => (
            <button
              key={d.n}
              type="button"
              onClick={() => navigate(`/designs/${d.n}`)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid #e1e4e8",
                background: "#fff",
                color: "#1a1c1e",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = "#0066ff")}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = "#e1e4e8")}
            >
              <span style={{ color: "#0066ff" }}>0{d.n}</span>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <motion.div variants={fadeUp} className="hero-grid">
        <MotionCard className="hero-card">
          <div className="hero-copy">
            <div className="hero-kicker">Workspace Command Center</div>
            <h2>Google Calendar, reminders, and upcoming work all in one focused morning view.</h2>
            <p>
              The homepage is built to feel more like a personal operating system than a landing screen. Integrations can
              be disconnected today and still keep the product useful.
            </p>
            <div className="inline-actions">
              <PrimaryButton type="button" onClick={() => navigate("/chat")}>
                Start New Chat
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => navigate("/writing")}>
                Open Writing Library
              </SecondaryButton>
            </div>
          </div>

          <div className="hero-preview">
            <div className="hero-preview-card">
              <span>Agenda</span>
              <strong>{calendarEvents[0]?.title ?? "Connect Google Calendar"}</strong>
              <p>{calendarEvents[0]?.location ?? "Read-only agenda preview will appear here."}</p>
            </div>
            <div className="hero-preview-matrix">
              {["Chat", "Writing", "Research", "Image"].map((label) => (
                <div key={label} className="hero-mini-tile">
                  <div className="hero-mini-dot" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </MotionCard>
      </motion.div>

      <div className="dashboard-grid">
        <MotionCard accent={studioColors.chat}>
          <div className="context-builder-head">
            <div>
              <h3>Agenda</h3>
              <p>Read-only Google Calendar preview with graceful disconnected states.</p>
            </div>
            <StatusBadge status={providers.googleCalendar?.status ?? "not_configured"} />
          </div>
          {calendarEvents.length ? (
            <div className="stack-md">
              {calendarEvents.map((event) => (
                <div key={event.id} className="list-row">
                  <div>
                    <strong>{event.title}</strong>
                    <p>{new Date(event.startsAt).toLocaleString()}</p>
                  </div>
                  <span>{event.location}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Calendar is not connected"
              body="The card remains visible even before OAuth is configured so the layout is stable from day one."
            />
          )}
        </MotionCard>

        <MotionCard accent={studioColors.finance}>
          <div className="context-builder-head">
            <div>
              <h3>Reminders</h3>
              <p>Internal tasks keep the homepage useful before third-party task systems are added.</p>
            </div>
          </div>
          {reminders.length ? (
            <div className="stack-md">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="reminder-card">
                  <div className="reminder-top">
                    <strong>{reminder.title}</strong>
                    <StatusBadge status={reminder.source === "internal" ? "connected" : "disconnected"} label={reminder.source} />
                  </div>
                  <p>{reminder.note}</p>
                  <span>{new Date(reminder.due_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No reminders yet"
              body="This workspace does not have any saved reminders yet, so the card stays clean instead of relying on seeded demo data."
            />
          )}
        </MotionCard>
      </div>

      <div className="dashboard-grid dashboard-grid-three">
        <MotionCard>
          <div className="context-builder-head">
            <div>
              <h3>Integrations</h3>
              <p>Provider status cards stay explicit instead of hiding failures.</p>
            </div>
          </div>
          <div className="stack-sm">
            {providerList.map(([key, provider]) => (
              <div key={key} className="list-row">
                <div>
                  <strong>{provider.label}</strong>
                  <p>{provider.details}</p>
                </div>
                <StatusBadge status={provider.status} />
              </div>
            ))}
          </div>
        </MotionCard>

        <MotionCard>
          <div className="context-builder-head">
            <div>
              <h3>MCP Servers</h3>
              <p>Prepared shell states for future server-level integrations.</p>
            </div>
          </div>
          <div className="stack-sm">
            {["Playwright Browser QA", "Linear Workspace Sync", "Notion Context Connector"].map((item, index) => (
              <div key={item} className="server-card">
                <div>
                  <strong>{item}</strong>
                  <p>{index === 0 ? "Ready for local QA workflows." : "Awaiting final provider configuration."}</p>
                </div>
                <StatusBadge status={index === 0 ? "disconnected" : "not_configured"} />
              </div>
            ))}
          </div>
        </MotionCard>

        <MotionCard>
          <div className="context-builder-head">
            <div>
              <h3>Studio Shortcuts</h3>
              <p>Direct entry points matching the rest of the protected workspace aesthetic.</p>
            </div>
          </div>
          <div className="shortcut-grid">
            {[
              ["Chat", studioColors.chat],
              ["Writing", studioColors.writing],
              ["Research", studioColors.research],
              ["Image", studioColors.image],
              ["Data", studioColors.data],
              ["Finance", studioColors.finance],
            ].map(([label, color]) => (
              <div key={label} className="shortcut-card">
                <div className="shortcut-swatch" style={{ background: `${color}18`, color }} />
                <strong>{label}</strong>
                <p>Open the studio and continue where you left off.</p>
              </div>
            ))}
          </div>
        </MotionCard>
      </div>
    </motion.div>
  );
}
