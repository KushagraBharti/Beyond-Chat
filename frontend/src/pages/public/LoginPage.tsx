import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { bootstrapAuth } from "../../lib/api";
import { isMvpBypassEnabled, setMvpBypassActive } from "../../lib/mvpBypass";
import { isSupabaseEnabled, supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { session, loading: authLoading, mvpBypassActive } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const mode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("mode") === "signup" ? "signup" : "signin";
  }, [location.search]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || (!session && !mvpBypassActive)) {
      return;
    }
    navigate("/dashboard", { replace: true });
  }, [authLoading, mvpBypassActive, navigate, session]);

  useEffect(() => {
    if (!isMvpBypassEnabled()) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMvpBypassActive(true);
        void bootstrapAuth()
          .then(() => navigate("/dashboard", { replace: true }))
          .catch((error: unknown) =>
            setError(error instanceof Error ? error.message : "Bypass bootstrap failed."),
          );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  if (authLoading || session || mvpBypassActive) {
    return null;
  }

  async function handleBypass() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      setMvpBypassActive(true);
      await bootstrapAuth();
      navigate("/dashboard", { replace: true });
    } catch (e: unknown) {
      setMvpBypassActive(false);
      setError(e instanceof Error ? e.message : "Bypass bootstrap failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (!email || !password) {
        setError("Please enter an email and password.");
        return;
      }

      if (!supabase) {
        setError("Supabase is not configured for this environment.");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.session) {
          await bootstrapAuth();
          setMessage("Account created and workspace provisioned.");
          navigate("/dashboard", { replace: true });
        } else {
          setMessage("Account created. Confirm the email if required, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        await bootstrapAuth();
        setMessage("Signed in successfully. Workspace restored.");
        navigate("/dashboard", { replace: true });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative hidden overflow-hidden bg-stone-950 px-10 py-12 text-stone-50 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.18),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:42px_42px]" />

          <Link to="/" className="relative z-10 flex items-center gap-3">
            <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-rose-500 p-[2px]">
              <span className="block h-full w-full rounded-[6px] bg-stone-950 p-[5px]">
                <span className="block h-full w-full rounded-[3px] bg-stone-100" />
              </span>
            </span>
            <span className="font-[Bricolage_Grotesque] text-xl font-extrabold tracking-[-0.04em]">Beyond Chat</span>
          </Link>

          <div className="relative z-10 max-w-xl space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-400">Studio Workspace</p>
            <h1 className="font-[Bricolage_Grotesque] text-5xl font-extrabold leading-none tracking-[-0.06em]">
              Artifacts, not endless transcripts.
            </h1>
            <p className="max-w-lg text-base text-stone-300">
              Beyond Chat organizes writing, research, image, data, and finance work into focused studios with reusable
              context and shared model comparison.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Dedicated studios for distinct workflows",
                "Supabase-backed auth, data, and storage",
                "Saved artifacts that survive across sessions",
                "Compare panel shared across the workspace",
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="mb-3 h-2 w-14 rounded-full bg-gradient-to-r from-blue-400 to-rose-400" />
                  <p className="text-sm text-stone-200">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="font-[Bricolage_Grotesque] text-xl leading-relaxed">
              “The product now behaves like a real workspace instead of a collection of disconnected surfaces.”
            </p>
            <div className="mt-4 text-sm text-stone-400">Canonical stack: React, Tailwind, FastAPI, Supabase, OpenRouter.</div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_30px_80px_rgba(28,25,23,0.08)]">
            <Link to="/" className="mb-8 inline-flex items-center gap-3 lg:hidden">
              <span className="h-6 w-6 rounded-md bg-gradient-to-br from-blue-500 to-rose-500" />
              <span className="font-[Bricolage_Grotesque] text-lg font-extrabold">Beyond Chat</span>
            </Link>

            <div className="mb-8 space-y-2">
              <h1 className="font-[Bricolage_Grotesque] text-4xl font-extrabold tracking-[-0.05em] text-stone-950">
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </h1>
              <p className="text-sm text-stone-600">
                {mode === "signup"
                  ? "Create an account to enter your studio workspace."
                  : "Sign in to reopen your workspace, artifacts, and recent runs."}
              </p>
              {!isSupabaseEnabled ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Supabase is required for this app. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to continue.
                </p>
              ) : null}
              {isMvpBypassEnabled() ? (
                <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Development bypass is enabled. Press <span className="font-semibold">Ctrl + K</span> or use the bypass button.
                </p>
              ) : null}
            </div>

            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-stone-800">Email</span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-stone-800">Password</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>

              {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
              {message ? (
                <p className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">{message}</p>
              ) : null}

              <button
                type="submit"
                disabled={loading || !isSupabaseEnabled}
                className="w-full rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
              </button>
              {isMvpBypassEnabled() ? (
                <button
                  type="button"
                  onClick={() => void handleBypass()}
                  disabled={loading}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-900 transition hover:-translate-y-0.5 hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Continue with local bypass
                </button>
              ) : null}
            </form>

            <p className="mt-6 text-center text-sm text-stone-600">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold text-blue-700 hover:text-blue-900">
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  Need an account?{" "}
                  <Link to="/login?mode=signup" className="font-semibold text-blue-700 hover:text-blue-900">
                    Sign up
                  </Link>
                </>
              )}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
