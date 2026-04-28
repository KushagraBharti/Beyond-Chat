import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-6">
      <div className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_30px_80px_rgba(28,25,23,0.08)]">
        <Link to="/" className="mb-8 inline-flex items-center gap-3">
          <span className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-600 to-orange-500" />
          <span className="font-[Bricolage_Grotesque] text-lg font-extrabold">Beyond Chat</span>
        </Link>

        <div className="space-y-2">
          <h1 className="font-[Bricolage_Grotesque] text-4xl font-extrabold tracking-[-0.05em] text-stone-950">
            Reset password
          </h1>
          <p className="text-sm leading-6 text-stone-600">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {sent ? (
          <div className="mt-8 space-y-4">
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Check your inbox — a reset link is on its way.
            </p>
            <Link
              to="/login"
              className="block text-center text-sm font-semibold text-stone-600 hover:text-stone-900"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-stone-800">Email address</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </label>

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>

            <Link
              to="/login"
              className="block text-center text-sm font-semibold text-stone-600 hover:text-stone-900"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
