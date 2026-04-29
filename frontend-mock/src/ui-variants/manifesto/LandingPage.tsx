import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

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

const studios = [
  { name: "WRITING", num: "001" },
  { name: "RESEARCH", num: "002" },
  { name: "IMAGE", num: "003" },
  { name: "DATA", num: "004" },
  { name: "FINANCE", num: "005" },
  { name: "MODEL COMPARE", num: "006" },
];

const features = [
  { title: "ARTIFACT LIBRARY", desc: "Every output saved. Tagged. Searchable. Your personal knowledge archive grows with each session." },
  { title: "MULTI-MODEL", desc: "Run GPT-4, Claude, Gemini, Llama side by side. Same prompt, different minds. Pick the winner." },
  { title: "CONTEXT BUILDER", desc: "Upload files, paste URLs, stack references. Build rich prompts that actually understand your world." },
  { title: "WORKSPACES", desc: "Isolate projects. Share with teams. Everything scoped, nothing bleeds. True workspace-level separation." },
];

export default function ManifestoLanding() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.black, position: "relative", overflow: "hidden" }}>
      {/* Grain overlay */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: grain, backgroundSize: "256px 256px", pointerEvents: "none", zIndex: 100 }} />

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "1.25rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: `${c.bg}E6`, backdropFilter: "blur(8px)", borderBottom: `2px solid ${c.black}` }}>
        <Link to="/manifesto" style={{ textDecoration: "none", fontFamily: display, fontSize: "1.1rem", color: c.black, letterSpacing: "-0.02em" }}>
          BEYOND<span style={{ color: c.neon, background: c.black, padding: "0 0.3rem", marginLeft: "0.2rem" }}>CHAT</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link to="/manifesto/pricing" style={{ fontFamily: mono, fontSize: "0.75rem", color: c.black, textDecoration: "none", letterSpacing: "0.05em" }}>PRICING</Link>
          <Link to="/manifesto/login" style={{ fontFamily: mono, fontSize: "0.75rem", color: c.black, background: c.neon, padding: "0.6rem 1.5rem", textDecoration: "none", letterSpacing: "0.05em", border: `2px solid ${c.black}` }}>
            ENTER
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "8rem 2.5rem 4rem", position: "relative" }}>
        {/* Giant background text */}
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -50%) translateY(${scrollY * 0.1}px)`,
          fontFamily: display, fontSize: "clamp(8rem, 22vw, 20rem)", color: "transparent",
          WebkitTextStroke: `2px ${c.rule}`, letterSpacing: "-0.05em", whiteSpace: "nowrap",
          pointerEvents: "none", userSelect: "none", lineHeight: 0.85,
        }}>
          BEYOND
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <div style={{ fontFamily: mono, fontSize: "0.7rem", letterSpacing: "0.15em", color: c.gray, marginBottom: "2rem" }}>
            THE AI WORKSPACE — EST. 2025
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          style={{
            fontFamily: display, fontSize: "clamp(3rem, 8vw, 7.5rem)", lineHeight: 0.9,
            letterSpacing: "-0.04em", maxWidth: "900px", marginBottom: "2rem", position: "relative",
          }}
        >
          WORK WITH
          <br />
          <span style={{ position: "relative", display: "inline-block" }}>
            EVERY
            <div style={{ position: "absolute", bottom: "0.1em", left: 0, right: 0, height: "0.25em", background: c.neon, zIndex: -1 }} />
          </span>{" "}
          AI.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          style={{ fontFamily: mono, fontSize: "0.95rem", lineHeight: 1.7, color: c.gray, maxWidth: "520px", marginBottom: "3rem" }}
        >
          Six specialized studios. One artifact library.
          Every major model through a single interface.
          Build, compare, export — no context switching.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
        >
          <Link to="/manifesto/login" style={{
            fontFamily: mono, fontSize: "0.8rem", fontWeight: 700, color: c.black, background: c.neon,
            padding: "1rem 2.5rem", textDecoration: "none", border: `2px solid ${c.black}`,
            letterSpacing: "0.08em", transition: "all 0.15s ease",
          }}>
            START FREE →
          </Link>
          <Link to="/manifesto/pricing" style={{
            fontFamily: mono, fontSize: "0.8rem", fontWeight: 700, color: c.black, background: "transparent",
            padding: "1rem 2.5rem", textDecoration: "none", border: `2px solid ${c.black}`,
            letterSpacing: "0.08em",
          }}>
            VIEW PLANS
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={{ position: "absolute", bottom: "2rem", left: "2.5rem", fontFamily: mono, fontSize: "0.65rem", letterSpacing: "0.15em", color: c.gray, writingMode: "vertical-rl" }}
        >
          SCROLL ↓
        </motion.div>
      </section>

      {/* Studios strip */}
      <section style={{ borderTop: `2px solid ${c.black}`, borderBottom: `2px solid ${c.black}`, overflow: "hidden" }}>
        <motion.div
          animate={{ x: [0, -1200] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ display: "flex", whiteSpace: "nowrap", padding: "1.25rem 0" }}
        >
          {[...studios, ...studios, ...studios, ...studios].map((s, i) => (
            <span key={i} style={{ fontFamily: display, fontSize: "1.1rem", letterSpacing: "0.05em", padding: "0 2rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontFamily: mono, fontSize: "0.6rem", color: c.gray }}>{s.num}</span>
              {s.name}
              <span style={{ width: "6px", height: "6px", background: c.neon, display: "inline-block" }} />
            </span>
          ))}
        </motion.div>
      </section>

      {/* Features grid */}
      <section style={{ padding: "6rem 2.5rem", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "4rem", borderBottom: `2px solid ${c.black}`, paddingBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: display, fontSize: "clamp(2rem, 5vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 0.95 }}>
            BUILT<br />DIFFERENT.
          </h2>
          <span style={{ fontFamily: mono, fontSize: "0.65rem", color: c.gray, letterSpacing: "0.1em" }}>04 PILLARS</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0" }}>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                padding: "2.5rem",
                borderRight: i % 2 === 0 ? `2px solid ${c.black}` : "none",
                borderBottom: i < 2 ? `2px solid ${c.black}` : "none",
              }}
            >
              <div style={{ fontFamily: mono, fontSize: "0.6rem", color: c.gray, letterSpacing: "0.15em", marginBottom: "1rem" }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 style={{ fontFamily: display, fontSize: "1.3rem", letterSpacing: "-0.01em", marginBottom: "0.75rem" }}>
                {f.title}
              </h3>
              <p style={{ fontFamily: mono, fontSize: "0.8rem", color: c.gray, lineHeight: 1.7 }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Giant CTA */}
      <section style={{ background: c.black, color: c.bg, padding: "6rem 2.5rem", textAlign: "center" }}>
        <motion.h2
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ fontFamily: display, fontSize: "clamp(2.5rem, 7vw, 6rem)", letterSpacing: "-0.04em", lineHeight: 0.9, marginBottom: "2rem" }}
        >
          STOP<br />
          <span style={{ color: c.neon }}>SWITCHING</span><br />
          TABS.
        </motion.h2>
        <p style={{ fontFamily: mono, fontSize: "0.85rem", color: "#888", maxWidth: "400px", margin: "0 auto 3rem", lineHeight: 1.7 }}>
          One workspace. Every model. All your artifacts in one place. Free to start.
        </p>
        <Link to="/manifesto/login" style={{
          fontFamily: mono, fontSize: "0.85rem", fontWeight: 700, color: c.black, background: c.neon,
          padding: "1.1rem 3rem", textDecoration: "none", border: `2px solid ${c.neon}`,
          letterSpacing: "0.08em", display: "inline-block",
        }}>
          GET STARTED FREE →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: "1.5rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${c.black}` }}>
        <span style={{ fontFamily: mono, fontSize: "0.7rem", color: c.gray, letterSpacing: "0.05em" }}>BEYOND CHAT © 2025</span>
        <Link to="/" style={{ fontFamily: mono, fontSize: "0.7rem", color: c.gray, textDecoration: "none", letterSpacing: "0.05em" }}>ALL VARIANTS</Link>
      </footer>
    </div>
  );
}
