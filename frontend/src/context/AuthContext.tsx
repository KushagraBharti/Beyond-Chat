import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { bootstrapAuth } from "../lib/api";
import { isMvpBypassSessionActive } from "../lib/mvpBypass";
import { isMvpBypassEnabled, supabase } from "../lib/supabaseClient";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  mvpBypassActive: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  mvpBypassActive: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mvpBypassActive, setMvpBypassActive] = useState(false);

  useEffect(() => {
    const bypassOn = isMvpBypassEnabled && isMvpBypassSessionActive();
    setMvpBypassActive(bypassOn);

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        void bootstrapAuth().catch(() => undefined);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        void bootstrapAuth().catch(() => undefined);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) {
      return;
    }
    void bootstrapAuth().catch(() => {
      // Session bootstrap failures are surfaced by the protected pages that depend on workspace data.
    });
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, mvpBypassActive }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
