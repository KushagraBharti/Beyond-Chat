import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { workOSLoginUrl } from "../../lib/sessionClient";

export default function LoginPage() {
  const { session, loading, available, error, refreshSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isSignup = params.get("mode") === "signup";
  const invitationToken = params.get("invitationToken") ?? undefined;
  const requestedPath = (location.state as { from?: string } | null)?.from;
  const returnTo = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/home";

  useEffect(() => {
    if (!loading && session) navigate(returnTo, { replace: true });
  }, [loading, navigate, returnTo, session]);

  function continueWithWorkOS() {
    if (!available) return;
    setRedirecting(true);
    window.location.assign(workOSLoginUrl({
      returnTo,
      screenHint: isSignup ? "sign-up" : "sign-in",
      invitationToken,
    }));
  }

  if (loading || session) {
    return <main className="auth-mockup"><section className="auth-panel"><div className="auth-card"><p className="auth-alert success">Checking your secure session...</p></div></section></main>;
  }

  return (
    <main className="auth-mockup">
      <section className="auth-visual" aria-label="Beyond organization workspace">
        <div className="auth-visual-grid" />
        <div className="auth-brand"><Link to="/" className="auth-brand-logo"><span className="auth-logo-mark"><span /></span><span><strong>Beyond</strong><small>Organization workspace</small></span></Link></div>
        <div className="auth-copy"><h1>Durable work for <span>your whole team.</span></h1><p>Sign in through the organization identity boundary. Sessions, memberships, and access changes are verified by the server.</p></div>
      </section>
      <section className="auth-panel" aria-label={isSignup ? "Create a Beyond account" : "Sign in to Beyond"}>
        <div className="auth-panel-lines" />
        <div className="auth-card-shell">
          <div className="auth-card">
            <div className="auth-card-header"><h2>{isSignup ? "Create your account" : "Welcome back"}</h2><p>{invitationToken ? "Accept your organization invitation through WorkOS." : "Continue to the secure WorkOS sign-in experience."}</p></div>
            {!available ? <p className="auth-alert warning">{error ?? "WorkOS authentication is not configured for this environment."} Add the backend WorkOS credentials and dashboard URLs before enabling sign-in.</p> : null}
            <button type="button" className="auth-submit" disabled={!available || redirecting} onClick={continueWithWorkOS}>{redirecting ? "Opening secure sign-in..." : isSignup ? "Continue to create account" : "Continue with WorkOS"}</button>
            {error && available ? <p className="auth-alert error">{error}</p> : null}
            <button type="button" className="auth-submit" disabled={loading} onClick={() => void refreshSession()}>Check session again</button>
          </div>
          <p className="auth-switch">{isSignup ? <>Already have an account? <Link to="/login">Sign in</Link></> : <>New to Beyond? <Link to="/signup">Create an account</Link></>}</p>
          <p className="auth-terms">By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
        </div>
      </section>
    </main>
  );
}
