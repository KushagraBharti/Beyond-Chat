import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { workOSLoginUrl } from "../../lib/sessionClient";

export default function ForgotPasswordPage() {
  const { available, error } = useAuth();
  return <main className="reset-password-page forgot-password-page"><div className="reset-password-grid" aria-hidden="true" /><section className="reset-password-brand"><Link to="/" className="reset-password-logo"><span className="reset-password-logo-mark"><span /></span><span>Beyond</span></Link><div className="reset-password-brand-copy"><span>Account recovery</span><h1>Recover access at the identity boundary.</h1><p>WorkOS owns password recovery, verification, and enterprise sign-in policy for your organization.</p></div></section><section className="reset-password-panel"><div className="reset-password-card"><div className="reset-password-card-header"><span className="reset-password-kicker">Password help</span><h2>Open secure sign-in</h2><p>Choose the password recovery option on the hosted WorkOS sign-in screen.</p></div>{!available ? <p className="reset-password-alert">{error ?? "WorkOS authentication is not configured."}</p> : null}<button type="button" className="reset-password-submit" disabled={!available} onClick={() => window.location.assign(workOSLoginUrl({ returnTo: "/home", screenHint: "sign-in" }))}>Continue to WorkOS</button><div className="reset-password-footer"><Link to="/login">Back to sign in</Link><span>Managed by WorkOS AuthKit</span></div></div></section></main>;
}
