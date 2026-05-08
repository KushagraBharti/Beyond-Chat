import { Link, useLocation, useNavigate } from "react-router-dom";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { bootstrapAuth } from "../../lib/api";
import { isSupabaseEnabled, supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

type OAuthProvider = "google" | "apple";

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
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !session) {
      return;
    }
    if (window.sessionStorage.getItem("upgrade_intent") === "1") {
      navigate("/pricing", { replace: true });
      return;
    }
    navigate("/dashboard", { replace: true });
  }, [authLoading, navigate, session]);

  if (authLoading || session) {
    return null;
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Supabase is not configured for this environment.");
      return;
    }

    setOauthLoading(provider);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setOauthLoading(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) {
          throw signUpError;
        }

        if (data.session) {
          await bootstrapAuth();
          setMessage("Account created and workspace provisioned.");
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
      }
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <main className="auth-mockup">
      <section className="auth-visual" aria-label="Beyond Chat studio workspace">
        <div className="auth-visual-grid" />
        <div className="auth-brand">
          <Link to="/" className="auth-brand-logo" aria-label="Beyond Chat home">
            <span className="auth-logo-mark">
              <span />
            </span>
            <span>
              <strong>Beyond Chat</strong>
              <small>Studio Workspace</small>
            </span>
          </Link>
        </div>

        <div className="auth-copy">
          <h1>
            Artifacts,
            <br />
            not endless
            <br />
            <span>transcripts.</span>
          </h1>
          <p>Your modular AI workspace for writing, research, image, data, finance, and more. Built for focused work. Designed for impact.</p>
        </div>

      </section>

      <section className="auth-panel" aria-label={isSignup ? "Create your Beyond Chat account" : "Sign in to Beyond Chat"}>
        <div className="auth-panel-lines" />
        <div className="auth-dot-field top" />
        <div className="auth-dot-field bottom" />

        <div className="auth-card-shell">
          <div className="auth-card">
            <div className="auth-card-header">
              <h2>{isSignup ? "Create your account" : "Welcome back"} {isSignup ? "\u2728" : "\u{1F44B}"}</h2>
              <p>{isSignup ? "Start your Beyond Chat workspace" : "Sign in to your Beyond Chat workspace"}</p>
            </div>

            <div className="auth-social-row">
              <button type="button" onClick={() => void handleOAuth("google")} disabled={oauthLoading !== null || !isSupabaseEnabled}>
                <GoogleIcon />
                {oauthLoading === "google" ? "Opening Google..." : "Continue with Google"}
              </button>
              <button type="button" onClick={() => void handleOAuth("apple")} disabled={oauthLoading !== null || !isSupabaseEnabled}>
                <AppleIcon />
                {oauthLoading === "apple" ? "Opening Apple..." : "Continue with Apple"}
              </button>
            </div>

            <div className="auth-divider">
              <span />
              <em>or</em>
              <span />
            </div>

            {!isSupabaseEnabled ? (
              <p className="auth-alert warning">Supabase is required. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.</p>
            ) : null}

            <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
              <label>
                <span>Email</span>
                <div className="auth-input-wrap">
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

              <label>
                <span className="auth-label-row">
                  Password
                  {!isSignup ? <Link to="/forgot-password">Forgot password?</Link> : null}
                </span>
                <div className="auth-input-wrap">
                  <LockIcon />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowPassword((current) => !current)} aria-label="Toggle password visibility">
                    <EyeIcon />
                  </button>
                </div>
              </label>

              {isSignup ? (
                <label>
                  <span>Retype password</span>
                  <div className="auth-input-wrap">
                    <LockIcon />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />
                  </div>
                </label>
              ) : null}

              {error ? <p className="auth-alert error">{error}</p> : null}
              {message ? <p className="auth-alert success">{message}</p> : null}

              <button type="submit" className="auth-submit" disabled={loading || !isSupabaseEnabled}>
                {loading ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
              </button>

              {!isSignup ? (
                <div className="auth-options">
                  <label className="auth-check">
                    <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                    <span />
                    Remember me
                  </label>
                </div>
              ) : null}
            </form>
          </div>

          <p className="auth-switch">
            {isSignup ? (
              <>
                Already have an account? <Link to="/login">Sign in <ArrowIcon /></Link>
              </>
            ) : (
              <>
                New to Beyond Chat? <Link to="/signup">Create an account <ArrowIcon /></Link>
              </>
            )}
          </p>

          <p className="auth-terms">
            <LockTinyIcon />
            By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h6c-.3 1.2-1 2.3-2 3v2.5h3.2c1.9-1.7 3.4-4.4 3.4-7.3Z" />
      <path fill="#34A853" d="M12 23c2.7 0 5-.9 6.7-2.5L15.5 18c-.9.6-2 .9-3.5.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 20.7 8.2 23 12 23Z" />
      <path fill="#FBBC05" d="M6.4 14.8a6.5 6.5 0 0 1 0-4.2V8H3.1a11 11 0 0 0 0 9.8l3.3-3Z" />
      <path fill="#EA4335" d="M12 5.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 12 1 11 11 0 0 0 3.1 8l3.3 2.6C7.2 6.9 9.4 5.1 12 5.1Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M17.4 12.4c0-2.7 2.2-4 2.3-4.1-1.3-1.8-3.2-2.1-3.8-2.1-1.6-.2-3.1 1-4 1s-2.2-1-3.6-.9c-1.8 0-3.4 1-4.4 2.6-1.9 3.4-.5 8.3 1.4 11 .9 1.3 2 2.8 3.4 2.7 1.4-.1 1.9-.9 3.6-.9s2.1.9 3.6.9c1.5 0 2.4-1.3 3.3-2.6 1-1.5 1.5-2.9 1.5-3-.1 0-2.9-1.1-2.9-4.6ZM14.9 4.5c.8-.9 1.3-2.2 1.1-3.5-1.1 0-2.4.7-3.2 1.6-.7.8-1.3 2.1-1.1 3.4 1.2.1 2.4-.6 3.2-1.5Z" />
    </svg>
  );
}

function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h16v9H4v-9Z" /><path d="m4.8 8.3 7.2 5 7.2-5" /></svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10h10v9H7v-9Z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></svg>;
}

function EyeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-5 9.5-5 9.5 5 9.5 5-3.3 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
}

function LockTinyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M6 10h12v10H6z" /></svg>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
}
