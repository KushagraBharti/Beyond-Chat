import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const heading = "'Bricolage Grotesque', sans-serif";
const body = "'Plus Jakarta Sans', sans-serif";

const c = {
  canvas: "#F2F2F0",
  surface: "#FFFFFF",
  ink: "#0D0D0D",
  primary: "#4F3FE8",
  accent: "#E55613",
  muted: "#6B6B70",
  border: "#E2E2E0",
};

export default function AtelierPlusLogin() {
  const location = useLocation();
  const navigate = useNavigate();

  const mode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("mode") === "signup" ? "signup" : "signin";
  }, [location.search]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (!email || !password) {
        setError("Please enter an email and password.");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // If email confirmations are ON, session may be null until confirmed.
        if (data.session) {
          setMessage("Account created and signed in.");
          navigate("/", { replace: true });
        } else {
          setMessage("Account created. Check your email to confirm (if confirmations are enabled).");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        setMessage("Signed in successfully.");
        // Redirect somewhere reasonable — landing for now
        navigate("/", { replace: true });
      }
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: body, background: c.surface, overflow: "hidden" }}>
      {/* Left Panel - Branding Visual */}
      <div
        style={{
          flex: "1 1 50%",
          background: c.ink,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "3rem",
          overflow: "hidden",
        }}
        className="brand-panel"
      >
        {/* Abstract animated background */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.8, pointerEvents: "none" }}>
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: "-20%",
              left: "-10%",
              width: "70%",
              height: "70%",
              background: `radial-gradient(circle, ${c.primary}40 0%, transparent 70%)`,
              filter: "blur(60px)",
              borderRadius: "50%",
            }}
          />
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              rotate: [0, -90, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              bottom: "-10%",
              right: "-20%",
              width: "80%",
              height: "80%",
              background: `radial-gradient(circle, ${c.accent}30 0%, transparent 70%)`,
              filter: "blur(60px)",
              borderRadius: "50%",
            }}
          />
          {/* Subtle Grid */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Logo */}
        <Link
          to="/"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem", position: "relative", zIndex: 10 }}
        >
          <div style={{ position: "relative", width: "28px", height: "28px" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "6px", background: `linear-gradient(135deg, ${c.primary}, ${c.accent})` }} />
            <div style={{ position: "absolute", inset: "2px", borderRadius: "4px", background: c.ink }} />
            <div style={{ position: "absolute", inset: "6px", borderRadius: "2px", background: c.surface }} />
          </div>
          <span style={{ fontFamily: heading, fontSize: "1.2rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
            Beyond Chat <span style={{ color: c.primary, fontWeight: 500, fontSize: "1rem" }}>+</span>
          </span>
        </Link>

        {/* (rest of left panel unchanged) */}
        <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: "easeOut" }} style={{ width: "300px", height: "400px", position: "relative" }}>
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{ position: "absolute", top: "10%", left: "10%", right: "-10%", height: "60%", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.1)", padding: "2rem" }}
            >
              <div style={{ width: "40%", height: "8px", background: "rgba(255,255,255,0.2)", borderRadius: "4px", marginBottom: "1rem" }} />
              <div style={{ width: "80%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", marginBottom: "0.5rem" }} />
              <div style={{ width: "60%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px" }} />
            </motion.div>

            <motion.div
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              style={{ position: "absolute", bottom: "10%", left: "-10%", right: "10%", height: "50%", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.15)", padding: "2rem", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
            >
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: c.primary }} />
                <div>
                  <div style={{ width: "80px", height: "8px", background: "rgba(255,255,255,0.3)", borderRadius: "4px", marginBottom: "0.5rem", marginTop: "4px" }} />
                  <div style={{ width: "40px", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px" }} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div style={{ position: "relative", zIndex: 10 }}>
          <p style={{ fontFamily: heading, fontSize: "1.25rem", color: "#fff", lineHeight: 1.5, marginBottom: "1rem" }}>
            "The workspace finally matches the power of the models. It’s fundamentally changed how our team ships."
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: c.border, overflow: "hidden" }}>
              <img src="https://i.pravatar.cc/100?img=32" alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }} />
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>Sarah Jenkins</div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>Product Lead, Nexus</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div style={{ flex: "1 1 50%", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative" }}>
        {/* Mobile Nav */}
        <div style={{ position: "absolute", top: "2rem", left: "2rem" }} className="mobile-nav">
          <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: `linear-gradient(135deg, ${c.primary}, ${c.accent})` }} />
            <span style={{ fontFamily: heading, fontSize: "1rem", fontWeight: 800, color: c.ink, letterSpacing: "-0.02em" }}>Beyond Chat</span>
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} style={{ width: "100%", maxWidth: "420px" }}>
          <div style={{ marginBottom: "2.5rem" }}>
            <h1 style={{ fontFamily: heading, fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", color: c.ink, marginBottom: "0.5rem" }}>
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p style={{ color: c.muted, fontSize: "0.95rem" }}>
              {mode === "signup" ? "Create an account to access your workspace." : "Enter your details to access your workspace."}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: c.ink, marginBottom: "0.5rem" }}>Email</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  borderRadius: "10px",
                  border: `1px solid ${c.border}`,
                  background: c.canvas,
                  fontFamily: body,
                  fontSize: "0.95rem",
                  color: c.ink,
                  outline: "none",
                  transition: "all 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = c.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${c.primary}15`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = c.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: c.ink }}>Password</label>
                <a href="#" style={{ fontSize: "0.8rem", color: c.muted, textDecoration: "none" }}>Forgot?</a>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  borderRadius: "10px",
                  border: `1px solid ${c.border}`,
                  background: c.canvas,
                  fontFamily: body,
                  fontSize: "0.95rem",
                  color: c.ink,
                  outline: "none",
                  transition: "all 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = c.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${c.primary}15`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = c.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {error ? <div style={{ color: c.accent, fontSize: "0.85rem" }}>{error}</div> : null}
            {message ? <div style={{ color: c.muted, fontSize: "0.85rem" }}>{message}</div> : null}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.9rem",
                borderRadius: "10px",
                background: c.ink,
                color: "#fff",
                fontFamily: body,
                fontSize: "0.95rem",
                fontWeight: 700,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: "0.5rem",
                transition: "all 0.2s",
                boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Please wait..." : mode === "signup" ? "Sign Up" : "Sign In"}
            </button>

            <p style={{ textAlign: "center", fontSize: "0.85rem", color: c.muted, marginTop: "1rem" }}>
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <Link to="/login" style={{ color: c.primary, fontWeight: 600, textDecoration: "none" }}>
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <Link to="/login?mode=signup" style={{ color: c.primary, fontWeight: 600, textDecoration: "none" }}>
                    Sign up
                  </Link>
                </>
              )}
            </p>
          </form>
        </motion.div>
      </div>

      <style>{`
        .mobile-nav { display: none; }
        @media (max-width: 900px) {
          .brand-panel { display: none !important; }
          .mobile-nav { display: block !important; }
        }
      `}</style>
    </div>
  );
}