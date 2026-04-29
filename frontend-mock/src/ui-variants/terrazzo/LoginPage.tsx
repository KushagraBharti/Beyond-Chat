import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const serif = "'Fraunces', serif";
const sans = "'Outfit', sans-serif";

const c = {
  cream: "#FBF7F0",
  terracotta: "#C8553D",
  sage: "#7B946B",
  clay: "#D4A574",
  espresso: "#2E1F14",
  stone: "#A89F91",
  sand: "#E8DFD1",
};

const terrazzo = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='t' x='0' y='0' width='120' height='120' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='15' cy='25' r='2' fill='%23C8553D' opacity='0.15'/%3E%3Ccircle cx='65' cy='10' r='1.5' fill='%237B946B' opacity='0.12'/%3E%3Ccircle cx='100' cy='45' r='2.5' fill='%23D4A574' opacity='0.13'/%3E%3Ccircle cx='35' cy='70' r='1.8' fill='%23C8553D' opacity='0.1'/%3E%3Ccircle cx='80' cy='85' r='2' fill='%237B946B' opacity='0.14'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='120' height='120' fill='url(%23t)'/%3E%3C/svg%3E")`;

export default function TerrazzoLogin() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: c.cream, color: c.espresso, fontFamily: sans, display: "flex", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: terrazzo, backgroundSize: "120px 120px", pointerEvents: "none", zIndex: 0 }} />

      {/* Left — Warm illustration panel */}
      <div className="terrazzo-left-panel" style={{
        flex: 1, background: c.espresso, display: "flex", flexDirection: "column",
        justifyContent: "space-between", padding: "2.5rem", position: "relative",
        overflow: "hidden", minHeight: "100vh",
      }}>
        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: "-80px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: `${c.terracotta}20`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-100px", left: "-40px", width: "350px", height: "350px", borderRadius: "50%", background: `${c.sage}15`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)", width: "200px", height: "200px", borderRadius: "50%", background: `${c.clay}15`, pointerEvents: "none" }} />

        <Link to="/terrazzo" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem", position: "relative", zIndex: 2 }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: `linear-gradient(135deg, ${c.terracotta}, ${c.clay})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: c.cream }} />
          </div>
          <span style={{ fontFamily: serif, fontSize: "1.15rem", fontWeight: 600, color: c.cream }}>Beyond Chat</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ position: "relative", zIndex: 2 }}>
          <h2 style={{ fontFamily: serif, fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, color: c.cream, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
            Your creative
            <br />
            <span style={{ color: c.clay, fontStyle: "italic", fontWeight: 400 }}>workshop</span> awaits
          </h2>
          <p style={{ fontFamily: sans, fontSize: "0.9rem", color: `${c.cream}88`, lineHeight: 1.65, maxWidth: "300px" }}>
            Six specialized studios. Every major AI model. One beautiful space to craft and preserve your work.
          </p>
        </motion.div>

        <div style={{ fontFamily: sans, fontSize: "0.75rem", color: `${c.cream}55`, position: "relative", zIndex: 2 }}>
          Beyond Chat © 2025
        </div>

        <style>{`
          @media (max-width: 768px) {
            .terrazzo-left-panel { display: none !important; }
          }
        `}</style>
      </div>

      {/* Right — Form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "3rem", position: "relative", zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{ width: "100%", maxWidth: "380px" }}
        >
          <div style={{ display: "inline-block", fontFamily: sans, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: c.sage, background: `${c.sage}14`, padding: "0.3rem 0.8rem", borderRadius: "99px", marginBottom: "1rem" }}>
            {isSignUp ? "Create account" : "Welcome back"}
          </div>

          <h2 style={{ fontFamily: serif, fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "2rem" }}>
            {isSignUp ? "Start crafting" : "Sign in"}
          </h2>

          {/* Social */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.75rem" }}>
            {["Google", "GitHub"].map((provider) => (
              <button
                key={provider}
                style={{
                  fontFamily: sans, fontSize: "0.88rem", fontWeight: 500, color: c.espresso,
                  background: "#fff", border: `1px solid ${c.sand}`, borderRadius: "14px",
                  padding: "0.8rem", cursor: "pointer", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.terracotta + "40"; e.currentTarget.style.boxShadow = `0 2px 12px ${c.terracotta}10`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.sand; e.currentTarget.style.boxShadow = "none"; }}
              >
                Continue with {provider}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem" }}>
            <div style={{ flex: 1, height: "1px", background: c.sand }} />
            <span style={{ fontFamily: sans, fontSize: "0.72rem", color: c.stone }}>or</span>
            <div style={{ flex: 1, height: "1px", background: c.sand }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ fontFamily: sans, fontSize: "0.78rem", fontWeight: 500, color: c.stone, display: "block", marginBottom: "0.35rem" }}>Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                style={{
                  width: "100%", fontFamily: sans, fontSize: "0.9rem", padding: "0.8rem 1rem",
                  border: `1px solid ${c.sand}`, borderRadius: "14px", background: "#fff",
                  color: c.espresso, outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = c.terracotta + "60"}
                onBlur={(e) => e.currentTarget.style.borderColor = c.sand}
              />
            </div>
            <div>
              <label style={{ fontFamily: sans, fontSize: "0.78rem", fontWeight: 500, color: c.stone, display: "block", marginBottom: "0.35rem" }}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                style={{
                  width: "100%", fontFamily: sans, fontSize: "0.9rem", padding: "0.8rem 1rem",
                  border: `1px solid ${c.sand}`, borderRadius: "14px", background: "#fff",
                  color: c.espresso, outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = c.terracotta + "60"}
                onBlur={(e) => e.currentTarget.style.borderColor = c.sand}
              />
            </div>
          </div>

          <button style={{
            width: "100%", fontFamily: sans, fontSize: "0.9rem", fontWeight: 600,
            color: c.cream, background: c.terracotta, border: "none", borderRadius: "14px",
            padding: "0.85rem", cursor: "pointer", transition: "all 0.2s ease",
            boxShadow: `0 4px 16px ${c.terracotta}30`,
          }}>
            {isSignUp ? "Create account" : "Sign in"}
          </button>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                fontFamily: sans, fontSize: "0.82rem", color: c.stone, background: "none",
                border: "none", cursor: "pointer", textDecoration: "underline",
                textDecorationColor: c.sand, textUnderlineOffset: "3px",
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
