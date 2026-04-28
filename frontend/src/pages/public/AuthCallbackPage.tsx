import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) {
      navigate("/login", { replace: true });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace("#", "?"));
      const type = params.get("type") ?? hash.get("type");

      if (type === "recovery") {
        navigate("/reset-password", { replace: true });
      } else if (session) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-violet-600" />
    </div>
  );
}
