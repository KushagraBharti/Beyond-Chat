import { motion } from "framer-motion";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  createReminder,
  deleteReminder,
  getCalendarEvents,
  getProviderStatuses,
  getReminders,
  startGoogleCalendarConnect,
  type ProviderRecord,
  type ProviderStatus,
  type Reminder,
} from "../../lib/api";
import { fadeUp, stagger, studioColors } from "../../lib/theme";
import { MotionCard, PageSection, StatusBadge } from "../../components/protectedUi";
import { useAuth } from "../../context/AuthContext";

type CalendarEvent = { id: string; title: string; startsAt: string; location: string };

type IntegrationItem = {
  key: string;
  name: string;
  status: ProviderStatus;
  actionLabel: string;
  actionable: boolean;
  onAction?: () => void;
};

function ChatGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8.5A3.5 3.5 0 0 1 9.5 5h9A3.5 3.5 0 0 1 22 8.5v5a3.5 3.5 0 0 1-3.5 3.5H14l-4.5 3v-3H9.5A3.5 3.5 0 0 1 6 13.5z" />
      <path d="M2 6.5A3.5 3.5 0 0 1 5.5 3H8" />
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

function CalendarGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M8 3.5v4" />
      <path d="M16 3.5v4" />
      <path d="M3.5 10h17" />
    </svg>
  );
}

function ServerGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="6" rx="2" />
      <rect x="4" y="14" width="16" height="6" rx="2" />
      <path d="M8 7h.01" />
      <path d="M8 17h.01" />
      <path d="M12 7h5" />
      <path d="M12 17h5" />
    </svg>
  );
}

function SparkGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7Z" />
    </svg>
  );
}

function TrashGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M9.5 3.5h5" />
      <path d="M7.5 7l.6 11a2 2 0 0 0 2 1.9h3.8a2 2 0 0 0 2-1.9l.6-11" />
      <path d="M10 11.5v4.5" />
      <path d="M14 11.5v4.5" />
    </svg>
  );
}

function IntegrationStatusLine({ status }: { status: ProviderStatus }) {
  const palette: Record<ProviderStatus, string> = {
    connected: "bg-emerald-500",
    disconnected: "bg-stone-400",
    not_configured: "bg-stone-400",
    error: "bg-rose-500",
  };

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
        <span>Status</span>
        <span>{status.replaceAll("_", " ")}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div className={`h-full rounded-full ${palette[status]}`} style={{ width: status === "connected" ? "100%" : "100%" }} />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  disabled = false,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base = "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition";
  const palette = "bg-stone-950 text-white hover:-translate-y-0.5 hover:bg-[#4F3FE8] hover:shadow-[0_14px_30px_rgba(79,63,232,0.28)]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${palette} ${disabled ? "cursor-default" : ""}`}
    >
      {label}
    </button>
  );
}

function ToolCard({
  icon,
  name,
  status,
  actionLabel,
  disabled = false,
  onAction,
  onHoverStart,
  onHoverEnd,
}: {
  icon: ReactNode;
  name: string;
  status: ProviderStatus;
  actionLabel: string;
  disabled?: boolean;
  onAction?: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}) {
  return (
    <div
      className="rounded-[1.5rem] border border-stone-200 bg-white/80 p-4 shadow-[0_16px_40px_rgba(28,25,23,0.05)]"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 text-stone-700">
            {icon}
          </div>
          <strong className="truncate text-[0.98rem] text-stone-950">{name}</strong>
        </div>
        <ActionButton label={actionLabel} disabled={disabled} onClick={onAction} />
      </div>
      <IntegrationStatusLine status={status} />
    </div>
  );
}

