import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createCheckoutSession } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { motion, useMotionValue, AnimatePresence } from "framer-motion";

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

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

// --- GLOBAL COMPONENTS ---
const NoiseOverlay = () => (
  <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999, opacity: 0.35, mixBlendMode: "overlay" }}>
    <svg width="100%" height="100%">
      <filter id="noiseFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noiseFilter)" />
    </svg>
  </div>
);

const CustomCursor = ({ variant }: { variant: "default" | "play" | "rotate" }) => {
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX - 16);
      mouseY.set(e.clientY - 16);
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [mouseX, mouseY]);

  let content = null;
  let size = 32;
  let bg = "rgba(79, 63, 232, 0.5)"; 
  
  if (variant === "play") {
    size = 48;
    bg = c.primary;
    content = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
  } else if (variant === "rotate") {
    size = 48;
    bg = c.accent;
    content = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>;
  }

  return (
    <motion.div
      style={{
        position: "fixed", top: 0, left: 0, pointerEvents: "none", zIndex: 10000,
        x: mouseX, y: mouseY, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <motion.div
        animate={{ 
          width: size, 
          height: size, 
          backgroundColor: bg,
          x: -(size - 32)/2,
          y: -(size - 32)/2
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: variant === "default" ? "blur(4px)" : "none",
          mixBlendMode: variant === "default" ? "difference" : "normal"
        }}
      >
        <AnimatePresence mode="wait">
          {content && (
            <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} style={{ display: "flex" }}>
              {content}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

const ROICalculator = ({ setCursorVariant }: { setCursorVariant: any }) => {
  const [hours, setHours] = useState(15);
  const costPerHour = 75; // Average skilled knowledge worker rate
  const weeks = 4;
  const teamSize = 5; 
  const totalSaved = hours * costPerHour * weeks * teamSize;

  return (
    <motion.div 
      variants={fadeUp}
      style={{ background: c.ink, color: c.surface, padding: "4rem 3rem", borderRadius: "32px", marginBottom: "6rem", position: "relative", overflow: "hidden", boxShadow: `0 20px 60px ${c.primary}30` }}
    >
      <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", background: c.primary, filter: "blur(80px)", opacity: 0.4, borderRadius: "50%" }} />
      <div style={{ position: "absolute", bottom: "-50px", left: "-50px", width: "200px", height: "200px", background: c.accent, filter: "blur(80px)", opacity: 0.3, borderRadius: "50%" }} />

      <div style={{ position: "relative", zIndex: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "4rem", alignItems: "center" }}>
        <div>
          <h3 style={{ fontFamily: heading, fontSize: "2.5rem", fontWeight: 800, marginBottom: "1rem", letterSpacing: "-0.02em" }}>Calculate your ROI</h3>
          <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: "3rem", fontSize: "1.1rem", lineHeight: 1.6 }}>How many hours does your team spend writing, pasting context, and wrangling generic prompts each week?</p>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontWeight: 600 }}>
            <span>{hours} hours / week</span>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Team of {teamSize}</span>
          </div>
          
          <div 
            onMouseEnter={() => setCursorVariant("play")}
            onMouseLeave={() => setCursorVariant("default")}
          >
            <input 
              type="range" 
              min="1" max="50" 
              value={hours} 
              onChange={(e) => setHours(Number(e.target.value))}
              className="roi-slider"
              style={{ cursor: "none" }}
            />
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", padding: "3rem", borderRadius: "24px", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "1rem", fontWeight: 700 }}>Atelier Plus saves you</div>
          <div style={{ fontFamily: heading, fontSize: "4.5rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
            ${totalSaved.toLocaleString()}
          </div>
          <div style={{ fontSize: "1.2rem", color: c.primary, fontWeight: 700, marginTop: "0.5rem" }}>/ month</div>
          <p style={{ marginTop: "1.5rem", color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>By standardizing outputs and autonomous workflows.</p>
        </div>
      </div>
    </motion.div>
  )
}

export default function AtelierPlusPricing() {
  const [cursorVariant, setCursorVariant] = useState<"default" | "play" | "rotate">("default");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const scrollHome = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleUpgrade = async () => {
    if (!user) {
      sessionStorage.setItem("upgrade_intent", "1");
      navigate("/login?mode=signup");
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const { checkoutUrl } = await createCheckoutSession();
      window.location.href = checkoutUrl;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setCheckoutLoading(false);
    }
  };

  useEffect(() => {
    if (user && sessionStorage.getItem("upgrade_intent") === "1") {
      sessionStorage.removeItem("upgrade_intent");
      handleUpgrade();
    }
  }, [user]);

  return (
    <div style={{ minHeight: "100vh", background: c.canvas, color: c.ink, fontFamily: body, overflow: "hidden", cursor: "none" }}>
      <NoiseOverlay />
      <CustomCursor variant={cursorVariant} />

      <style>{`
        * { cursor: none !important; }
        .roi-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.2);
          outline: none;
        }
        .roi-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #4F3FE8;
          cursor: none;
          box-shadow: 0 0 20px rgba(79, 63, 232, 0.6);
        }
      `}</style>

      {/* Precision Grid Background */}
      <div 
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, ${c.border} 1px, transparent 1px),
            linear-gradient(to bottom, ${c.border} 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          opacity: 0.3,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Nav */}
      <nav
        style={{
          padding: "1.5rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        <Link to="/" onClick={scrollHome} onMouseEnter={() => setCursorVariant("play")} onMouseLeave={() => setCursorVariant("default")} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ position: "relative", width: "28px", height: "28px" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "6px", background: `linear-gradient(135deg, ${c.primary}, ${c.accent})` }} />
            <div style={{ position: "absolute", inset: "2px", borderRadius: "4px", background: c.surface }} />
            <div style={{ position: "absolute", inset: "6px", borderRadius: "2px", background: c.ink }} />
          </div>
          <span style={{ fontFamily: heading, fontSize: "1.2rem", fontWeight: 800, color: c.ink, letterSpacing: "-0.03em" }}>
            Beyond Chat <span style={{ color: c.primary, fontWeight: 500, fontSize: "1rem" }}>+</span>
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link to="/" onClick={scrollHome} onMouseEnter={() => setCursorVariant("play")} onMouseLeave={() => setCursorVariant("default")} style={{ fontFamily: body, fontSize: "0.85rem", fontWeight: 600, color: c.muted, textDecoration: "none" }}>Home</Link>
          <Link to="/login" onMouseEnter={() => setCursorVariant("play")} onMouseLeave={() => setCursorVariant("default")} style={{ fontFamily: body, fontSize: "0.85rem", fontWeight: 700, color: "#fff", background: c.ink, padding: "0.6rem 1.4rem", borderRadius: "99px", textDecoration: "none" }}>Log in</Link>
        </div>
      </nav>

      {/* Main Pricing Section */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "4rem 2rem", position: "relative", zIndex: 10 }}>
        
        <motion.div initial="hidden" animate="visible" variants={stagger} style={{ textAlign: "center", marginBottom: "4rem" }}>
          <motion.h1 variants={fadeUp} style={{ fontFamily: heading, fontSize: "clamp(3rem, 5vw, 4.5rem)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: "1rem" }}>
            Invest in <span style={{ color: c.primary }}>intelligence.</span>
          </motion.h1>
          <motion.p variants={fadeUp} style={{ fontFamily: body, fontSize: "1.2rem", color: c.muted, maxWidth: "600px", margin: "0 auto" }}>
            Start for free, upgrade when your workflow demands more power and autonomy.
          </motion.p>
        </motion.div>

        {/* The New ROI Calculator */}
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <ROICalculator setCursorVariant={setCursorVariant} />
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={stagger} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem", alignItems: "center" }}>
          
          {/* Free Tier */}
          <motion.div 
            variants={fadeUp}
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(20px)",
              borderRadius: "24px",
              border: `1px solid rgba(255,255,255,0.8)`,
              padding: "3rem 2.5rem",
              boxShadow: "0 10px 40px rgba(0,0,0,0.03)",
            }}
          >
            <h3 style={{ fontFamily: heading, fontSize: "1.5rem", fontWeight: 800, color: c.ink, marginBottom: "0.5rem" }}>Starter</h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginBottom: "1rem" }}>
              <span style={{ fontFamily: heading, fontSize: "3rem", fontWeight: 800, letterSpacing: "-0.04em" }}>$0</span>
              <span style={{ color: c.muted, fontWeight: 500 }}>/mo</span>
            </div>
            <p style={{ color: c.muted, lineHeight: 1.6, marginBottom: "2.5rem", minHeight: "50px" }}>For individuals exploring structured AI workflows.</p>
            
            <Link 
              to="/signup" 
              onMouseEnter={() => setCursorVariant("play")} 
              onMouseLeave={() => setCursorVariant("default")}
              style={{ display: "block", textAlign: "center", background: c.canvas, border: `1px solid ${c.border}`, color: c.ink, padding: "1rem", borderRadius: "12px", fontWeight: 700, textDecoration: "none", marginBottom: "2.5rem" }}>
              Get Started Free
            </Link>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
              {["Access to 3 basic studios", "50 artifact saves per month", "Standard models (GPT-3.5, Claude Haiku)", "Community support"].map((feat, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: c.ink, fontSize: "0.95rem" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: `${c.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.muted }} />
                  </div>
                  {feat}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Pro Tier (Highlighted) */}
          <motion.div 
            variants={fadeUp}
            style={{
              background: c.ink,
              borderRadius: "24px",
              border: `1px solid rgba(255,255,255,0.1)`,
              padding: "4rem 2.5rem",
              boxShadow: `0 20px 60px ${c.primary}30, inset 0 0 0 1px ${c.primary}50`,
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Glow effect */}
            <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "150px", height: "150px", background: c.primary, filter: "blur(60px)", opacity: 0.5, borderRadius: "50%" }} />
            
            <div style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: `linear-gradient(90deg, ${c.primary}, ${c.accent})`, padding: "0.3rem 1rem", borderRadius: "99px", fontSize: "0.75rem", fontWeight: 800, color: "#fff", letterSpacing: "0.05em" }}>
              RECOMMENDED
            </div>

            <h3 style={{ fontFamily: heading, fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginBottom: "0.5rem" }}>Professional</h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginBottom: "1rem", color: "#fff" }}>
              <span style={{ fontFamily: heading, fontSize: "3.5rem", fontWeight: 800, letterSpacing: "-0.04em" }}>$10</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>/mo</span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: "2.5rem", minHeight: "50px" }}>For power users who need advanced models and unlimited context.</p>
            
            <button
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              onMouseEnter={(e) => { setCursorVariant("play"); (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; }}
              onMouseLeave={(e) => { setCursorVariant("default"); (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
              style={{ display: "block", width: "100%", textAlign: "center", background: checkoutLoading ? `${c.primary}80` : c.primary, color: "#fff", padding: "1rem", borderRadius: "12px", fontWeight: 700, border: "none", cursor: checkoutLoading ? "not-allowed" : "none", marginBottom: checkoutError ? "1rem" : "2.5rem", boxShadow: `0 8px 20px ${c.primary}40`, transition: "transform 0.2s", fontSize: "1rem" }}
            >
              {checkoutLoading ? "Redirecting…" : "Upgrade to Pro"}
            </button>
            {checkoutError && (
              <p style={{ color: "#E55613", fontSize: "0.85rem", marginBottom: "2.5rem", textAlign: "center" }}>{checkoutError}</p>
            )}

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
              {["All 6 advanced studios", "Unlimited artifact saves", "Premium models (GPT-4o, Claude 3.5 Sonnet)", "Model Compare feature", "Priority email support"].map((feat, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#fff", fontSize: "0.95rem" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: `${c.primary}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.primary }} />
                  </div>
                  {feat}
                </li>
              ))}
            </ul>
          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
