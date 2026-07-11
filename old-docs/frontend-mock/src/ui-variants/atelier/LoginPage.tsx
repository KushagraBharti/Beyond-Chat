import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const heading = "'Bricolage Grotesque', sans-serif";
const body = "'Plus Jakarta Sans', sans-serif";

const c = {
  canvas: "#F7F7F5",
  surface: "#FFFFFF",
  ink: "#111111",
  primary: "#5B4FE9",
  accent: "#F06225",
  muted: "#71717A",
  border: "#E8E8E6",
  subtle: "#F0F0EE",
};

const studioColors = ["#5B4FE9", "#0E7AE6", "#E5484D", "#30A46C", "#F06225", "#8B5CF6"];

const dotGrid = "radial-gradient(circle, #d4d4d2 0.8px, transparent 0.8px)";

export default function AtelierLogin() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: c.canvas,
        color: c.ink,
        fontFamily: body,
        display: "flex",
        position: "relative",
      }}
    >
      {/* Dot grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: dotGrid,
          backgroundSize: "24px 24px",
          opacity: 0.5,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Left panel — workspace preview */}
      <div
        style={{
          display: "none",
          width: "50%",
          background: c.ink,
          position: "relative",
          overflow: "hidden",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "2.5rem",
        }}
        className="atelier-left-panel"
      >
        {/* Background dot grid on dark */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, #ffffff08 0.8px, transparent 0.8px)",
            backgroundSize: "24px 24px",
            pointerEvents: "none",
          }}
        />

        {/* Logo */}
        <Link
          to="/atelier"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ position: "relative", width: "24px", height: "24px" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "14px", height: "14px", borderRadius: "4px", background: c.primary }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "14px", height: "14px", borderRadius: "4px", background: c.accent, opacity: 0.8 }} />
          </div>
          <span style={{ fontFamily: heading, fontSize: "1.1rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            Beyond Chat
          </span>
        </Link>

        {/* Center — abstract workspace visual */}
        <div style={{ position: "relative", zIndex: 1, padding: "2rem 0" }}>
          {/* Floating studio cards arranged like a workspace */}
          <div style={{ position: "relative", height: "280px" }}>
            {studioColors.map((color, i) => {
              const positions = [
                { top: "0", left: "0", w: "140px", h: "90px", rotate: "-2deg", delay: 0 },
                { top: "10px", left: "155px", w: "130px", h: "70px", rotate: "1deg", delay: 0.1 },
                { top: "95px", left: "20px", w: "120px", h: "80px", rotate: "1.5deg", delay: 0.2 },
                { top: "110px", left: "160px", w: "110px", h: "95px", rotate: "-1deg", delay: 0.15 },
                { top: "185px", left: "0", w: "150px", h: "75px", rotate: "-0.5deg", delay: 0.25 },
                { top: "195px", left: "165px", w: "120px", h: "65px", rotate: "2deg", delay: 0.3 },
              ];
              const p = positions[i];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + p.delay, duration: 0.6, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    top: p.top,
                    left: p.left,
                    width: p.w,
                    height: p.h,
                    borderRadius: "10px",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    transform: `rotate(${p.rotate})`,
                    padding: "0.6rem",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ width: "100%", height: "2px", background: color, borderRadius: "1px", marginBottom: "0.5rem", opacity: 0.8 }} />
                  <div style={{ width: "60%", height: "4px", background: "#333", borderRadius: "2px", marginBottom: "0.3rem" }} />
                  <div style={{ width: "80%", height: "3px", background: "#282828", borderRadius: "2px", marginBottom: "0.2rem" }} />
                  <div style={{ width: "40%", height: "3px", background: "#282828", borderRadius: "2px" }} />
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            style={{ marginTop: "2rem" }}
          >
            <h2
              style={{
                fontFamily: heading,
                fontSize: "1.8rem",
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                marginBottom: "0.75rem",
              }}
            >
              Six studios.
              <br />
              <span style={{ color: c.primary }}>One workspace.</span>
            </h2>
            <p style={{ fontFamily: body, fontSize: "0.9rem", color: "#666", lineHeight: 1.65, maxWidth: "320px" }}>
              Every output saved as a searchable artifact. Compare models
              side-by-side. This is AI work, organized.
            </p>
          </motion.div>
        </div>

        <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "0.5rem" }}>
          {studioColors.map((color, i) => (
            <div
              key={i}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                background: color,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: "100%", maxWidth: "400px" }}
        >
          {/* Mobile logo */}
          <Link
            to="/atelier"
            className="atelier-mobile-logo"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              marginBottom: "2.5rem",
            }}
          >
            <div style={{ position: "relative", width: "24px", height: "24px" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "14px", height: "14px", borderRadius: "4px", background: c.primary }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: "14px", height: "14px", borderRadius: "4px", background: c.accent, opacity: 0.8 }} />
            </div>
            <span style={{ fontFamily: heading, fontSize: "1.1rem", fontWeight: 700, color: c.ink, letterSpacing: "-0.02em" }}>
              Beyond Chat
            </span>
          </Link>

          <h1
            style={{
              fontFamily: heading,
              fontSize: "1.6rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: "0.35rem",
            }}
          >
            {isSignUp ? "Create your workspace" : "Welcome back"}
          </h1>
          <p
            style={{
              fontFamily: body,
              fontSize: "0.9rem",
              color: c.muted,
              marginBottom: "2rem",
            }}
          >
            {isSignUp
              ? "Get started with your free workspace."
              : "Sign in to continue to your workspace."}
          </p>

          {/* Social */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1.5rem" }}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.7rem",
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: "10px",
                fontFamily: body,
                fontSize: "0.85rem",
                fontWeight: 500,
                color: c.ink,
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#ccc")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.border)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.7rem",
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: "10px",
                fontFamily: body,
                fontSize: "0.85rem",
                fontWeight: 500,
                color: c.ink,
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#ccc")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.border)}
            >
              <svg width="16" height="16" fill="#333" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.5rem 0" }}>
            <div style={{ flex: 1, height: "1px", background: c.border }} />
            <span style={{ fontFamily: body, fontSize: "0.75rem", color: "#bbb", fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: "1px", background: c.border }} />
          </div>

          <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {isSignUp && (
              <div>
                <label style={{ fontFamily: body, fontSize: "0.8rem", fontWeight: 600, color: c.ink, display: "block", marginBottom: "0.4rem" }}>
                  Full name
                </label>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  style={{
                    width: "100%",
                    padding: "0.7rem 0.9rem",
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    borderRadius: "10px",
                    fontFamily: body,
                    fontSize: "0.9rem",
                    color: c.ink,
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = c.primary + "60")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = c.border)}
                />
              </div>
            )}
            <div>
              <label style={{ fontFamily: body, fontSize: "0.8rem", fontWeight: 600, color: c.ink, display: "block", marginBottom: "0.4rem" }}>
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  background: c.surface,
                  border: `1px solid ${c.border}`,
                  borderRadius: "10px",
                  fontFamily: body,
                  fontSize: "0.9rem",
                  color: c.ink,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = c.primary + "60")}
                onBlur={(e) => (e.currentTarget.style.borderColor = c.border)}
              />
            </div>
            <div>
              <label style={{ fontFamily: body, fontSize: "0.8rem", fontWeight: 600, color: c.ink, display: "block", marginBottom: "0.4rem" }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  background: c.surface,
                  border: `1px solid ${c.border}`,
                  borderRadius: "10px",
                  fontFamily: body,
                  fontSize: "0.9rem",
                  color: c.ink,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = c.primary + "60")}
                onBlur={(e) => (e.currentTarget.style.borderColor = c.border)}
              />
            </div>

            {!isSignUp && (
              <div style={{ textAlign: "right" }}>
                <button type="button" style={{ background: "none", border: "none", fontFamily: body, fontSize: "0.8rem", color: c.primary, fontWeight: 500, cursor: "pointer" }}>
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              style={{
                marginTop: "0.5rem",
                padding: "0.8rem",
                background: c.primary,
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontFamily: body,
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(91,79,233,0.25)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#4F43D6";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(91,79,233,0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = c.primary;
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(91,79,233,0.25)";
              }}
            >
              {isSignUp ? "Create workspace" : "Sign in"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontFamily: body, fontSize: "0.88rem", color: c.muted, marginTop: "1.75rem" }}>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                background: "none",
                border: "none",
                fontFamily: body,
                fontSize: "0.88rem",
                color: c.primary,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isSignUp ? "Sign in" : "Create one"}
            </button>
          </p>

          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <Link to="/" style={{ fontFamily: body, fontSize: "0.75rem", color: "#ccc", textDecoration: "none" }}>
              All variants
            </Link>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .atelier-left-panel { display: flex !important; }
          .atelier-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
