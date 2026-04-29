import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { bootstrapAuth } from "../lib/api";
import { supabase } from "../lib/supabaseClient";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  updateProfileName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  updateProfileName: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateProfileName = async (name: string) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Name is required.");
    }

    const firstName = trimmed.split(/\s+/)[0] ?? trimmed;
    const { data, error } = await supabase.auth.updateUser({
      data: {
        name: trimmed,
        first_name: firstName,
      },
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      setSession(data.session);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    setSession(sessionData.session);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        updateProfileName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
