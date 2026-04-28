import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function BillingSuccessPage() {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          navigate("/dashboard", { replace: true });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F2F2F0" }}>
      <div style={{ textAlign: "center", padding: "3rem", background: "#fff", borderRadius: "24px", boxShadow: "0 10px 40px rgba(0,0,0,0.06)", maxWidth: "400px", width: "100%" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#4F3FE8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "1.75rem", fontWeight: 800, color: "#0D0D0D", marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>
          You're on Pro!
        </h1>
        <p style={{ color: "#6B6B70", marginBottom: "2rem", lineHeight: 1.6 }}>
          Your subscription is active. Redirecting to your dashboard in {seconds}…
        </p>
        <button
          onClick={() => navigate("/dashboard", { replace: true })}
          style={{ background: "#4F3FE8", color: "#fff", border: "none", padding: "0.75rem 2rem", borderRadius: "99px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
