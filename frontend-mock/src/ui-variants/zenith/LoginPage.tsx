import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const serif = "'Playfair Display', serif";
const sans = "'Karla', sans-serif";

const c = {
  bg: "#FCFBF9",
  text: "#2C2C2C",
  stone: "#9E9A93",
  blush: "#E8D5C4",
  line: "#E9E6E1",
  faint: "#F5F3F0",
};

export default function ZenithLogin() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: sans, display: "flex", position: "relative" }}>
      {/* Left — contemplative space */}
      <div className="zenith-left-panel" style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "2.5rem", position: "relative", overflow: "hidden", minHeight: "100vh",
        borderRight: `1px solid ${c.line}`,
      }}>
        {/* Subtle ink wash gradient */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
          background: `linear-gradient(to top, ${c.blush}15, transparent)`,
          pointerEvents: "none",
        }} />

        <Link to="/zenith" style={{ textDecoration: "none", fontFamily: serif, fontSize: "1.15rem", fontWeight: 500, color: c.text, fontStyle: "italic", position: "relative", zIndex: 2 }}>
          Beyond Chat
        </Link>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }} style={{ position: "relative", zIndex: 2 }}>
          <div style={{ width: "40px", height: "1px", background: c.blush, marginBottom: "2rem" }} />
          <h1 style={{
            fontFamily: serif, fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 400,
            fontStyle: "italic", lineHeight: 1.2, letterSpacing: "-0.01em",
            maxWidth: "320px", marginBottom: "1.5rem",
          }}>
            A calm space
            <br />for powerful work
          </h1>
          <p style={{ fontFamily: sans, fontSize: "0.88rem", fontWeight: 400, color: c.stone, lineHeight: 1.7, maxWidth: "300px" }}>
            Six studios. Every major AI model.
            One library to preserve everything you create.
          </p>
        </motion.div>

        <span style={{ fontFamily: sans, fontSize: "0.72rem", fontWeight: 400, color: c.stone, position: "relative", zIndex: 2 }}>
          Beyond Chat
        </span>

        <style>{`
          @media (max-width: 768px) {
            .zenith-left-panel { display: none !important; }
          }
        `}</style>
      </div>

      {/* Right — form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "3rem" }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ width: "100%", maxWidth: "340px" }}
        >
          <p style={{ fontFamily: sans, fontSize: "0.72rem", fontWeight: 400, letterSpacing: "0.2em", color: c.stone, textTransform: "uppercase", marginBottom: "1.5rem" }}>
            {isSignUp ? "Create account" : "Welcome back"}
          </p>

          <h2 style={{ fontFamily: serif, fontSize: "1.8rem", fontWeight: 400, fontStyle: "italic", marginBottom: "2.5rem" }}>
            {isSignUp ? "Begin" : "Sign in"}
          </h2>

          {/* Social */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "2rem" }}>
            {["Google", "GitHub"].map((provider) => (
              <button
                key={provider}
                style={{
                  fontFamily: sans, fontSize: "0.85rem", fontWeight: 400, color: c.text,
                  background: "transparent", border: `1px solid ${c.line}`, borderRadius: "0",
                  padding: "0.8rem", cursor: "pointer", transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.blush; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.line; }}
              >
                Continue with {provider}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}>
            <div style={{ flex: 1, height: "1px", background: c.line }} />
            <span style={{ fontFamily: sans, fontSize: "0.7rem", fontWeight: 400, color: c.stone }}>or</span>
            <div style={{ flex: 1, height: "1px", background: c.line }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.75rem" }}>
            <div>
              <label style={{ fontFamily: sans, fontSize: "0.72rem", fontWeight: 400, color: c.stone, display: "block", marginBottom: "0.4rem", letterSpacing: "0.05em" }}>Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                style={{
                  width: "100%", fontFamily: sans, fontSize: "0.9rem", padding: "0.85rem 0",
                  border: "none", borderBottom: `1px solid ${c.line}`, background: "transparent",
                  color: c.text, outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.3s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = c.blush}
                onBlur={(e) => e.currentTarget.style.borderColor = c.line}
              />
            </div>
            <div>
              <label style={{ fontFamily: sans, fontSize: "0.72rem", fontWeight: 400, color: c.stone, display: "block", marginBottom: "0.4rem", letterSpacing: "0.05em" }}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                style={{
                  width: "100%", fontFamily: sans, fontSize: "0.9rem", padding: "0.85rem 0",
                  border: "none", borderBottom: `1px solid ${c.line}`, background: "transparent",
                  color: c.text, outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.3s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = c.blush}
                onBlur={(e) => e.currentTarget.style.borderColor = c.line}
              />
            </div>
          </div>

          <button style={{
            width: "100%", fontFamily: sans, fontSize: "0.88rem", fontWeight: 500,
            color: "#fff", background: c.text, border: "none",
            padding: "0.85rem", cursor: "pointer", transition: "opacity 0.3s",
            letterSpacing: "0.02em",
          }}>
            {isSignUp ? "Create account" : "Sign in"}
          </button>

          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                fontFamily: sans, fontSize: "0.78rem", fontWeight: 400, color: c.stone,
                background: "none", border: "none", cursor: "pointer",
              }}
            >
              {isSignUp ? "Already have an account?" : "Need an account?"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
