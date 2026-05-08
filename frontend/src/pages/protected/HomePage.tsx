import { motion } from "framer-motion";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  createReminder,
  deleteReminder,
  getCalendarEvents,
  getProviderStatuses,
  getReminders,
  listArtifacts,
  startGoogleCalendarConnect,
  type ArtifactRecord,
  type ProviderRecord,
  type ProviderStatus,
  type Reminder,
} from "../../lib/api";
import { fadeUp, stagger, studioColors } from "../../lib/theme";
import { MotionCard } from "../../components/protectedUi";
import { useAuth } from "../../context/AuthContext";

type CalendarEvent = { id: string; title: string; startsAt: string; location: string };

type IntegrationItem = {
  key: string;
  name: string;
  status: ProviderStatus;
  actionLabel: string;
  actionable: boolean;
  icon: ReactNode;
  onAction?: () => void;
};

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
  const dot: Record<ProviderStatus, string> = {
    connected: "bg-[#22C55E] shadow-[0_0_16px_rgba(34,197,94,0.55)]",
    disconnected: "bg-[#A1A1AA]",
    not_configured: "bg-[#D4D4D8]",
    error: "bg-[#F43F5E] shadow-[0_0_16px_rgba(244,63,94,0.4)]",
  };
  const badge: Record<ProviderStatus, string> = {
    connected: "text-[#14532D]",
    disconnected: "text-[#52525B]",
    not_configured: "text-[#71717A]",
    error: "text-[#9F1239]",
  };
  const label: Record<ProviderStatus, string> = {
    connected: "Connected",
    disconnected: "Disconnected",
    not_configured: "Not configured",
    error: "Error",
  };

  return (
    <div className="mt-2.5 flex items-center gap-2">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot[status]}`} />
      <span className={`text-[11px] font-black uppercase tracking-[0.16em] ${badge[status]}`}>
        {label[status]}
      </span>
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
  const base = "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] transition";
  const palette = "bg-[#111114] text-white hover:-translate-y-0.5 hover:bg-[#E55613] hover:shadow-[0_14px_30px_rgba(229,86,19,0.24)]";

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
      className="group relative overflow-hidden rounded-[1.35rem] border border-[#111114]/10 bg-white/78 p-4 shadow-[0_18px_46px_rgba(17,17,20,0.06)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[#111114]/18 hover:bg-white hover:shadow-[0_26px_70px_rgba(17,17,20,0.1)]"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#E55613]/50 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-[#111114]/10 bg-[#F4F1EA] text-[#111114] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            {icon}
          </div>
          <div className="min-w-0">
            <strong className="block truncate text-[0.98rem] text-[#111114]">{name}</strong>
            <IntegrationStatusLine status={status} />
          </div>
        </div>
        <ActionButton label={actionLabel} disabled={disabled} onClick={onAction} />
      </div>
    </div>
  );
}

function StudioShortcut({
  label,
  description,
  color,
  icon,
  onClick,
}: {
  label: string;
  description: string;
  color: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative min-h-[168px] overflow-hidden rounded-[1.6rem] border border-[#111114]/10 bg-white p-5 text-left shadow-[0_18px_44px_rgba(17,17,20,0.06)] transition hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(17,17,20,0.12)]"
    >
      <div className="absolute -right-9 -top-10 h-28 w-28 rotate-12 rounded-[2rem] opacity-15 transition group-hover:scale-125" style={{ backgroundColor: color }} />
      <div className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: color }} />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-[1rem] border" style={{ borderColor: `${color}35`, backgroundColor: `${color}12`, color }}>
        {icon}
      </div>
      <div className="relative mt-9">
        <strong className="block text-xl font-black leading-[1.08] tracking-[-0.035em] text-[#111114]">{label}</strong>
        <span className="mt-2 block text-sm font-medium leading-6 text-[#6B6B70]">{description}</span>
      </div>
      <span className="relative mt-6 inline-flex text-xs font-black uppercase tracking-[0.16em] text-[#111114]/45">Launch</span>
    </button>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [recentArtifacts, setRecentArtifacts] = useState<ArtifactRecord[]>([]);
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

      try {
        const artifactResponse = await listArtifacts({ limit: 8 });
        if (active) {
          setRecentArtifacts(artifactResponse.items ?? []);
        }
      } catch {
        if (active) {
          setRecentArtifacts([]);
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
    () => {
      const providerTile = (
        key: string,
        fallbackName: string,
        icon: ReactNode,
      ): IntegrationItem => {
        const provider = providers[key];
        const status = provider?.status ?? "not_configured";
        return {
          key,
          name: provider?.label ?? fallbackName,
          status,
          actionLabel: status === "connected" ? "Live" : "Setup",
          actionable: false,
          icon,
        };
      };

      return [
        {
          key: "googleCalendar",
          name: providers.googleCalendar?.label ?? "Google Calendar",
          status: googleCalendarStatus,
          actionLabel: googleCalendarStatus === "connected" ? "Live" : "Connect",
          actionable: googleCalendarStatus !== "connected",
          icon: <CalendarGlyph />,
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
        providerTile("supabase", "Supabase", <ServerGlyph />),
        providerTile("supabaseStorage", "Supabase Storage", <ArchiveGlyph />),
        providerTile("openrouter", "OpenRouter", <SparkGlyph />),
        providerTile("openrouterImages", "OpenRouter Images", <ImageGlyph />),
        providerTile("exa", "Exa", <NotebookGlyph />),
        providerTile("dexter", "Dexter Finance", <FinanceGlyph />),
        providerTile("financialDatasets", "Financial Datasets", <DataGlyph />),
        providerTile("notion", "Notion", <NotebookGlyph />),
        providerTile("googleDrive", "Google Drive", <ArchiveGlyph />),
        providerTile("slack", "Slack", <ChatGlyph />),
      ];
    },
    [googleCalendarStatus, providers],
  );

  const coreProviderItems = integrationItems.filter((item) =>
    !["notion", "googleDrive", "slack"].includes(item.key),
  );
  const contextSourceItems = integrationItems.filter((item) =>
    ["notion", "googleDrive", "slack"].includes(item.key),
  );
  const artifactStudioCounts = recentArtifacts.reduce<Record<string, number>>((counts, artifact) => {
    counts[artifact.studio] = (counts[artifact.studio] ?? 0) + 1;
    return counts;
  }, {});
  const connectedProviderCount = integrationItems.filter((item) => item.status === "connected").length;
  const openReminderCount = reminders.filter((item) => item.status === "open").length;
  const latestArtifact = recentArtifacts[0];
  const nextReminder = reminders[0];
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  async function handleAddReminder() {
    const title = newReminderTitle.trim();
    if (!title || !newReminderDueAt || reminderSaving) return;

    setReminderSaving(true);
    setError(null);
    const tempId = `temp-${Date.now()}`;
    const optimisticReminder: Reminder = {
      id: tempId,
      title,
      note: "",
      due_at: new Date(newReminderDueAt).toISOString(),
      status: "open",
      source: "internal",
      workspace_id: "pending",
      created_at: new Date().toISOString(),
    };

    setReminders((current) =>
      [...current, optimisticReminder].sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()),
    );
    setNewReminderTitle("");

    try {
      const dueAt = new Date(newReminderDueAt);
      const payload = await createReminder({
        title,
        note: "",
        due_at: dueAt.toISOString(),
      });

      setReminders((current) =>
        current
          .map((item) => (item.id === tempId ? payload.item : item))
          .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()),
      );
    } catch (err) {
      setReminders((current) => current.filter((item) => item.id !== tempId));
      setError(err instanceof Error ? err.message : "Failed to save reminder.");
    } finally {
      setReminderSaving(false);
    }
  }

  async function handleDeleteReminder(reminderId: string) {
    if (reminderDeletingId) return;
    if (reminderId.startsWith("temp-")) {
      setReminders((current) => current.filter((item) => item.id !== reminderId));
      return;
    }
    setReminderDeletingId(reminderId);
    setError(null);
    const existingReminder = reminders.find((item) => item.id === reminderId);
    setReminders((current) => current.filter((item) => item.id !== reminderId));

    try {
      await deleteReminder(reminderId);
    } catch (err) {
      if (existingReminder) {
        setReminders((current) =>
          [...current, existingReminder].sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()),
        );
      }
      setError(err instanceof Error ? err.message : "Failed to delete reminder.");
    } finally {
      setReminderDeletingId(null);
    }
  }

  return (
    <motion.div className="min-h-full flex-1" variants={stagger} initial="hidden" animate="visible">
      <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#111114]/10 bg-[#F7F3EA] p-3 shadow-[0_30px_120px_rgba(17,17,20,0.08)]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(17,17,20,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(17,17,20,0.045)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="pointer-events-none absolute right-[-12rem] top-[-15rem] -z-10 h-[34rem] w-[34rem] rounded-full bg-[#E55613]/18 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-16rem] left-[24%] -z-10 h-[32rem] w-[32rem] rounded-full bg-[#0E7AE6]/14 blur-3xl" />

        <motion.section
          variants={fadeUp}
          className="relative min-h-[28rem] overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#111114] p-6 text-white shadow-[0_26px_90px_rgba(17,17,20,0.28)] md:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(255,255,255,0.2),transparent_22%),radial-gradient(circle_at_82%_22%,rgba(229,86,19,0.28),transparent_28%),linear-gradient(130deg,rgba(79,63,232,0.28),transparent_34%)]" />
          <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

          <div className="relative grid min-h-[24rem] gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="relative flex min-h-[24rem] flex-col pb-20 md:pb-0">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/72">
                  <span className="h-2 w-2 rounded-full bg-[#22C55E] shadow-[0_0_18px_rgba(34,197,94,0.75)]" />
                  Workspace cockpit / {todayLabel}
                </div>
                <h1 className="mt-8 max-w-full whitespace-nowrap font-[Bricolage_Grotesque] text-[2.45rem] font-black leading-[1.02] tracking-[-0.045em] md:text-[3.45rem] 2xl:text-[4.35rem]">
                  Good to see you, {String(firstName).charAt(0).toUpperCase()}.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-white/66 md:text-lg">
                  Start in a studio, pick up a saved artifact, or wire context into the next run. This is the launch board for artifact-first work.
                </p>
              </div>

              <div className="mt-10 flex flex-wrap gap-3 md:absolute md:bottom-0 md:left-0 md:mt-0">
                <button
                  type="button"
                  onClick={() => navigate("/chat")}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#111114] shadow-[0_18px_44px_rgba(255,255,255,0.16)] transition hover:-translate-y-0.5 hover:bg-[#F7F3EA]"
                >
                  <ChatGlyph />
                  Open Chat
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/writing")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/8 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-white/32 hover:bg-white/14"
                >
                  <PencilGlyph />
                  New draft
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/artifacts")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/8 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-white/32 hover:bg-white/14"
                >
                  <ArchiveGlyph />
                  Artifact library
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {[
                ["Connected tools", `${connectedProviderCount}/${integrationItems.length}`, "Provider readiness"],
                ["Saved artifacts", String(recentArtifacts.length), latestArtifact?.title ?? "Nothing saved yet"],
                ["Open reminders", String(openReminderCount), nextReminder ? new Date(nextReminder.due_at).toLocaleString() : "No reminder queued"],
              ].map(([label, value, detail]) => (
                <div key={label} className="rounded-[1.25rem] border border-white/12 bg-white/9 p-4 backdrop-blur">
                  <div className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/46">{label}</div>
                  <div className="mt-4 font-[Bricolage_Grotesque] text-4xl font-black leading-none tracking-[-0.045em]">{value}</div>
                  <div className="mt-3 line-clamp-2 text-xs font-medium leading-5 text-white/54">{detail}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {error ? <div className="mt-5 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

        <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_390px]">
          <motion.div variants={fadeUp} className="grid gap-5">
            <MotionCard className="!rounded-[1.65rem] !border-[#111114]/10 !bg-white/74 !p-6 !shadow-[0_22px_70px_rgba(17,17,20,0.08)]">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#6B6B70]">Studio launchpad</div>
                  <h2 className="mt-3 max-w-2xl font-[Bricolage_Grotesque] text-3xl font-black leading-[1.08] tracking-[-0.045em] text-[#111114]">Choose the surface for the next artifact.</h2>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <StudioShortcut label="Chat" description="Reason through anything" color={studioColors.chat} icon={<ChatGlyph />} onClick={() => navigate("/chat")} />
                <StudioShortcut label="Writing" description="Draft, revise, publish" color={studioColors.writing} icon={<PencilGlyph />} onClick={() => navigate("/writing")} />
                <StudioShortcut label="Research" description="Synthesize source work" color={studioColors.research} icon={<NotebookGlyph />} onClick={() => navigate("/research")} />
                <StudioShortcut label="Image" description="Generate visual assets" color={studioColors.image} icon={<ImageGlyph />} onClick={() => navigate("/image")} />
                <StudioShortcut label="Data" description="Explore structured files" color={studioColors.data} icon={<DataGlyph />} onClick={() => navigate("/data")} />
                <StudioShortcut label="Finance" description="Analyze markets and filings" color={studioColors.finance} icon={<FinanceGlyph />} onClick={() => navigate("/finance")} />
              </div>
            </MotionCard>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <MotionCard className="!rounded-[1.65rem] !border-[#111114]/10 !bg-white/76 !p-6 !shadow-[0_22px_70px_rgba(17,17,20,0.08)]">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#6B6B70]">Artifact stream</div>
                    <h2 className="mt-3 max-w-xl font-[Bricolage_Grotesque] text-3xl font-black leading-[1.08] tracking-[-0.045em] text-[#111114]">Recent outputs worth returning to.</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/artifacts")}
                    className="shrink-0 rounded-full border border-[#111114]/10 bg-[#111114] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-[#E55613]"
                  >
                    Library
                  </button>
                </div>

                {recentArtifacts.length ? (
                  <div className="grid gap-3">
                    {recentArtifacts.slice(0, 5).map((artifact, index) => (
                      <button
                        key={artifact.id}
                        type="button"
                        onClick={() => navigate("/artifacts")}
                        className="group grid gap-4 rounded-[1.25rem] border border-[#111114]/10 bg-[#F7F3EA]/70 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_48px_rgba(17,17,20,0.08)] md:grid-cols-[3rem_minmax(0,1fr)_auto]"
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#111114] font-[Bricolage_Grotesque] text-xl font-black text-white">
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate text-base font-black leading-6 tracking-[-0.015em] text-[#111114]">{artifact.title}</strong>
                          <span className="mt-2 line-clamp-2 block text-sm leading-6 text-[#6B6B70]">
                            {artifact.summary || artifact.content.slice(0, 180)}
                          </span>
                        </span>
                        <span className="h-fit rounded-full border border-[#111114]/10 bg-white px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#6B6B70]">
                          {artifact.studio}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.35rem] border border-dashed border-[#111114]/18 bg-[#F7F3EA]/70 p-8 text-sm leading-7 text-[#6B6B70]">
                    Saved studio outputs will appear here after Chat, Research, Data, Finance, Writing, Image, or Compare results are saved as artifacts.
                  </div>
                )}
              </MotionCard>

              <MotionCard className="!rounded-[1.65rem] !border-[#111114]/10 !bg-[#111114] !p-6 text-white !shadow-[0_24px_80px_rgba(17,17,20,0.22)]">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-white/46">Saved by studio</div>
                    <h2 className="mt-3 font-[Bricolage_Grotesque] text-3xl font-black leading-[1.08] tracking-[-0.045em]">Artifact mix.</h2>
                  </div>
                  <ArchiveGlyph />
                </div>

                {Object.entries(artifactStudioCounts).length ? (
                  <div className="grid gap-3">
                    {Object.entries(artifactStudioCounts).map(([studio, count]) => (
                      <div key={studio} className="rounded-[1.15rem] border border-white/10 bg-white/8 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="capitalize text-sm font-bold text-white/76">{studio}</span>
                          <strong className="font-[Bricolage_Grotesque] text-2xl font-black">{count}</strong>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[#E55613]" style={{ width: `${Math.min(100, Math.max(18, count * 18))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.2rem] border border-white/10 bg-white/8 p-5 text-sm leading-6 text-white/56">
                    The mix chart fills as artifacts are saved from each studio.
                  </div>
                )}
              </MotionCard>
            </div>
          </motion.div>

          <motion.aside variants={fadeUp} className="grid content-start gap-5">
            <MotionCard className="relative overflow-visible !rounded-[1.65rem] !border-[#111114]/10 !bg-white/80 !p-6 !shadow-[0_22px_70px_rgba(17,17,20,0.08)]">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#6B6B70]">Core connections</div>
                  <h2 className="mt-3 font-[Bricolage_Grotesque] text-3xl font-black leading-[1.08] tracking-[-0.045em] text-[#111114]">System readiness.</h2>
                </div>
                <ServerGlyph />
              </div>

              <div className="relative grid gap-3">
                {coreProviderItems.map((item) => (
                  <ToolCard
                    key={item.key}
                    icon={item.icon}
                    name={item.name}
                    status={item.status}
                    actionLabel={item.actionLabel}
                    disabled={!item.actionable}
                    onAction={item.onAction}
                    onHoverStart={item.key === "googleCalendar" ? () => setCalendarHover(true) : undefined}
                    onHoverEnd={item.key === "googleCalendar" ? () => setCalendarHover(false) : undefined}
                  />
                ))}

                {calendarPreviewVisible ? (
                  <div className="pointer-events-none absolute right-0 top-[5rem] z-20 w-[320px] rounded-[1.35rem] border border-[#111114]/10 bg-white/96 p-4 shadow-[0_30px_80px_rgba(17,17,20,0.18)] backdrop-blur">
                    <div className="mb-3 flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#6B6B70]">
                      <CalendarGlyph />
                      Agenda preview
                    </div>
                    <div className="space-y-3">
                      {calendarEvents.length ? (
                        calendarEvents.slice(0, 4).map((event) => (
                          <div key={event.id} className="rounded-[1rem] border border-[#111114]/10 bg-[#F7F3EA] px-3 py-3">
                            <strong className="block text-sm text-[#111114]">{event.title}</strong>
                            <span className="mt-1 block text-xs text-[#6B6B70]">{new Date(event.startsAt).toLocaleString()}</span>
                            <span className="mt-1 block text-xs text-[#8A8780]">{event.location || "No location"}</span>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[1rem] border border-dashed border-[#111114]/18 bg-[#F7F3EA] px-4 py-6 text-sm text-[#6B6B70]">
                          Calendar is connected. Events will appear here once your agenda is available.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </MotionCard>

            <MotionCard className="!rounded-[1.65rem] !border-[#111114]/10 !bg-white/80 !p-6 !shadow-[0_22px_70px_rgba(17,17,20,0.08)]">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#6B6B70]">Knowledge sources</div>
                  <h2 className="mt-3 font-[Bricolage_Grotesque] text-3xl font-black leading-[1.08] tracking-[-0.045em] text-[#111114]">Context intake.</h2>
                </div>
                <NotebookGlyph />
              </div>
              <div className="grid gap-3">
                {contextSourceItems.map((item) => (
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

            <MotionCard className="!rounded-[1.65rem] !border-[#111114]/10 !bg-white/82 !p-6 !shadow-[0_22px_70px_rgba(17,17,20,0.08)]">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#6B6B70]">Reminders</div>
                  <h2 className="mt-3 font-[Bricolage_Grotesque] text-3xl font-black leading-[1.08] tracking-[-0.045em] text-[#111114]">Today rail.</h2>
                </div>
                <div className="flex h-12 min-w-12 items-center justify-center rounded-[1rem] bg-[#111114] px-3 font-[Bricolage_Grotesque] text-2xl font-black text-white">
                  {reminders.length}
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-[#111114]/10 bg-[#F7F3EA]/80 p-3">
                <input
                  value={newReminderTitle}
                  onChange={(event) => setNewReminderTitle(event.target.value)}
                  placeholder="Add a reminder"
                  className="w-full rounded-[0.95rem] border border-[#111114]/10 bg-white px-4 py-3 text-sm text-[#111114] outline-none transition focus:border-[#E55613] focus:ring-2 focus:ring-[#E55613]/10"
                />
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={newReminderDueAt}
                    onChange={(event) => setNewReminderDueAt(event.target.value)}
                    className="min-w-0 flex-1 rounded-[0.95rem] border border-[#111114]/10 bg-white px-3 py-3 text-[13px] text-[#111114] outline-none transition focus:border-[#E55613] focus:ring-2 focus:ring-[#E55613]/10"
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddReminder()}
                    disabled={!newReminderTitle.trim() || !newReminderDueAt || reminderSaving}
                    className="inline-flex shrink-0 items-center justify-center rounded-[0.9rem] bg-[#111114] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#E55613] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-[#111114]"
                  >
                    Add
                  </button>
                </div>
              </div>

              {reminders.length ? (
                <div className="mt-4 grid gap-3">
                  {reminders.map((reminder) => (
                    <div key={reminder.id} className="rounded-[1.2rem] border border-[#111114]/10 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <strong className="text-sm text-[#111114]">{reminder.title}</strong>
                        <button
                          type="button"
                          onClick={() => void handleDeleteReminder(reminder.id)}
                          disabled={reminderDeletingId === reminder.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[0.8rem] border border-[#111114]/10 bg-white text-[#6B6B70] transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Delete ${reminder.title}`}
                        >
                          <TrashGlyph />
                        </button>
                      </div>
                      {reminder.note ? <p className="mt-2 text-sm leading-6 text-[#6B6B70]">{reminder.note}</p> : null}
                      <div className="mt-3 flex items-center justify-between gap-3 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#8A8780]">
                        <span>{new Date(reminder.due_at).toLocaleString()}</span>
                        <span>{reminder.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1.2rem] border border-dashed border-[#111114]/18 bg-white/70 p-5 text-sm leading-6 text-[#6B6B70]">
                  No reminders yet. Add one above to keep a follow-up visible on the dashboard.
                </div>
              )}
            </MotionCard>
          </motion.aside>
        </div>
      </div>
    </motion.div>
  );
}
