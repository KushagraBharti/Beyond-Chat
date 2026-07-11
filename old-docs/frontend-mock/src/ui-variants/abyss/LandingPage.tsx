import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/*
 * ABYSS — Cinematic Void / Deep Dark
 * Fonts: JetBrains Mono (headings/mono) + Instrument Sans (body)
 * Colors: True black (#000), bioluminescent teal (#00E5CC), deep violet (#8B5CF6)
 * Texture: Grain overlay, scanline hints, soft radial glows
 * Layout: Minimal, centered, floating in negative space
 * Feel: Terminal meets deep ocean — contemplative, immersive, powerful
 */

const mono = "'JetBrains Mono', monospace";
const sans = "'Instrument Sans', sans-serif";
const teal = "#00E5CC";
const violet = "#8B5CF6";

const studios = [
  { name: "writing", desc: "Structured drafting with constraints and iterative refinement." },
  { name: "research", desc: "Multi-step investigations producing structured analytical reports." },
  { name: "image", desc: "Prompt engineering, variant generation, and visual library curation." },
  { name: "data", desc: "Tabular upload, transformation pipelines, and statistical insights." },
  { name: "finance", desc: "Autonomous agent research with transparent step-by-step output." },
  { name: "compare", desc: "Same prompt across multiple models. Side-by-side. Keep the best." },
];

// Noise texture as inline SVG data URI
const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

