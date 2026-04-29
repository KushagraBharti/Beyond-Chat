import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const heading = "'Urbanist', sans-serif";
const mono = "'IBM Plex Mono', monospace";

const c = {
  deep: "#0C0F1A",
  surface: "#131728",
  text: "#E8E6F0",
  muted: "#6B6A80",
  pink: "#FF006E",
  orange: "#FF6B35",
  cyan: "#00D4FF",
  violet: "#8B5CF6",
};

const spectrum = `linear-gradient(90deg, ${c.pink}, ${c.orange}, ${c.cyan})`;

export default function WavelengthLogin() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: c.deep, color: c.text, fontFamily: heading, display: "flex", position: "relative" }}>
      {/* Ambient glows */}
      <div style={{ position: "fixed", top: "10%", left: "20%", width: "40%", height: "40%", background: `radial-gradient(ellipse, ${c.pink}06 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "10%", right: "15%", width: "35%", height: "35%", background: `radial-gradient(ellipse, ${c.cyan}05 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      {/* Left — visual panel */}
      <div className="wavelength-left-panel" style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "2.5rem", position: "relative", overflow: "hidden", minHeight: "100vh",
        borderRight: "1px solid #1e2235",
      }}>
        {/* Background waveform */}
        <svg style={{ position: "absolute", bottom: "15%", left: 0, right: 0, opacity: 0.15 }} width="100%" height="200" viewBox="0 0 600 200" fill="none" preserveAspectRatio="none">
          <defs>
            <linearGradient id="login-wave" x1="0" y1="0" x2="600" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={c.pink} />
              <stop offset="50%" stopColor={c.orange} />
              <stop offset="100%" stopColor={c.cyan} />
            </linearGradient>
          </defs>
          <path d="M0 100 Q75 30, 150 100 T300 100 T450 100 T600 100" stroke="url(#login-wave)" strokeWidth="2" fill="none" />
          <path d="M0 100 Q75 170, 150 100 T300 100 T450 100 T600 100" stroke="url(#login-wave)" strokeWidth="1.5" fill="none" opacity="0.5" />
          <path d="M0 100 Q75 50, 150 100 T300 100 T450 100 T600 100" stroke="url(#login-wave)" strokeWidth="1" fill="none" opacity="0.3" />
        </svg>

        <Link to="/wavelength" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem", position: "relative", zIndex: 2 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="8" width="3" height="8" rx="1.5" fill={c.pink} />
            <rect x="7" y="4" width="3" height="16" rx="1.5" fill={c.orange} />
            <rect x="12" y="6" width="3" height="12" rx="1.5" fill={c.cyan} />
            <rect x="17" y="9" width="3" height="6" rx="1.5" fill={c.violet} />
          </svg>
          <span style={{ fontFamily: heading, fontSize: "1.1rem", fontWeight: 700, color: c.text }}>Wavelength</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ position: "relative", zIndex: 2 }}>
          <h1 style={{ fontFamily: heading, fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "1rem" }}>
            Tune into{" "}
            <span style={{ background: spectrum, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              your signal
            </span>
          </h1>
          <p style={{ fontFamily: mono, fontSize: "0.82rem", color: c.muted, lineHeight: 1.7, maxWidth: "340px" }}>
            Six studios. Every major AI model. One artifact library.
            Sign in to start creating.
          </p>
        </motion.div>

        <span style={{ fontFamily: mono, fontSize: "0.65rem", color: "#2a2e42", position: "relative", zIndex: 2 }}>
          beyond chat — wavelength
        </span>

        <style>{`
          @media (max-width: 768px) {
            .wavelength-left-panel { display: none !important; }
          }
        `}</style>
      </div>

      {/* Right — form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "3rem", position: "relative", zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{ width: "100%", maxWidth: "380px" }}
        >
          <div style={{ fontFamily: mono, fontSize: "0.65rem", color: c.muted, letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            // {isSignUp ? "create account" : "sign in"}
          </div>
          <h2 style={{ fontFamily: heading, fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "2rem" }}>
            {isSignUp ? "Get started" : "Welcome back"}
          </h2>

          {/* Social */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.75rem" }}>
            {["Google", "GitHub"].map((provider) => (
              <button
                key={provider}
                style={{
                  fontFamily: heading, fontSize: "0.88rem", fontWeight: 500, color: c.text,
                  background: c.surface, border: "1px solid #1e2235", borderRadius: "10px",
                  padding: "0.8rem", cursor: "pointer", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${c.cyan}40`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e2235"; }}
              >
                Continue with {provider}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem" }}>
            <div style={{ flex: 1, height: "1px", background: "#1e2235" }} />
            <span style={{ fontFamily: mono, fontSize: "0.65rem", color: c.muted }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "#1e2235" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ fontFamily: mono, fontSize: "0.68rem", color: c.muted, display: "block", marginBottom: "0.35rem" }}>email</label>
              <input
                type="email"
                placeholder="you@company.com"
                style={{
                  width: "100%", fontFamily: mono, fontSize: "0.85rem", padding: "0.8rem 1rem",
                  border: "1px solid #1e2235", borderRadius: "10px", background: c.surface,
                  color: c.text, outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = `${c.cyan}60`}
                onBlur={(e) => e.currentTarget.style.borderColor = "#1e2235"}
              />
            </div>
            <div>
              <label style={{ fontFamily: mono, fontSize: "0.68rem", color: c.muted, display: "block", marginBottom: "0.35rem" }}>password</label>
              <input
                type="password"
                placeholder="••••••••"
                style={{
                  width: "100%", fontFamily: mono, fontSize: "0.85rem", padding: "0.8rem 1rem",
                  border: "1px solid #1e2235", borderRadius: "10px", background: c.surface,
                  color: c.text, outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = `${c.cyan}60`}
                onBlur={(e) => e.currentTarget.style.borderColor = "#1e2235"}
              />
            </div>
          </div>

          <button style={{
            width: "100%", fontFamily: heading, fontSize: "0.9rem", fontWeight: 700,
            color: c.deep, background: spectrum, border: "none", borderRadius: "10px",
            padding: "0.85rem", cursor: "pointer",
          }}>
            {isSignUp ? "Create account" : "Sign in"}
          </button>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                fontFamily: mono, fontSize: "0.75rem", color: c.muted, background: "none",
                border: "none", cursor: "pointer",
              }}
            >
              {isSignUp ? "already have an account?" : "need an account?"}
              <span style={{ color: c.cyan, marginLeft: "0.3rem" }}>→</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
