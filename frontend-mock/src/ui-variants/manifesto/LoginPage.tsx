import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const display = "'Archivo Black', sans-serif";
const mono = "'Space Mono', monospace";

const c = {
  bg: "#FAFAFA",
  black: "#000000",
  neon: "#BEFF00",
  gray: "#666",
  rule: "#E0E0E0",
};

const grain = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

export default function ManifestoLogin() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.black, display: "flex", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: grain, backgroundSize: "256px 256px", pointerEvents: "none", zIndex: 100 }} />

      {/* Left — giant type panel */}
      <div style={{
        flex: 1, background: c.black, color: c.bg, display: "flex", flexDirection: "column",
        justifyContent: "space-between", padding: "2.5rem", position: "relative", overflow: "hidden",
        minHeight: "100vh",
      }}>
        {/* Decorative giant neon text */}
        <div style={{
          position: "absolute", top: "50%", left: "-5%", transform: "translateY(-50%) rotate(-90deg)",
          fontFamily: display, fontSize: "clamp(6rem, 18vw, 14rem)", color: "transparent",
          WebkitTextStroke: `1px #333`, letterSpacing: "-0.05em", whiteSpace: "nowrap",
          pointerEvents: "none", userSelect: "none", opacity: 0.4,
        }}>
          BEYOND
        </div>

        <Link to="/manifesto" style={{ textDecoration: "none", fontFamily: display, fontSize: "1.1rem", color: c.bg, position: "relative", zIndex: 2 }}>
          BEYOND<span style={{ background: c.bg, color: c.black, padding: "0 0.3rem", marginLeft: "0.2rem" }}>CHAT</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          style={{ position: "relative", zIndex: 2 }}
        >
          <h1 style={{ fontFamily: display, fontSize: "clamp(2.5rem, 5vw, 4.5rem)", lineHeight: 0.9, letterSpacing: "-0.04em", marginBottom: "1.5rem" }}>
            YOUR<br />
            <span style={{ color: c.neon }}>WORKSPACE</span><br />
            AWAITS.
          </h1>
          <p style={{ fontFamily: mono, fontSize: "0.8rem", color: "#888", lineHeight: 1.7, maxWidth: "340px" }}>
            Six studios. Every model. One artifact library. Sign in to start building.
          </p>
        </motion.div>

        <div style={{ fontFamily: mono, fontSize: "0.6rem", color: "#555", letterSpacing: "0.1em", position: "relative", zIndex: 2 }}>
          © 2025 BEYOND CHAT
        </div>

        <style>{`
          @media (max-width: 768px) {
            .manifesto-left-panel { display: none !important; }
          }
        `}</style>
      </div>

      {/* Right — form */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        alignItems: "center", padding: "3rem", position: "relative", zIndex: 10,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ width: "100%", maxWidth: "380px" }}
        >
          <div style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.15em", color: c.gray, marginBottom: "0.75rem" }}>
            {isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
          </div>
          <h2 style={{ fontFamily: display, fontSize: "2rem", letterSpacing: "-0.02em", marginBottom: "2.5rem" }}>
            {isSignUp ? "JOIN THE\nMANIFESTO." : "WELCOME\nBACK."}
          </h2>

          {/* Social login */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
            {["GOOGLE", "GITHUB"].map((provider) => (
              <button
                key={provider}
                style={{
                  fontFamily: mono, fontSize: "0.75rem", fontWeight: 700, color: c.black,
                  background: "transparent", border: `2px solid ${c.black}`, padding: "0.9rem",
                  cursor: "pointer", letterSpacing: "0.08em", textAlign: "center",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = c.black; e.currentTarget.style.color = c.bg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = c.black; }}
              >
                CONTINUE WITH {provider}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
            <div style={{ flex: 1, height: "2px", background: c.black }} />
            <span style={{ fontFamily: mono, fontSize: "0.6rem", color: c.gray, letterSpacing: "0.1em" }}>OR</span>
            <div style={{ flex: 1, height: "2px", background: c.black }} />
          </div>

          {/* Email form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.12em", color: c.gray, display: "block", marginBottom: "0.4rem" }}>EMAIL</label>
              <input
                type="email"
                placeholder="you@company.com"
                style={{
                  width: "100%", fontFamily: mono, fontSize: "0.85rem", padding: "0.85rem",
                  border: `2px solid ${c.black}`, background: "transparent", color: c.black,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.12em", color: c.gray, display: "block", marginBottom: "0.4rem" }}>PASSWORD</label>
              <input
                type="password"
                placeholder="••••••••"
                style={{
                  width: "100%", fontFamily: mono, fontSize: "0.85rem", padding: "0.85rem",
                  border: `2px solid ${c.black}`, background: "transparent", color: c.black,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <button
            style={{
              width: "100%", fontFamily: mono, fontSize: "0.8rem", fontWeight: 700,
              color: c.black, background: c.neon, border: `2px solid ${c.black}`,
              padding: "1rem", cursor: "pointer", letterSpacing: "0.08em",
              transition: "all 0.15s ease",
            }}
          >
            {isSignUp ? "CREATE ACCOUNT" : "SIGN IN"} →
          </button>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                fontFamily: mono, fontSize: "0.7rem", color: c.gray, background: "none",
                border: "none", cursor: "pointer", letterSpacing: "0.05em",
                textDecoration: "underline", textUnderlineOffset: "3px",
              }}
            >
              {isSignUp ? "ALREADY HAVE AN ACCOUNT?" : "NEED AN ACCOUNT?"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
