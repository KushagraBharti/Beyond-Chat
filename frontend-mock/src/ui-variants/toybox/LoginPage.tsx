import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const display = "'Syne', sans-serif";
const bodyFont = "'DM Sans', sans-serif";
const colors = {
  coral: "#FF5C38",
  blue: "#3B5BFF",
  lemon: "#FFD43B",
  mint: "#2DD4A8",
  ink: "#1a1a1a",
  bg: "#FFFDF8",
};

export default function ToyboxLogin() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        color: colors.ink,
        fontFamily: bodyFont,
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left side — big bold graphics */}
      <div
        style={{
          display: "none",
          width: "50%",
          background: colors.blue,
          position: "relative",
          overflow: "hidden",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "2.5rem",
        }}
        className="toybox-left-panel"
      >
        {/* Decorative shapes */}
        <div style={{ position: "absolute", top: "15%", right: "10%", width: "200px", height: "200px", borderRadius: "50%", background: colors.lemon, border: `4px solid ${colors.ink}`, opacity: 0.8 }} />
        <div style={{ position: "absolute", bottom: "20%", left: "5%", width: "120px", height: "120px", background: colors.coral, border: `4px solid ${colors.ink}`, transform: "rotate(15deg)", opacity: 0.8 }} />
        <div style={{ position: "absolute", top: "50%", left: "40%", width: "80px", height: "80px", borderRadius: "50%", border: `4px solid ${colors.ink}`, background: colors.mint, opacity: 0.6 }} />

        <Link
          to="/toybox"
          style={{ fontFamily: display, fontSize: "1.3rem", fontWeight: 800, color: "#fff", textDecoration: "none", position: "relative", zIndex: 1 }}
        >
          Beyond Chat
        </Link>

        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{ fontFamily: display, fontSize: "clamp(2rem, 4vw, 3.5rem)", fontWeight: 800, color: "#fff", lineHeight: 0.95, marginBottom: "1rem" }}>
            Build
            <br />
            cool
            <br />
            stuff.
          </h2>
          <p style={{ fontFamily: bodyFont, fontSize: "1rem", color: "rgba(255,255,255,0.7)", maxWidth: "300px", lineHeight: 1.6 }}>
            Six studios. One library. All your AI work, organized.
          </p>
        </div>

        <p style={{ fontFamily: bodyFont, fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", position: "relative", zIndex: 1 }}>
          Beyond Chat &middot; A modular AI workspace
        </p>
      </div>

      {/* Right side — form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: "100%", maxWidth: "420px" }}
        >
          {/* Mobile logo */}
          <Link
            to="/toybox"
            className="toybox-mobile-logo"
            style={{ fontFamily: display, fontSize: "1.3rem", fontWeight: 800, color: colors.ink, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2.5rem" }}
          >
            <span style={{ display: "inline-block", width: "28px", height: "28px", borderRadius: "50%", background: colors.coral, border: `3px solid ${colors.ink}` }} />
            Beyond Chat
          </Link>

          {/* Form card */}
          <div
            style={{
              background: "#fff",
              border: `3px solid ${colors.ink}`,
              borderRadius: "24px",
              padding: "2.5rem 2rem",
              boxShadow: `6px 6px 0 ${colors.lemon}`,
            }}
          >
            <h1 style={{ fontFamily: display, fontSize: "1.8rem", fontWeight: 800, marginBottom: "0.25rem" }}>
              {isSignUp ? "Join the fun" : "Welcome back!"}
            </h1>
            <p style={{ fontFamily: bodyFont, fontSize: "0.9rem", color: "#888", marginBottom: "2rem" }}>
              {isSignUp ? "Create your free workspace." : "Sign in to keep building."}
            </p>

            {/* Social */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.75rem", background: "#fff", border: `2px solid ${colors.ink}`, borderRadius: "14px", fontFamily: display, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", boxShadow: `3px 3px 0 ${colors.ink}`, transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(1px, 1px)"; e.currentTarget.style.boxShadow = `2px 2px 0 ${colors.ink}`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translate(0, 0)"; e.currentTarget.style.boxShadow = `3px 3px 0 ${colors.ink}`; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
              <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.75rem", background: "#fff", border: `2px solid ${colors.ink}`, borderRadius: "14px", fontFamily: display, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", boxShadow: `3px 3px 0 ${colors.ink}`, transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(1px, 1px)"; e.currentTarget.style.boxShadow = `2px 2px 0 ${colors.ink}`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translate(0, 0)"; e.currentTarget.style.boxShadow = `3px 3px 0 ${colors.ink}`; }}
              >
                <svg width="16" height="16" fill="#333" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0" }}>
              <div style={{ flex: 1, height: "2px", background: colors.ink, opacity: 0.1 }} />
              <span style={{ fontFamily: display, fontSize: "0.7rem", fontWeight: 600, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.1em" }}>or</span>
              <div style={{ flex: 1, height: "2px", background: colors.ink, opacity: 0.1 }} />
            </div>

            <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {isSignUp && (
                <div>
                  <label style={{ fontFamily: display, fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>Name</label>
                  <input type="text" placeholder="Your name" style={{ width: "100%", padding: "0.8rem 1rem", background: colors.bg, border: `2px solid ${colors.ink}`, borderRadius: "12px", fontFamily: bodyFont, fontSize: "0.9rem", outline: "none" }} />
                </div>
              )}
              <div>
                <label style={{ fontFamily: display, fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>Email</label>
                <input type="email" placeholder="you@example.com" style={{ width: "100%", padding: "0.8rem 1rem", background: colors.bg, border: `2px solid ${colors.ink}`, borderRadius: "12px", fontFamily: bodyFont, fontSize: "0.9rem", outline: "none" }} />
              </div>
              <div>
                <label style={{ fontFamily: display, fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>Password</label>
                <input type="password" placeholder="••••••••" style={{ width: "100%", padding: "0.8rem 1rem", background: colors.bg, border: `2px solid ${colors.ink}`, borderRadius: "12px", fontFamily: bodyFont, fontSize: "0.9rem", outline: "none" }} />
              </div>

              {!isSignUp && (
                <div style={{ textAlign: "right" }}>
                  <button type="button" style={{ background: "none", border: "none", fontFamily: bodyFont, fontSize: "0.8rem", color: colors.coral, fontWeight: 600, cursor: "pointer" }}>Forgot password?</button>
                </div>
              )}

              <button
                type="submit"
                style={{ marginTop: "0.5rem", padding: "0.85rem", background: colors.ink, color: "#fff", border: `3px solid ${colors.ink}`, borderRadius: "14px", fontFamily: display, fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", boxShadow: `4px 4px 0 ${colors.coral}`, transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(2px, 2px)"; e.currentTarget.style.boxShadow = `2px 2px 0 ${colors.coral}`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translate(0, 0)"; e.currentTarget.style.boxShadow = `4px 4px 0 ${colors.coral}`; }}
              >
                {isSignUp ? "Create account" : "Sign in"} &rarr;
              </button>
            </form>
          </div>

          <p style={{ textAlign: "center", fontFamily: bodyFont, fontSize: "0.9rem", color: "#999", marginTop: "1.5rem" }}>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: "none", border: "none", fontFamily: display, fontSize: "0.9rem", color: colors.blue, fontWeight: 700, cursor: "pointer" }}>
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>

          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <Link to="/" style={{ fontFamily: display, fontSize: "0.7rem", fontWeight: 600, color: "#ccc", textDecoration: "none" }}>All variants &rarr;</Link>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .toybox-left-panel { display: flex !important; }
          .toybox-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
