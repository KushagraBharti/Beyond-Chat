import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, getAuthSession, logoutSession, sessionInvalidEvent, type WorkOSSession } from "../lib/sessionClient";

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata: { role: WorkOSSession["role"]; name?: string; first_name?: string };
}

interface AuthContextValue {
  session: WorkOSSession | null;
  user: AuthUser | null;
  loading: boolean;
  available: boolean;
  error: string | null;
  refreshSession: () => Promise<WorkOSSession | null>;
  signOut: () => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  available: true,
  error: null,
  refreshSession: async () => null,
  signOut: async () => undefined,
  updateProfileName: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<WorkOSSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAuthSession();
      setSession(next);
      setAvailable(true);
      setError(null);
      return next;
    } catch (cause) {
      setSession(null);
      if (cause instanceof ApiError && cause.status === 401) {
        setAvailable(true);
        setError(null);
      } else {
        setAvailable(false);
        setError(cause instanceof Error ? cause.message : "WorkOS authentication is unavailable.");
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
    const invalidate = () => { setSession(null); setError("Your session ended. Sign in again to continue."); };
    window.addEventListener(sessionInvalidEvent, invalidate);
    return () => window.removeEventListener(sessionInvalidEvent, invalidate);
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    await logoutSession();
    setSession(null);
  }, []);

  const updateProfileName = async (name: string) => {
    if (!name.trim()) throw new Error("Name is required.");
    throw new Error("Profile edits are managed by WorkOS and are not enabled in this build.");
  };

  const user = useMemo<AuthUser | null>(() => session ? {
    id: session.profileId,
    email: session.email ?? undefined,
    user_metadata: { role: session.role },
  } : null, [session]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        available,
        error,
        refreshSession,
        signOut,
        updateProfileName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
