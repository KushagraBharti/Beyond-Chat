import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { bootstrapAuth } from "../../lib/api";
import { isSupabaseEnabled, supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { session, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const mode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("mode") === "signup" ? "signup" : "signin";
  }, [location.search]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !session) {
      return;
    }
    navigate("/dashboard", { replace: true });
  }, [authLoading, navigate, session]);

  if (authLoading || session) {
    return null;
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

      if (mode === "signup" && password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      if (!supabase) {
        setError("Supabase is not configured for this environment.");
        return;
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          throw signUpError;
        }

        if (data.session) {
          await bootstrapAuth();
          setMessage("Account created and workspace provisioned.");
          navigate("/dashboard", { replace: true });
        } else {
          setMessage("Account created. Confirm the email if required, then sign in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          throw signInError;
        }

        await bootstrapAuth();
        setMessage("Signed in successfully. Workspace restored.");
        navigate("/dashboard", { replace: true });
      }
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-stone-950 px-10 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,63,232,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(229,86,19,0.18),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:42px_42px]" />

          <div className="relative z-10 mx-auto flex min-h-screen max-w-[38rem] flex-col px-4 pb-14 pt-12">
            <Link to="/" className="inline-flex items-center gap-3 self-start">
              <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-orange-500 p-[2px]">
                <span className="block h-full w-full rounded-[6px] bg-stone-950 p-[5px]">
                  <span className="block h-full w-full rounded-[3px] bg-stone-100" />
                </span>
              </span>
              <span className="font-[Bricolage_Grotesque] text-xl font-extrabold tracking-[-0.04em] text-stone-50">Beyond Chat</span>
            </Link>

            <div className="mt-16">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-stone-400">Studio Workspace</p>

              <div style={{ marginTop: "2.5rem" }}>
                <h1 className="max-w-[30rem] font-[Bricolage_Grotesque] text-[3.35rem] font-extrabold leading-[0.93] tracking-[-0.065em] text-stone-50">
                  Artifacts, not endless transcripts.
                </h1>
              </div>

              <div style={{ marginTop: "2.25rem" }}>
                <p className="max-w-[31rem] text-[1rem] leading-8 text-stone-300">
                  Beyond Chat organizes writing, research, image, data, and finance work into focused studios with reusable context and shared model comparison.
                </p>
              </div>

              <div style={{ marginTop: "2.75rem" }} className="grid gap-4 sm:grid-cols-2">
                {[
                  "Dedicated studios for distinct workflows",
                  "Supabase-backed auth, data, and storage",
                  "Saved artifacts that survive across sessions",
                  "Compare panel shared across the workspace",
                ].map((item) => (
                  <div key={item} className="rounded-[1.65rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
                    <div className="mb-4 h-2 w-14 rounded-full bg-gradient-to-r from-violet-400 to-orange-400" />
                    <p className="text-sm leading-6 text-stone-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen justify-center px-6 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center">
            <div className="w-full rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_30px_80px_rgba(28,25,23,0.08)]">
              <Link to="/" className="mb-8 inline-flex items-center gap-3 lg:hidden">
                <span className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-600 to-orange-500" />
                <span className="font-[Bricolage_Grotesque] text-lg font-extrabold">Beyond Chat</span>
              </Link>

              <div className="space-y-2">
                <h1 className="font-[Bricolage_Grotesque] text-4xl font-extrabold tracking-[-0.05em] text-stone-950">
                  {mode === "signup" ? "Create your account" : "Welcome back"}
                </h1>
                <p className="text-sm leading-6 text-stone-600">
                  {mode === "signup"
                    ? "Create an account to enter your studio workspace."
                    : "Sign in to reopen your workspace, artifacts, and recent runs."}
                </p>
                {!isSupabaseEnabled ? (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Supabase is required for this app. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.
                  </p>
                ) : null}
              </div>

              <form
                className="mt-8 space-y-5"
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
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                  />
                </label>

                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-stone-800">Password</span>
                    <input
                      type="password"
                      placeholder="........"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </label>

                  {mode === "signin" && (
                    <div className="flex justify-end">
                      <Link
                        to="/forgot-password"
                        className="text-sm font-semibold text-violet-700 hover:text-violet-900"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  )}

                  {mode === "signup" ? (
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-stone-800">Retype password</span>
                      <input
                        type="password"
                        placeholder="........"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      />
                    </label>
                  ) : null}
                </div>

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
              </form>

              <p className="text-center text-sm text-stone-600" style={{ marginTop: "2.1rem" }}>
                {mode === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold text-violet-700 hover:text-violet-900">
                      Sign in
                    </Link>
                  </>
                ) : (
                  <>
                    Need an account?{" "}
                    <Link to="/signup" className="font-semibold text-violet-700 hover:text-violet-900">
                      Sign up
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
