import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    <main className="reset-password-page forgot-password-page">
      <div className="reset-password-grid" aria-hidden="true" />

      <section className="reset-password-brand" aria-label="Beyond Chat account recovery">
        <Link to="/" className="reset-password-logo" aria-label="Beyond Chat home">
          <span className="reset-password-logo-mark">
            <span />
          </span>
          <span>Beyond Chat</span>
        </Link>

        <div className="reset-password-visual">
          <div className="reset-password-keyline" />
          <div className="reset-password-cipher forgot-password-envelope">
            <MailLargeIcon />
          </div>
          <div className="reset-password-path path-one" />
          <div className="reset-password-path path-two" />
          <div className="reset-password-node node-one">
            <MailIcon />
          </div>
          <div className="reset-password-node node-two">
            <ShieldIcon />
          </div>
          <div className="reset-password-node node-three">
            <ArrowIcon />
          </div>
        </div>

        <div className="reset-password-brand-copy">
          <span>Recovery dispatch</span>
          <h1>Send a clean reset link.</h1>
          <p>We will route a secure password reset email to your inbox so you can get back into the workspace.</p>
        </div>
      </section>

      <section className="reset-password-panel" aria-label="Forgot password form">
        <div className="reset-password-card forgot-password-card">
          <div className="reset-password-card-header">
            <span className="reset-password-kicker">Password help</span>
            <h2>{sent ? "Check your inbox" : "Recover access"}</h2>
            <p>{sent ? "A secure reset link is on its way. Keep this tab open or return to sign in." : "Enter the email tied to your Beyond Chat account and we will send the reset link there."}</p>
          </div>

          {sent ? (
            <div className="reset-password-success forgot-password-success" role="status">
              <span>
                <MailIcon />
              </span>
              <div>
                <strong>Reset link sent.</strong>
                <p>Check {email || "your inbox"} for the next step.</p>
              </div>
            </div>
          ) : (
            <form className="reset-password-form forgot-password-form" onSubmit={handleSubmit}>
              <label>
                <span>Email address</span>
                <div className="reset-password-input">
                  <MailIcon />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </label>

              <p className="forgot-password-note">
                The link opens a protected reset screen and expires according to your auth provider settings.
              </p>

              {error ? <p className="reset-password-alert">{error}</p> : null}

              <button type="submit" className="reset-password-submit" disabled={loading}>
                {loading ? "Sending link..." : "Send reset link"}
                <ArrowIcon />
              </button>
            </form>
          )}

          <div className="reset-password-footer">
            <Link to="/login">Back to sign in</Link>
            <span>Delivered by Supabase Auth</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
}

function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h16v9H4v-9Z" /><path d="m4.8 8.3 7.2 5 7.2-5" /></svg>;
}

function MailLargeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h17v11h-17v-11Z" /><path d="m4.3 7.4 7.7 5.4 7.7-5.4" /><path d="m4.3 16.6 5.3-4.2" /><path d="m14.4 12.4 5.3 4.2" /></svg>;
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3Z" /></svg>;
}
