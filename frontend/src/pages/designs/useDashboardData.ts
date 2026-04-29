import { useEffect, useState } from "react";
import {
  getCalendarEvents,
  getProviderStatuses,
  getReminders,
  getWorkspace,
  type ProviderRecord,
  type Reminder,
} from "../../lib/api";

export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  location: string;
}

export interface DashboardData {
  workspaceName: string;
  reminders: Reminder[];
  calendarEvents: CalendarEvent[];
  providers: Record<string, ProviderRecord>;
  loaded: boolean;
  error: string | null;
}

export function useDashboardData(): DashboardData {
  const [workspaceName, setWorkspaceName] = useState("Beyond Chat");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [providers, setProviders] = useState<Record<string, ProviderRecord>>({});
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    void getWorkspace()
      .then((r) => {
        if (!active) return;
        setWorkspaceName(r.workspace.name);
        setLoaded(true);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
        setLoaded(true);
      });

    void getReminders()
      .then((r) => active && setReminders(Array.isArray(r?.items) ? r.items : []))
      .catch(() => active && setReminders([]));

    void getProviderStatuses()
      .then((r) => active && setProviders(r?.providers ?? {}))
      .catch(() => active && setProviders({}));

    void getCalendarEvents()
      .then((r) => active && setCalendarEvents(Array.isArray(r?.items) ? r.items : []))
      .catch(() => active && setCalendarEvents([]));

    return () => {
      active = false;
    };
  }, []);

  return { workspaceName, reminders, calendarEvents, providers, loaded, error };
}

export const STUDIOS = [
  { key: "chat", label: "Chat", path: "/chat", blurb: "Threaded reasoning with model comparison." },
  { key: "writing", label: "Writing", path: "/writing", blurb: "Long-form drafting, editing, publishing." },
  { key: "research", label: "Research", path: "/research", blurb: "Evidence-gathering across sources." },
  { key: "image", label: "Image", path: "/image", blurb: "Generative and reference imagery." },
  { key: "data", label: "Data", path: "/data", blurb: "Structured analysis and inference." },
  { key: "finance", label: "Finance", path: "/finance", blurb: "Models, statements, valuations." },
  { key: "artifacts", label: "Artifacts", path: "/artifacts", blurb: "Your saved work, organized." },
  { key: "settings", label: "Settings", path: "/settings", blurb: "Workspace, providers, keys." },
] as const;