function StudioShortcut({
  label,
  color,
  icon,
  onClick,
}: {
  label: string;
  color: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[132px] flex-col justify-between rounded-[1.6rem] border border-white/70 bg-white/80 p-5 text-left shadow-[0_18px_46px_rgba(28,25,23,0.05)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(28,25,23,0.08)]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border" style={{ borderColor: `${color}35`, backgroundColor: `${color}12`, color }}>
        {icon}
      </div>
      <div>
        <strong className="block text-base text-stone-950">{label}</strong>
      </div>
    </button>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [providers, setProviders] = useState<Record<string, ProviderRecord>>({});
  const [error, setError] = useState<string | null>(null);
  const [calendarHover, setCalendarHover] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderDueAt, setNewReminderDueAt] = useState(() => {
    const nextHour = new Date();
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);
    const offset = nextHour.getTimezoneOffset();
    const localTime = new Date(nextHour.getTime() - offset * 60_000);
    return localTime.toISOString().slice(0, 16);
  });
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderDeletingId, setReminderDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [reminderResponse, providerResponse, eventResponse] = await Promise.all([
          getReminders(),
          getProviderStatuses(),
          getCalendarEvents(),
        ]);

        if (!active) return;

        setReminders(reminderResponse.items ?? []);
        setProviders(providerResponse.providers ?? {});
        setCalendarEvents(eventResponse.items ?? []);
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

  const googleCalendarStatus = providers.googleCalendar?.status ?? "not_configured";
  const calendarPreviewVisible = googleCalendarStatus === "connected" && calendarHover;
  const firstName =
    user?.user_metadata?.first_name ||
    user?.user_metadata?.name?.split?.(" ")?.[0] ||
    user?.email?.split("@")[0]?.split(/[._-]/)[0] ||
    "there";

  const integrationItems = useMemo<IntegrationItem[]>(
    () => [
      {
        key: "googleCalendar",
        name: "Google Calendar",
        status: googleCalendarStatus,
        actionLabel: googleCalendarStatus === "connected" ? "Disconnect" : "Connect",
        actionable: googleCalendarStatus !== "connected",
        onAction:
          googleCalendarStatus === "connected"
            ? undefined
            : () => {
                void startGoogleCalendarConnect().then((payload) => {
                  if (payload.url) {
                    window.open(payload.url, "_blank", "noopener,noreferrer");
                  }
                });
              },
      },
      {
        key: "openrouter",
        name: providers.openrouter?.label ?? "OpenRouter",
        status: providers.openrouter?.status ?? "not_configured",
        actionLabel: providers.openrouter?.status === "connected" ? "Disconnect" : "Connect",
        actionable: false,
      },
      {
        key: "tavily",
        name: providers.tavily?.label ?? "Tavily",
        status: providers.tavily?.status ?? "not_configured",
        actionLabel: providers.tavily?.status === "connected" ? "Disconnect" : "Connect",
        actionable: false,
      },
    ],
    [googleCalendarStatus, providers],
  );

  const mcpItems = [
    { key: "browser", name: "Browser QA", status: "connected" as ProviderStatus, actionLabel: "Disconnect", actionable: false, icon: <ServerGlyph /> },
    { key: "notion", name: "Notion Context", status: "not_configured" as ProviderStatus, actionLabel: "Connect", actionable: false, icon: <NotebookGlyph /> },
    { key: "linear", name: "Linear Sync", status: "not_configured" as ProviderStatus, actionLabel: "Connect", actionable: false, icon: <SparkGlyph /> },
  ];

  async function handleAddReminder() {
    const title = newReminderTitle.trim();
    if (!title || !newReminderDueAt || reminderSaving) return;

    setReminderSaving(true);
    setError(null);

    try {
      const dueAt = new Date(newReminderDueAt);
      const payload = await createReminder({
        title,
        note: "",
        due_at: dueAt.toISOString(),
      });

      setReminders((current) =>
        [...current, payload.item].sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()),
      );
      setNewReminderTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save reminder.");
    } finally {
      setReminderSaving(false);
    }
  }

  async function handleDeleteReminder(reminderId: string) {
    if (reminderDeletingId) return;
    setReminderDeletingId(reminderId);
    setError(null);

    try {
      await deleteReminder(reminderId);
      setReminders((current) => current.filter((item) => item.id !== reminderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete reminder.");
    } finally {
      setReminderDeletingId(null);
    }
  }

  return (
    <motion.div className="page-wrap" variants={stagger} initial="hidden" animate="visible">
      <PageSection
        eyebrow="Workspace Home"
        title={`Hello, ${String(firstName).charAt(0).toUpperCase()}${String(firstName).slice(1)}`}
      />

      {error ? <div className="error-copy">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <motion.div variants={fadeUp} className="space-y-12">
          <div className="grid gap-6 2xl:grid-cols-2">
            <MotionCard className="overflow-visible">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-stone-500">Integrations</div>
                  <h3 className="mt-2 text-xl font-black tracking-[-0.03em] text-stone-950">Connect core product tools.</h3>
                </div>
                <StatusBadge status={googleCalendarStatus} />
              </div>

              <div className="relative grid gap-4">
                {integrationItems.map((item) => (
                  <ToolCard
                    key={item.key}
                    icon={item.key === "googleCalendar" ? <CalendarGlyph /> : item.key === "openrouter" ? <SparkGlyph /> : <NotebookGlyph />}
                    name={item.key === "googleCalendar" ? "Google Calendar" : item.name}
                    status={item.status}
                    actionLabel={item.actionLabel}
                    disabled={!item.actionable}
                    onAction={item.onAction}
                    onHoverStart={item.key === "googleCalendar" ? () => setCalendarHover(true) : undefined}
                    onHoverEnd={item.key === "googleCalendar" ? () => setCalendarHover(false) : undefined}
                  />
                ))}

                {calendarPreviewVisible ? (
                  <div className="pointer-events-none absolute right-0 top-[5.5rem] z-20 w-[320px] rounded-[1.5rem] border border-stone-200 bg-white/96 p-4 shadow-[0_30px_80px_rgba(28,25,23,0.16)] backdrop-blur">
                    <div className="mb-3 flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-stone-500">
                      <CalendarGlyph />
                      Agenda preview
                    </div>
                    <div className="space-y-3">
                      {calendarEvents.length ? (
                        calendarEvents.slice(0, 4).map((event) => (
                          <div key={event.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3">
                            <strong className="block text-sm text-stone-950">{event.title}</strong>
                            <span className="mt-1 block text-xs text-stone-500">{new Date(event.startsAt).toLocaleString()}</span>
                            <span className="mt-1 block text-xs text-stone-400">{event.location || "No location"}</span>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
                          Calendar is connected. Events will appear here once your agenda is available.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </MotionCard>

            <MotionCard>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-stone-500">MCP servers</div>
                  <h3 className="mt-2 text-xl font-black tracking-[-0.03em] text-stone-950">Prepared server connections.</h3>
                </div>
                <ServerGlyph />
              </div>

              <div className="grid gap-4">
                {mcpItems.map((item) => (
                  <ToolCard
                    key={item.key}
                    icon={item.icon}
                    name={item.name}
                    status={item.status}
                    actionLabel={item.actionLabel}
                    disabled={!item.actionable}
                  />
                ))}
              </div>
            </MotionCard>
          </div>

          <div style={{ height: "3.5rem" }} aria-hidden="true" />

          <MotionCard>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-stone-500">Studio shortcuts</div>
                <h3 className="mt-2 text-xl font-black tracking-[-0.03em] text-stone-950">Jump directly into a studio.</h3>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <StudioShortcut label="Chat" color={studioColors.chat} icon={<ChatGlyph />} onClick={() => navigate("/chat")} />
              <StudioShortcut label="Writing" color={studioColors.writing} icon={<PencilGlyph />} onClick={() => navigate("/writing")} />
              <StudioShortcut label="Research" color={studioColors.research} icon={<NotebookGlyph />} onClick={() => navigate("/research")} />
              <StudioShortcut label="Image" color={studioColors.image} icon={<ImageGlyph />} onClick={() => navigate("/image")} />
              <StudioShortcut label="Data" color={studioColors.data} icon={<DataGlyph />} onClick={() => navigate("/data")} />
              <StudioShortcut label="Finance" color={studioColors.finance} icon={<FinanceGlyph />} onClick={() => navigate("/finance")} />
            </div>
          </MotionCard>
        </motion.div>

        <motion.div variants={fadeUp} className="xl:justify-self-end xl:w-[320px] 2xl:w-[340px]">
          <MotionCard>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-stone-500">Reminders</div>
                <h3 className="mt-2 whitespace-nowrap text-lg font-black tracking-[-0.03em] text-stone-950">Keep today lightweight.</h3>
              </div>
              {reminders.length ? (
                <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm font-black text-stone-950">
                  {reminders.length}
                </div>
              ) : (
                <div className="inline-flex h-11 min-w-20 items-center justify-center rounded-2xl border border-[#F59E0B]/35 bg-[#F59E0B]/12 px-3 text-sm font-black uppercase tracking-[0.08em] text-[#B45309]">
                  Empty
                </div>
              )}
            </div>

            <div className="mb-4" style={{ paddingTop: "2.25rem" }}>
              <input
                value={newReminderTitle}
                onChange={(event) => setNewReminderTitle(event.target.value)}
                placeholder="Add a reminder"
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-[#4F3FE8] focus:ring-2 focus:ring-[#4F3FE8]/10"
              />
              <div className="flex items-center gap-2" style={{ marginTop: "1.5rem" }}>
                <input
                  type="datetime-local"
                  value={newReminderDueAt}
                  onChange={(event) => setNewReminderDueAt(event.target.value)}
                  className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-[#4F3FE8] focus:ring-2 focus:ring-[#4F3FE8]/10"
                />
                <button
                  type="button"
                  onClick={() => void handleAddReminder()}
                  disabled={!newReminderTitle.trim() || !newReminderDueAt || reminderSaving}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#4F3FE8] hover:shadow-[0_14px_30px_rgba(79,63,232,0.28)] disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-stone-950 disabled:hover:shadow-none"
                >
                  Add
                </button>
              </div>
            </div>

            {reminders.length ? (
              <div className="space-y-3" style={{ marginTop: "2.5rem" }}>
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="rounded-[1.35rem] border border-stone-200 bg-white/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <strong className="text-sm text-stone-950">{reminder.title}</strong>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stone-500">
                          {reminder.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleDeleteReminder(reminder.id)}
                          disabled={reminderDeletingId === reminder.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Delete ${reminder.title}`}
                        >
                          <TrashGlyph />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{reminder.note}</p>
                    <div className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
                      {new Date(reminder.due_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </MotionCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
