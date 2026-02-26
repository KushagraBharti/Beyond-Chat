import { Link } from "react-router-dom";
import { motion } from "framer-motion";

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
            style={{ position: "absolute", top: "-20%", left: "-10%", width: "70%", height: "70%", background: `radial-gradient(circle, ${c.primary}40 0%, transparent 70%)`, filter: "blur(60px)", borderRadius: "50%" }}
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.5, 1],
              rotate: [0, -90, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", bottom: "-10%", right: "-20%", width: "80%", height: "80%", background: `radial-gradient(circle, ${c.accent}30 0%, transparent 70%)`, filter: "blur(60px)", borderRadius: "50%" }}
          />
          {/* Subtle Grid */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
        </div>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem", position: "relative", zIndex: 10 }}>
          <div style={{ position: "relative", width: "28px", height: "28px" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "6px", background: `linear-gradient(135deg, ${c.primary}, ${c.accent})` }} />
            <div style={{ position: "absolute", inset: "2px", borderRadius: "4px", background: c.ink }} />
            <div style={{ position: "absolute", inset: "6px", borderRadius: "2px", background: c.surface }} />
          </div>
          <span style={{ fontFamily: heading, fontSize: "1.2rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
            Beyond Chat <span style={{ color: c.primary, fontWeight: 500, fontSize: "1rem" }}>+</span>
          </span>
        </Link>

        {/* Floating Abstract Element */}
        <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ width: "300px", height: "400px", position: "relative" }}
          >
            {/* Glassmorphic Cards Stack */}
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

        {/* Quote */}
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
      <div 
        style={{
          flex: "1 1 50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          position: "relative"
        }}
      >
        {/* Mobile Nav */}
        <div style={{ position: "absolute", top: "2rem", left: "2rem" }} className="mobile-nav">
          <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: `linear-gradient(135deg, ${c.primary}, ${c.accent})` }} />
            <span style={{ fontFamily: heading, fontSize: "1rem", fontWeight: 800, color: c.ink, letterSpacing: "-0.02em" }}>
              Beyond Chat
            </span>
          </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ width: "100%", maxWidth: "420px" }}
        >
          <div style={{ marginBottom: "2.5rem" }}>
            <h1 style={{ fontFamily: heading, fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", color: c.ink, marginBottom: "0.5rem" }}>
              Welcome back
            </h1>
            <p style={{ color: c.muted, fontSize: "0.95rem" }}>
              Enter your details to access your workspace.
            </p>
          </div>

          <form onSubmit={e => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: c.ink, marginBottom: "0.5rem" }}>Email</label>
              <input 
                type="email" 
                placeholder="name@company.com"
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
                  transition: "all 0.2s"
                }}
                onFocus={e => { e.currentTarget.style.borderColor = c.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${c.primary}15`; }}
                onBlur={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.boxShadow = "none"; }}
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
                  transition: "all 0.2s"
                }}
                onFocus={e => { e.currentTarget.style.borderColor = c.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${c.primary}15`; }}
                onBlur={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            <button 
              type="submit"
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
                cursor: "pointer",
                marginTop: "0.5rem",
                transition: "all 0.2s",
                boxShadow: "0 4px 14px rgba(0,0,0,0.1)"
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.1)"; }}
            >
              Sign In
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1rem 0" }}>
              <div style={{ flex: 1, height: "1px", background: c.border }} />
              <span style={{ fontSize: "0.75rem", color: c.muted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Or continue with</span>
              <div style={{ flex: 1, height: "1px", background: c.border }} />
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button style={{ flex: 1, padding: "0.8rem", borderRadius: "10px", background: c.surface, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = c.canvas} onMouseLeave={e => e.currentTarget.style.background = c.surface}>
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              </button>
              <button style={{ flex: 1, padding: "0.8rem", borderRadius: "10px", background: c.surface, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = c.canvas} onMouseLeave={e => e.currentTarget.style.background = c.surface}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              </button>
            </div>

            <p style={{ textAlign: "center", fontSize: "0.85rem", color: c.muted, marginTop: "1rem" }}>
              Don't have an account? <Link to="/login" style={{ color: c.primary, fontWeight: 600, textDecoration: "none" }}>Sign up</Link>
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
