import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const condensed = "'Bebas Neue', sans-serif";
const body = "'Libre Franklin', sans-serif";

const c = {
  void: "#0A0A0A",
  surface: "#111111",
  warm: "#F5F0E8",
  gold: "#D4A843",
  smoke: "#666",
  line: "#222",
};

const blinds = "repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(212,168,67,0.03) 8px, rgba(212,168,67,0.03) 9px)";

export default function NoirLogin() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: c.void, color: c.warm, fontFamily: body, display: "flex", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: blinds, pointerEvents: "none", zIndex: 1 }} />

      {/* Left — cinematic panel */}
      <div className="noir-left-panel" style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "2.5rem", position: "relative", overflow: "hidden", minHeight: "100vh",
        borderRight: `1px solid ${c.line}`,
      }}>
        {/* Diagonal light shaft */}
        <div style={{
          position: "absolute", top: "-30%", right: "-20%", width: "80%", height: "160%",
          background: "linear-gradient(135deg, transparent 0%, rgba(212,168,67,0.03) 40%, rgba(212,168,67,0.06) 50%, transparent 60%)",
          transform: "rotate(-15deg)", pointerEvents: "none",
        }} />

        <Link to="/noir" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: "0.5rem", position: "relative", zIndex: 2 }}>
          <span style={{ fontFamily: condensed, fontSize: "1.6rem", color: c.warm, letterSpacing: "0.05em" }}>BEYOND</span>
          <span style={{ fontFamily: condensed, fontSize: "1.6rem", color: c.gold, letterSpacing: "0.05em" }}>CHAT</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ position: "relative", zIndex: 2 }}
        >
          <div style={{ fontFamily: body, fontSize: "0.65rem", fontWeight: 300, letterSpacing: "0.25em", color: c.gold, textTransform: "uppercase", marginBottom: "1.5rem" }}>
            Act I
          </div>
          <h1 style={{ fontFamily: condensed, fontSize: "clamp(3rem, 6vw, 5rem)", lineHeight: 0.9, letterSpacing: "0.03em", marginBottom: "1.5rem" }}>
            THE<br />
            <span style={{ color: c.gold }}>CURTAIN</span><br />
            RISES
          </h1>
          <p style={{ fontFamily: body, fontSize: "0.85rem", fontWeight: 300, color: c.smoke, lineHeight: 1.75, maxWidth: "300px" }}>
            Every great performance begins with a single step.
            Sign in to take your place.
          </p>
        </motion.div>

        <span style={{ fontFamily: body, fontSize: "0.7rem", fontWeight: 300, color: "#333", position: "relative", zIndex: 2 }}>
          © 2025 Beyond Chat
        </span>

        <style>{`
          @media (max-width: 768px) {
            .noir-left-panel { display: none !important; }
          }
        `}</style>
      </div>

      {/* Right — form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "3rem", position: "relative", zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ width: "100%", maxWidth: "360px" }}
        >
          <div style={{ fontFamily: body, fontSize: "0.65rem", fontWeight: 300, letterSpacing: "0.25em", color: c.gold, textTransform: "uppercase", marginBottom: "1rem" }}>
            {isSignUp ? "New Account" : "Welcome Back"}
          </div>
          <h2 style={{ fontFamily: condensed, fontSize: "2.5rem", letterSpacing: "0.04em", marginBottom: "2.5rem" }}>
            {isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
          </h2>

          {/* Social */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "2rem" }}>
            {["Google", "GitHub"].map((provider) => (
              <button
                key={provider}
                style={{
                  fontFamily: body, fontSize: "0.82rem", fontWeight: 400, color: c.warm,
                  background: "transparent", border: `1px solid ${c.line}`, padding: "0.85rem",
                  cursor: "pointer", transition: "all 0.2s ease", textAlign: "center",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.gold; e.currentTarget.style.color = c.gold; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.line; e.currentTarget.style.color = c.warm; }}
              >
                Continue with {provider}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}>
            <div style={{ flex: 1, height: "1px", background: c.line }} />
            <span style={{ fontFamily: body, fontSize: "0.65rem", fontWeight: 300, letterSpacing: "0.15em", color: "#444" }}>OR</span>
            <div style={{ flex: 1, height: "1px", background: c.line }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ fontFamily: body, fontSize: "0.65rem", fontWeight: 300, letterSpacing: "0.15em", color: c.smoke, display: "block", marginBottom: "0.4rem" }}>EMAIL</label>
              <input
                type="email"
                placeholder="you@company.com"
                style={{
                  width: "100%", fontFamily: body, fontSize: "0.88rem", fontWeight: 300,
                  padding: "0.85rem", border: `1px solid ${c.line}`, background: "transparent",
                  color: c.warm, outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = c.gold}
                onBlur={(e) => e.currentTarget.style.borderColor = c.line}
              />
            </div>
            <div>
              <label style={{ fontFamily: body, fontSize: "0.65rem", fontWeight: 300, letterSpacing: "0.15em", color: c.smoke, display: "block", marginBottom: "0.4rem" }}>PASSWORD</label>
              <input
                type="password"
                placeholder="••••••••"
                style={{
                  width: "100%", fontFamily: body, fontSize: "0.88rem", fontWeight: 300,
                  padding: "0.85rem", border: `1px solid ${c.line}`, background: "transparent",
                  color: c.warm, outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = c.gold}
                onBlur={(e) => e.currentTarget.style.borderColor = c.line}
              />
            </div>
          </div>

          <button style={{
            width: "100%", fontFamily: condensed, fontSize: "1.1rem",
            color: c.void, background: c.gold, border: "none",
            padding: "0.85rem", cursor: "pointer", letterSpacing: "0.12em",
            transition: "opacity 0.2s",
          }}>
            {isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
          </button>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                fontFamily: body, fontSize: "0.78rem", fontWeight: 300, color: c.smoke,
                background: "none", border: "none", cursor: "pointer",
                letterSpacing: "0.03em",
              }}
            >
              {isSignUp ? "Already have an account?" : "Need an account?"}
              <span style={{ color: c.gold, marginLeft: "0.3rem" }}>→</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