export default function AbyssLanding() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#e0e0e0",
        fontFamily: sans,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grain overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: noiseTexture,
          opacity: 0.04,
          pointerEvents: "none",
          zIndex: 100,
          mixBlendMode: "overlay",
        }}
      />

      {/* Bioluminescent glows */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "10%", left: "20%", width: "500px", height: "500px", background: `radial-gradient(circle, ${teal}08 0%, transparent 70%)`, filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "15%", width: "400px", height: "400px", background: `radial-gradient(circle, ${violet}06 0%, transparent 70%)`, filter: "blur(80px)" }} />
      </div>

      {/* Nav */}
      <nav
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        <Link
          to="/abyss"
          style={{
            fontFamily: mono,
            fontSize: "0.85rem",
            fontWeight: 500,
            color: teal,
            textDecoration: "none",
            letterSpacing: "0.05em",
            opacity: 0.8,
          }}
        >
          beyond_chat
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link to="/abyss/pricing" style={{ fontFamily: mono, fontSize: "0.7rem", color: "#555", textDecoration: "none", letterSpacing: "0.08em" }}>
            pricing
          </Link>
          <Link
            to="/abyss/login"
            style={{
              fontFamily: mono,
              fontSize: "0.7rem",
              color: "#000",
              textDecoration: "none",
              letterSpacing: "0.08em",
              background: teal,
              padding: "0.5rem 1.25rem",
              borderRadius: "2px",
            }}
          >
            enter
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "8rem 2rem 6rem",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <p
            style={{
              fontFamily: mono,
              fontSize: "0.65rem",
              textTransform: "uppercase",
              letterSpacing: "0.4em",
              color: "#444",
              marginBottom: "2.5rem",
            }}
          >
            // modular ai workspace
          </p>

          <h1
            style={{
              fontFamily: mono,
              fontSize: "clamp(2.2rem, 6vw, 4.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              marginBottom: "2rem",
            }}
          >
            <span style={{ color: "#fff" }}>beyond</span>
            <br />
            <span
              style={{
                background: `linear-gradient(135deg, ${teal}, ${violet})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              the chat window
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            style={{
              fontFamily: sans,
              fontSize: "1.1rem",
              color: "#666",
              maxWidth: "480px",
              margin: "0 auto 3rem",
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            Six purpose-built studios. Every output persisted as a searchable
            artifact. Multi-model comparison in real time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            style={{ display: "flex", justifyContent: "center", gap: "1rem" }}
          >
            <Link
              to="/abyss/login"
              style={{
                fontFamily: mono,
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "#000",
                textDecoration: "none",
                background: teal,
                padding: "0.8rem 2rem",
                borderRadius: "2px",
                letterSpacing: "0.05em",
                transition: "all 0.3s ease",
                boxShadow: `0 0 20px ${teal}20`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 40px ${teal}40`)}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = `0 0 20px ${teal}20`)}
            >
              launch workspace
            </Link>
            <a
              href="#studios"
              style={{
                fontFamily: mono,
                fontSize: "0.8rem",
                fontWeight: 400,
                color: "#555",
                textDecoration: "none",
                padding: "0.8rem 2rem",
                border: "1px solid #222",
                borderRadius: "2px",
                letterSpacing: "0.05em",
                transition: "border-color 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#444")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#222")}
            >
              explore
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Studios */}
      <section
        id="studios"
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "0 2rem 6rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <p style={{ fontFamily: mono, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.4em", color: "#444", marginBottom: "0.75rem" }}>
            // studios
          </p>
          <h2 style={{ fontFamily: mono, fontSize: "1.5rem", fontWeight: 600, color: "#ccc", letterSpacing: "-0.02em" }}>
            six environments
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {studios.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr",
                gap: "2rem",
                padding: "1.5rem 0",
                borderBottom: "1px solid #151515",
                alignItems: "baseline",
                cursor: "default",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = "#333")}
              onMouseLeave={(e) => (e.currentTarget.style.borderBottomColor = "#151515")}
            >
              <span
                style={{
                  fontFamily: mono,
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: teal,
                  opacity: 0.6,
                  letterSpacing: "0.02em",
                }}
              >
                {s.name}
              </span>
              <span
                style={{
                  fontFamily: sans,
                  fontSize: "0.9rem",
                  color: "#555",
                  lineHeight: 1.6,
                }}
              >
                {s.desc}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "0 2rem 8rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "3rem" }}>
          {[
            { label: "artifacts", title: "Persistent memory", desc: "Every output saved. Searchable by type, studio, date, tag. Attach to any future request.", color: teal },
            { label: "compare", title: "Multi-model", desc: "Same input. GPT-4, Claude, Gemini, Llama. Side-by-side results. Keep the best.", color: violet },
            { label: "security", title: "Zero-knowledge", desc: "Row-level security. Encrypted at rest. Workspace isolation. No training on your data.", color: teal },
          ].map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <p style={{ fontFamily: mono, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.3em", color: f.color, opacity: 0.5, marginBottom: "1rem" }}>
                // {f.label}
              </p>
              <h3 style={{ fontFamily: mono, fontSize: "1.1rem", fontWeight: 600, color: "#ccc", marginBottom: "0.75rem", letterSpacing: "-0.01em" }}>
                {f.title}
              </h3>
              <p style={{ fontFamily: sans, fontSize: "0.88rem", color: "#555", lineHeight: 1.65 }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: "600px", margin: "0 auto", padding: "0 2rem 8rem", textAlign: "center", position: "relative", zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <div style={{ width: "1px", height: "60px", background: `linear-gradient(to bottom, transparent, ${teal}40)`, margin: "0 auto 3rem" }} />
          <h2 style={{ fontFamily: mono, fontSize: "1.5rem", fontWeight: 600, color: "#ccc", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            ready to descend?
          </h2>
          <p style={{ fontFamily: sans, fontSize: "0.95rem", color: "#444", marginBottom: "2.5rem", lineHeight: 1.7 }}>
            Free tier. No credit card. Your workspace awaits.
          </p>
          <Link
            to="/abyss/login"
            style={{
              fontFamily: mono,
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "#000",
              textDecoration: "none",
              background: teal,
              padding: "0.8rem 2.5rem",
              borderRadius: "2px",
              letterSpacing: "0.05em",
              boxShadow: `0 0 30px ${teal}25`,
            }}
          >
            enter the abyss
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #111", padding: "1.5rem 2rem", maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", position: "relative", zIndex: 10 }}>
        <span style={{ fontFamily: mono, fontSize: "0.65rem", color: "#333", letterSpacing: "0.05em" }}>beyond_chat</span>
        <Link to="/" style={{ fontFamily: mono, fontSize: "0.65rem", color: "#333", textDecoration: "none", letterSpacing: "0.05em" }}>[all variants]</Link>
      </footer>
    </div>
  );
}
