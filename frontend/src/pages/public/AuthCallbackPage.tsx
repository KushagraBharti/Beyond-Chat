import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { bootstrapAuth } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) {
      navigate("/login", { replace: true });
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type = params.get("type") ?? hashParams.get("type");

    if (type === "recovery") {
      navigate("/reset-password", { replace: true });
      return;
    }

    async function finishAuthenticatedRedirect(session: Session) {
      await bootstrapAuth(session.access_token).catch((error) => {
        console.error("Auth callback bootstrap failed", error);
      });
      navigate("/dashboard", { replace: true });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate("/reset-password", { replace: true });
      } else if (session) {
        void finishAuthenticatedRedirect(session);
      } else {
        navigate("/login", { replace: true });
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        void finishAuthenticatedRedirect(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-violet-600" />
    </div>
  );
}
