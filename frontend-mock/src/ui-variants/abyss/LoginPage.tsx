import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const mono = "'JetBrains Mono', monospace";
const sans = "'Instrument Sans', sans-serif";
const teal = "#00E5CC";
const violet = "#8B5CF6";

const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

export default function AbyssLogin() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#e0e0e0",
        fontFamily: sans,
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grain */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: noiseTexture, opacity: 0.04, pointerEvents: "none", zIndex: 100, mixBlendMode: "overlay" }} />

      {/* Glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)", width: "600px", height: "600px", background: `radial-gradient(circle, ${teal}05 0%, transparent 60%)`, filter: "blur(60px)" }} />
      </div>

      {/* Left panel — branding */}
      <div
        style={{
          display: "none",
          width: "45%",
          padding: "3rem",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRight: "1px solid #111",
          position: "relative",
          zIndex: 10,
        }}
        className="abyss-left-panel"
      >
        <Link to="/abyss" style={{ fontFamily: mono, fontSize: "0.85rem", fontWeight: 500, color: teal, textDecoration: "none", letterSpacing: "0.05em", opacity: 0.8 }}>
          beyond_chat
        </Link>

        <div>
          {/* Vertical line accent */}
          <div style={{ width: "1px", height: "60px", background: `linear-gradient(to bottom, transparent, ${teal}40)`, marginBottom: "2rem" }} />

          <h2 style={{ fontFamily: mono, fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: "1.5rem" }}>
            <span style={{ color: "#fff" }}>structured</span>
            <br />
            <span style={{ background: `linear-gradient(135deg, ${teal}, ${violet})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              output.
            </span>
            <br />
            <span style={{ color: "#fff" }}>infinite</span>
            <br />
            <span style={{ background: `linear-gradient(135deg, ${violet}, ${teal})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              models.
            </span>
          </h2>

          <p style={{ fontFamily: sans, fontSize: "0.95rem", color: "#444", maxWidth: "300px", lineHeight: 1.7 }}>
            Six studios. One artifact library. Multi-model comparison.
            The workspace built for depth.
          </p>
        </div>

        <p style={{ fontFamily: mono, fontSize: "0.6rem", color: "#222", letterSpacing: "0.1em" }}>
          beyond_chat // v1.0
        </p>
      </div>

      {/* Right — form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{ width: "100%", maxWidth: "380px" }}
        >
          {/* Mobile logo */}
          <Link to="/abyss" className="abyss-mobile-logo" style={{ fontFamily: mono, fontSize: "0.85rem", fontWeight: 500, color: teal, textDecoration: "none", letterSpacing: "0.05em", opacity: 0.8, display: "block", marginBottom: "3rem" }}>
            beyond_chat
          </Link>

          <p style={{ fontFamily: mono, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.4em", color: "#333", marginBottom: "1.5rem" }}>
            // {isSignUp ? "create account" : "authenticate"}
          </p>

          <h1 style={{ fontFamily: mono, fontSize: "1.5rem", fontWeight: 600, color: "#fff", letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
            {isSignUp ? "join" : "welcome back"}
          </h1>
          <p style={{ fontFamily: sans, fontSize: "0.9rem", color: "#444", marginBottom: "2.5rem" }}>
            {isSignUp ? "Create your free workspace." : "Sign in to continue."}
          </p>

          {/* Social */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#181818", marginBottom: "2rem" }}>
            <button style={{ background: "#0a0a0a", border: "none", padding: "0.85rem", fontFamily: mono, fontSize: "0.7rem", color: "#555", cursor: "pointer", letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#999")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              google
            </button>
            <button style={{ background: "#0a0a0a", border: "none", padding: "0.85rem", fontFamily: mono, fontSize: "0.7rem", color: "#555", cursor: "pointer", letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#999")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              github
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
            <div style={{ flex: 1, height: "1px", background: "#181818" }} />
            <span style={{ fontFamily: mono, fontSize: "0.6rem", color: "#333", letterSpacing: "0.1em" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "#181818" }} />
          </div>

          <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {isSignUp && (
              <div>
                <label style={{ fontFamily: mono, fontSize: "0.65rem", color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", display: "block", marginBottom: "0.5rem" }}>name</label>
                <input type="text" placeholder="jane doe" style={{ width: "100%", padding: "0.8rem 0", background: "transparent", border: "none", borderBottom: "1px solid #1a1a1a", fontFamily: sans, fontSize: "0.95rem", color: "#fff", outline: "none", transition: "border-color 0.3s" }}
                  onFocus={(e) => (e.currentTarget.style.borderBottomColor = teal + "60")}
                  onBlur={(e) => (e.currentTarget.style.borderBottomColor = "#1a1a1a")}
                />
              </div>
            )}
            <div>
              <label style={{ fontFamily: mono, fontSize: "0.65rem", color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", display: "block", marginBottom: "0.5rem" }}>email</label>
              <input type="email" placeholder="you@example.com" style={{ width: "100%", padding: "0.8rem 0", background: "transparent", border: "none", borderBottom: "1px solid #1a1a1a", fontFamily: sans, fontSize: "0.95rem", color: "#fff", outline: "none", transition: "border-color 0.3s" }}
                onFocus={(e) => (e.currentTarget.style.borderBottomColor = teal + "60")}
                onBlur={(e) => (e.currentTarget.style.borderBottomColor = "#1a1a1a")}
              />
            </div>
            <div>
              <label style={{ fontFamily: mono, fontSize: "0.65rem", color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", display: "block", marginBottom: "0.5rem" }}>password</label>
              <input type="password" placeholder="••••••••" style={{ width: "100%", padding: "0.8rem 0", background: "transparent", border: "none", borderBottom: "1px solid #1a1a1a", fontFamily: sans, fontSize: "0.95rem", color: "#fff", outline: "none", transition: "border-color 0.3s" }}
                onFocus={(e) => (e.currentTarget.style.borderBottomColor = teal + "60")}
                onBlur={(e) => (e.currentTarget.style.borderBottomColor = "#1a1a1a")}
              />
            </div>

            {!isSignUp && (
              <div style={{ textAlign: "right" }}>
                <button type="button" style={{ background: "none", border: "none", fontFamily: mono, fontSize: "0.7rem", color: teal, cursor: "pointer", opacity: 0.5, letterSpacing: "0.05em" }}>
                  forgot?
                </button>
              </div>
            )}

            <button
              type="submit"
              style={{
                marginTop: "0.75rem",
                padding: "0.85rem",
                background: teal,
                color: "#000",
                border: "none",
                borderRadius: "2px",
                fontFamily: mono,
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.05em",
                boxShadow: `0 0 20px ${teal}20`,
                transition: "box-shadow 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 40px ${teal}35`)}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = `0 0 20px ${teal}20`)}
            >
              {isSignUp ? "create account" : "sign in"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontFamily: sans, fontSize: "0.85rem", color: "#444", marginTop: "2rem" }}>
            {isSignUp ? "Already have an account?" : "No account yet?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: "none", border: "none", fontFamily: mono, fontSize: "0.85rem", color: teal, cursor: "pointer", opacity: 0.7 }}>
              {isSignUp ? "sign in" : "create one"}
            </button>
          </p>

          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link to="/" style={{ fontFamily: mono, fontSize: "0.6rem", color: "#222", textDecoration: "none", letterSpacing: "0.08em" }}>[all variants]</Link>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .abyss-left-panel { display: flex !important; }
          .abyss-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
