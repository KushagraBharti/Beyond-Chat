import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const providerError = new URLSearchParams(window.location.search).get("error");
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (providerError) {
      return;
    }
    void refreshSession().then((session) => {
      if (session) navigate("/home", { replace: true });
      else setSessionError("The sign-in callback did not create a valid session.");
    });
  }, [navigate, providerError, refreshSession]);

  const error = providerError ?? sessionError;

  return <main className="reset-password-page"><section className="reset-password-panel"><div className="reset-password-card"><div className="reset-password-card-header"><span className="reset-password-kicker">Secure handoff</span><h2>{error ? "Sign-in could not finish" : "Finishing sign-in"}</h2><p>{error ?? "Verifying the server-managed WorkOS session and organization membership."}</p></div>{error ? <div className="reset-password-footer"><Link to="/login">Return to sign in</Link></div> : null}</div></section></main>;
}
