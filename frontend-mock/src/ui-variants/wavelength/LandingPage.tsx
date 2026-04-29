import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const heading = "'Urbanist', sans-serif";
const mono = "'IBM Plex Mono', monospace";

const c = {
  deep: "#0C0F1A",
  surface: "#131728",
  text: "#E8E6F0",
  muted: "#6B6A80",
  pink: "#FF006E",
  orange: "#FF6B35",
  cyan: "#00D4FF",
  violet: "#8B5CF6",
};

const spectrum = `linear-gradient(90deg, ${c.pink}, ${c.orange}, ${c.cyan})`;

const studios = [
  { name: "Writing", freq: "440Hz" },
  { name: "Research", freq: "528Hz" },
  { name: "Image", freq: "639Hz" },
  { name: "Data", freq: "741Hz" },
  { name: "Finance", freq: "852Hz" },
  { name: "Compare", freq: "963Hz" },
];

const features = [
  { title: "Artifact Library", desc: "Every output archived. Tagged, searchable, versioned. Your creative corpus grows infinitely." },
  { title: "Multi-Model Engine", desc: "GPT-4, Claude, Gemini, Llama — run them in parallel. Same input, different frequencies." },
  { title: "Context Builder", desc: "Upload files, stack references, build deep prompts. Give every model the full picture." },
  { title: "Workspace Isolation", desc: "Separate projects, separate contexts. Share with teams or keep it personal." },
];

