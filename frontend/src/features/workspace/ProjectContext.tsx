import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { listProjects, type ProjectSummary } from "./api";

/**
 * Organization-scoped project selection. The selected project is remembered
 * per organization (sessionStorage) and is always re-validated against the
 * server-returned project list: a stale or cross-organization selection falls
 * back to the first accessible project. Switching organization
 * invalidates everything automatically because the storage key and reload key
 * both derive from the server session's organization ID.
 */

interface ProjectContextValue {
  projects: ProjectSummary[];
  status: "loading" | "ready" | "error" | "unauthenticated";
  message: string | null;
  currentProject: ProjectSummary | null;
  selectProject: (projectId: string | null) => void;
  reload: () => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  projects: [],
  status: "loading",
  message: null,
  currentProject: null,
  selectProject: () => undefined,
  reload: () => undefined,
});

function storageKey(organizationId: string) {
  return `beyond.project-selection.${organizationId}`;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const organizationId = session?.organizationId ?? null;
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [status, setStatus] = useState<ProjectContextValue["status"]>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const generation = useRef(0);

  const reload = useCallback(() => {
    if (!organizationId) {
      setStatus("unauthenticated");
      setProjects([]);
      setSelectedId(null);
      return;
    }
    const ticket = ++generation.current;
    setStatus("loading");
    listProjects().then(
      ({ items }) => {
        if (generation.current !== ticket) return;
        setProjects(items);
        setStatus("ready");
        setMessage(null);
        const remembered = sessionStorage.getItem(storageKey(organizationId));
        if (remembered && items.some((project) => project.id === remembered)) {
          setSelectedId(remembered);
        } else if (items.length > 0) {
          const fallbackId = items[0].id;
          sessionStorage.setItem(storageKey(organizationId), fallbackId);
          setSelectedId(fallbackId);
        } else {
          sessionStorage.removeItem(storageKey(organizationId));
          setSelectedId(null);
        }
      },
      (cause: unknown) => {
        if (generation.current !== ticket) return;
        setStatus("error");
        setProjects([]);
        setSelectedId(null);
        setMessage(cause instanceof Error ? cause.message : "Projects could not be loaded.");
      },
    );
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;
    // Deferred so the effect body never sets state synchronously.
    queueMicrotask(() => {
      if (!cancelled) reload();
    });
    return () => {
      cancelled = true;
      generation.current += 1;
    };
  }, [reload]);

  const selectProject = useCallback(
    (projectId: string | null) => {
      if (!organizationId) return;
      if (projectId === null) {
        sessionStorage.removeItem(storageKey(organizationId));
        setSelectedId(null);
        return;
      }
      if (!projects.some((project) => project.id === projectId)) return;
      sessionStorage.setItem(storageKey(organizationId), projectId);
      setSelectedId(projectId);
    },
    [organizationId, projects],
  );

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      status,
      message,
      currentProject: projects.find((project) => project.id === selectedId) ?? null,
      selectProject,
      reload,
    }),
    [projects, status, message, selectedId, selectProject, reload],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook and provider form one context module
export function useProjects(): ProjectContextValue {
  return useContext(ProjectContext);
}
