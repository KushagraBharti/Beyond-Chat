import { Link } from "react-router-dom";
import { motion } from "framer-motion";

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

const studios = [
  { name: "Writing", jp: "writing" },
  { name: "Research", jp: "research" },
  { name: "Image", jp: "image" },
  { name: "Data", jp: "data" },
  { name: "Finance", jp: "finance" },
  { name: "Compare", jp: "compare" },
];

const principles = [
  { title: "Artifact Library", desc: "Every output becomes a permanent artifact. Tagged, searchable, versioned. Your creative archive grows with each session." },
  { title: "Multi-Model", desc: "GPT-4, Claude, Gemini, Llama — all accessible through a single, calm interface. Compare results side by side." },
  { title: "Context Builder", desc: "Upload files, paste references, construct rich prompts. Give your models the full picture before they begin." },
];

export default function ZenithLanding() {
  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: sans }}>
      {/* Nav */}
      <nav style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/zenith" style={{ textDecoration: "none", fontFamily: serif, fontSize: "1.15rem", fontWeight: 500, color: c.text, letterSpacing: "-0.01em", fontStyle: "italic" }}>
          Beyond Chat
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link to="/zenith/pricing" style={{ fontFamily: sans, fontSize: "0.82rem", color: c.stone, textDecoration: "none", fontWeight: 400 }}>Pricing</Link>
          <Link to="/zenith/login" style={{ fontFamily: sans, fontSize: "0.82rem", color: c.text, textDecoration: "none", fontWeight: 500, borderBottom: `1px solid ${c.text}`, paddingBottom: "2px" }}>
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero — extreme whitespace */}
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "8rem 2rem 6rem" }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, ease: "easeOut" }}>
          <p style={{ fontFamily: sans, fontSize: "0.72rem", fontWeight: 400, letterSpacing: "0.2em", color: c.stone, textTransform: "uppercase", marginBottom: "2.5rem" }}>
            The AI Workspace
          </p>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
          style={{
            fontFamily: serif, fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 400,
            lineHeight: 1.15, letterSpacing: "-0.02em", maxWidth: "600px",
            fontStyle: "italic",
          }}
        >
          Work with every model.
          <br />
          <span style={{ fontStyle: "normal", fontWeight: 600 }}>Keep everything.</span>
        </motion.h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          style={{ width: "60px", height: "1px", background: c.blush, marginTop: "3rem", marginBottom: "3rem", transformOrigin: "left" }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          style={{ fontFamily: sans, fontSize: "1rem", fontWeight: 400, color: c.stone, lineHeight: 1.75, maxWidth: "460px" }}
        >
          Six specialized studios for writing, research, image generation, data, finance,
          and model comparison. One artifact library to keep it all.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          style={{ marginTop: "3rem", display: "flex", gap: "1.5rem", alignItems: "center" }}
        >
          <Link to="/zenith/login" style={{
            fontFamily: sans, fontSize: "0.85rem", fontWeight: 500, color: c.text,
            textDecoration: "none", borderBottom: `1px solid ${c.text}`, paddingBottom: "3px",
            letterSpacing: "0.02em",
          }}>
            Start free
          </Link>
          <Link to="/zenith/pricing" style={{
            fontFamily: sans, fontSize: "0.85rem", fontWeight: 400, color: c.stone,
            textDecoration: "none", letterSpacing: "0.02em",
          }}>
            View pricing
          </Link>
        </motion.div>
      </section>

      {/* Thin full-width divider */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 2rem" }}>
        <div style={{ height: "1px", background: c.line }} />
      </div>

      {/* Studios — minimal list */}
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "5rem 2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3rem" }}>
          <h2 style={{ fontFamily: serif, fontSize: "1.5rem", fontWeight: 400, fontStyle: "italic" }}>Six studios</h2>
        </div>

        <div>
          {studios.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "1.25rem 0", borderBottom: `1px solid ${c.line}`,
              }}
            >
              <span style={{ fontFamily: sans, fontSize: "0.95rem", fontWeight: 500, letterSpacing: "0.01em" }}>
                {s.name}
              </span>
              <span style={{ fontFamily: sans, fontSize: "0.7rem", fontWeight: 400, color: c.stone, letterSpacing: "0.1em" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 2rem" }}>
        <div style={{ height: "1px", background: c.line }} />
      </div>

      {/* Principles */}
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "5rem 2rem" }}>
        <h2 style={{ fontFamily: serif, fontSize: "1.5rem", fontWeight: 400, fontStyle: "italic", marginBottom: "3rem" }}>
          How it works
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3rem" }}>
          {principles.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
            >
              <div style={{ fontFamily: sans, fontSize: "0.65rem", fontWeight: 400, letterSpacing: "0.15em", color: c.stone, marginBottom: "1rem" }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 style={{ fontFamily: serif, fontSize: "1.1rem", fontWeight: 500, fontStyle: "italic", marginBottom: "0.75rem" }}>
                {p.title}
              </h3>
              <p style={{ fontFamily: sans, fontSize: "0.85rem", fontWeight: 400, color: c.stone, lineHeight: 1.7 }}>
                {p.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA — barely there */}
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "4rem 2rem 8rem", textAlign: "center" }}>
        <div style={{ height: "1px", background: c.line, marginBottom: "4rem" }} />
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <p style={{ fontFamily: serif, fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 400, fontStyle: "italic", color: c.text, marginBottom: "2rem", lineHeight: 1.3 }}>
            Begin simply.
          </p>
          <Link to="/zenith/login" style={{
            fontFamily: sans, fontSize: "0.85rem", fontWeight: 500, color: c.text,
            textDecoration: "none", borderBottom: `1px solid ${c.text}`, paddingBottom: "3px",
            letterSpacing: "0.02em",
          }}>
            Start free
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ maxWidth: "1000px", margin: "0 auto", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${c.line}` }}>
        <span style={{ fontFamily: sans, fontSize: "0.75rem", fontWeight: 400, color: c.stone }}>Beyond Chat</span>
        <Link to="/" style={{ fontFamily: sans, fontSize: "0.75rem", fontWeight: 400, color: c.stone, textDecoration: "none" }}>All variants</Link>
      </footer>
    </div>
  );
}
