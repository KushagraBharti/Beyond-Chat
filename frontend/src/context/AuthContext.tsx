import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
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
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, mvpBypassActive }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
