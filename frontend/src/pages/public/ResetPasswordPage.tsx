import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordScore = useMemo(() => {
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];

    return checks.filter(Boolean).length;
  }, [password]);

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!password || !confirm) {
      setError("Please fill in both fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      await supabase.auth.signOut();
      window.setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="reset-password-page">
      <div className="reset-password-grid" aria-hidden="true" />

      <section className="reset-password-brand" aria-label="Beyond Chat password reset">
        <Link to="/" className="reset-password-logo" aria-label="Beyond Chat home">
          <span className="reset-password-logo-mark">
            <span />
          </span>
          <span>Beyond Chat</span>
        </Link>

        <div className="reset-password-visual">
          <div className="reset-password-keyline" />
          <div className="reset-password-cipher">
            <span>BC</span>
          </div>
          <div className="reset-password-path path-one" />
          <div className="reset-password-path path-two" />
          <div className="reset-password-node node-one">
            <KeyIcon />
          </div>
          <div className="reset-password-node node-two">
            <ShieldIcon />
          </div>
          <div className="reset-password-node node-three">
            <CheckIcon />
          </div>
        </div>

        <div className="reset-password-brand-copy">
          <span>Secure handoff</span>
          <h1>Set a new workspace key.</h1>
          <p>Refresh your password and return to a clean, protected Beyond Chat session.</p>
        </div>
      </section>

      <section className="reset-password-panel" aria-label="Reset password form">
        <div className="reset-password-card">
          <div className="reset-password-card-header">
            <span className="reset-password-kicker">Account recovery</span>
            <h2>{done ? "Password updated" : "Create your new password"}</h2>
            <p>{done ? "You are being redirected to sign in." : "Use at least 8 characters. A mix of letters, numbers, and symbols is strongest."}</p>
          </div>

          {done ? (
            <div className="reset-password-success" role="status">
              <span>
                <CheckIcon />
              </span>
              <div>
                <strong>All set.</strong>
                <p>Your password was updated and the current session was closed.</p>
              </div>
            </div>
          ) : (
            <form className="reset-password-form" onSubmit={(event) => void handleReset(event)}>
              <label>
                <span>New password</span>
                <div className="reset-password-input">
                  <LockIcon />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter a new password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    <EyeIcon />
                  </button>
                </div>
              </label>

              <label>
                <span>Confirm password</span>
                <div className="reset-password-input">
                  <LockIcon />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Retype the new password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    required
                  />
                </div>
              </label>

              <div className="reset-password-strength" aria-label="Password strength">
                <div>
                  {[0, 1, 2, 3].map((step) => (
                    <span key={step} className={passwordScore > step ? "is-active" : ""} />
                  ))}
                </div>
                <p>{password ? ["Very weak", "Getting there", "Solid", "Strong"][Math.max(passwordScore - 1, 0)] : "Strength appears as you type"}</p>
              </div>

              {error ? <p className="reset-password-alert">{error}</p> : null}

              <button type="submit" className="reset-password-submit" disabled={loading}>
                {loading ? "Updating password..." : "Update password"}
                <ArrowIcon />
              </button>
            </form>
          )}

          <div className="reset-password-footer">
            <Link to="/login">Back to sign in</Link>
            <span>Protected by Supabase Auth</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>;
}

function EyeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-5 9.5-5 9.5 5 9.5 5-3.3 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
}

function KeyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="4" /><path d="m11 11 9 9" /><path d="m16 16 2-2" /><path d="m18 18 2-2" /></svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10h10v9H7v-9Z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></svg>;
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3Z" /></svg>;
}