export default function WavelengthLanding() {
  return (
    <div style={{ minHeight: "100vh", background: c.deep, color: c.text, fontFamily: heading, position: "relative", overflow: "hidden" }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: "-30%", left: "-20%", width: "70%", height: "70%",
        background: `radial-gradient(ellipse, ${c.pink}08 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", bottom: "-20%", right: "-10%", width: "60%", height: "60%",
        background: `radial-gradient(ellipse, ${c.cyan}06 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Nav */}
      <nav style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.25rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10 }}>
        <Link to="/wavelength" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {/* Waveform logo */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="8" width="3" height="8" rx="1.5" fill={c.pink} />
            <rect x="7" y="4" width="3" height="16" rx="1.5" fill={c.orange} />
            <rect x="12" y="6" width="3" height="12" rx="1.5" fill={c.cyan} />
            <rect x="17" y="9" width="3" height="6" rx="1.5" fill={c.violet} />
          </svg>
          <span style={{ fontFamily: heading, fontSize: "1.1rem", fontWeight: 700, color: c.text, letterSpacing: "-0.02em" }}>Wavelength</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link to="/wavelength/pricing" style={{ fontFamily: mono, fontSize: "0.75rem", color: c.muted, textDecoration: "none" }}>pricing</Link>
          <Link to="/wavelength/login" style={{
            fontFamily: heading, fontSize: "0.85rem", fontWeight: 600, color: c.deep,
            background: spectrum, padding: "0.55rem 1.5rem", borderRadius: "8px",
            textDecoration: "none",
          }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "7rem 2.5rem 4rem", position: "relative", zIndex: 10 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ fontFamily: mono, fontSize: "0.7rem", color: c.muted, letterSpacing: "0.08em", marginBottom: "1.5rem" }}>
            // the ai workspace — tuned to your frequency
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            fontFamily: heading, fontSize: "clamp(2.8rem, 7vw, 5.5rem)", fontWeight: 800,
            lineHeight: 1.0, letterSpacing: "-0.04em", maxWidth: "750px", marginBottom: "1.5rem",
          }}
        >
          Every model.{" "}
          <span style={{
            background: spectrum, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            One signal.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{ fontFamily: mono, fontSize: "0.88rem", color: c.muted, lineHeight: 1.7, maxWidth: "520px", marginBottom: "2.5rem" }}
        >
          Six studios for writing, research, image gen, data analysis, finance, and
          model comparison. Every output saved to your artifact library. All major LLMs, one interface.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
        >
          <Link to="/wavelength/login" style={{
            fontFamily: heading, fontSize: "0.88rem", fontWeight: 700, color: c.deep,
            background: spectrum, padding: "0.8rem 2rem", borderRadius: "10px",
            textDecoration: "none",
          }}>
            Start free
          </Link>
          <Link to="/wavelength/pricing" style={{
            fontFamily: heading, fontSize: "0.88rem", fontWeight: 600, color: c.text,
            background: c.surface, padding: "0.8rem 2rem", borderRadius: "10px",
            textDecoration: "none", border: `1px solid #2a2e42`,
          }}>
            View plans
          </Link>
        </motion.div>

        {/* Animated waveform SVG */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          style={{ marginTop: "4rem" }}
        >
          <svg width="100%" height="120" viewBox="0 0 1200 120" fill="none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="wave-grad" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={c.pink} />
                <stop offset="50%" stopColor={c.orange} />
                <stop offset="100%" stopColor={c.cyan} />
              </linearGradient>
            </defs>
            <motion.path
              d="M0 60 Q50 20, 100 60 T200 60 T300 60 T400 60 T500 60 T600 60 T700 60 T800 60 T900 60 T1000 60 T1100 60 T1200 60"
              stroke="url(#wave-grad)" strokeWidth="2" fill="none" strokeOpacity="0.6"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay: 0.8 }}
            />
            <motion.path
              d="M0 60 Q50 90, 100 60 T200 60 T300 60 T400 60 T500 60 T600 60 T700 60 T800 60 T900 60 T1000 60 T1100 60 T1200 60"
              stroke="url(#wave-grad)" strokeWidth="1.5" fill="none" strokeOpacity="0.3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.5, delay: 1 }}
            />
          </svg>
        </motion.div>
      </section>

      {/* Studios */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 2.5rem 5rem", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2rem" }}>
          <h2 style={{ fontFamily: heading, fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Studios</h2>
          <span style={{ fontFamily: mono, fontSize: "0.68rem", color: c.muted }}>06 frequencies</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
          {studios.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              style={{
                background: c.surface, borderRadius: "12px", padding: "1.5rem",
                border: "1px solid #1e2235", transition: "all 0.25s ease",
                cursor: "default", position: "relative", overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${[c.pink, c.orange, c.cyan, c.violet, c.pink, c.orange][i]}40`;
                e.currentTarget.style.boxShadow = `0 4px 24px ${[c.pink, c.orange, c.cyan, c.violet, c.pink, c.orange][i]}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#1e2235";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontFamily: heading, fontSize: "1rem", fontWeight: 600 }}>{s.name}</span>
                <span style={{ fontFamily: mono, fontSize: "0.6rem", color: c.muted }}>{s.freq}</span>
              </div>
              {/* Mini spectrum bar */}
              <div style={{ width: "100%", height: "3px", borderRadius: "2px", background: `linear-gradient(90deg, ${[c.pink, c.orange, c.cyan, c.violet, c.pink, c.orange][i]}60, transparent)`, marginTop: "0.75rem" }} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2.5rem 6rem", position: "relative", zIndex: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              style={{
                background: c.surface, borderRadius: "16px", padding: "2rem",
                border: "1px solid #1e2235",
              }}
            >
              <div style={{ fontFamily: mono, fontSize: "0.6rem", color: c.muted, marginBottom: "0.75rem" }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 style={{ fontFamily: heading, fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: "0.5rem" }}>
                {f.title}
              </h3>
              <p style={{ fontFamily: mono, fontSize: "0.78rem", color: c.muted, lineHeight: 1.7 }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 10 }}>
        <div style={{
          maxWidth: "1100px", margin: "0 auto 3rem", padding: "4rem 3rem",
          background: c.surface, borderRadius: "24px", textAlign: "center",
          border: "1px solid #1e2235", position: "relative", overflow: "hidden",
        }}>
          {/* Spectrum line at top */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: spectrum }} />

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 style={{ fontFamily: heading, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>
              Tune in to{" "}
              <span style={{ background: spectrum, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                your frequency
              </span>
            </h2>
            <p style={{ fontFamily: mono, fontSize: "0.85rem", color: c.muted, maxWidth: "380px", margin: "0 auto 2rem", lineHeight: 1.65 }}>
              Free to start. No credit card. Upgrade when you need more power.
            </p>
            <Link to="/wavelength/login" style={{
              fontFamily: heading, fontSize: "0.9rem", fontWeight: 700, color: c.deep,
              background: spectrum, padding: "0.85rem 2.5rem", borderRadius: "10px",
              textDecoration: "none", display: "inline-block",
            }}>
              Get started free
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1e2235", position: "relative", zIndex: 10 }}>
        <span style={{ fontFamily: mono, fontSize: "0.72rem", color: "#3a3e55" }}>wavelength</span>
        <Link to="/" style={{ fontFamily: mono, fontSize: "0.72rem", color: "#3a3e55", textDecoration: "none" }}>all variants</Link>
      </footer>
    </div>
  );
}
