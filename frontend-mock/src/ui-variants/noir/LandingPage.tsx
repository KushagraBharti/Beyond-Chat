import { Link } from "react-router-dom";
import { motion } from "framer-motion";

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

/* Venetian blind effect via repeating gradient */
const blinds = "repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(212,168,67,0.03) 8px, rgba(212,168,67,0.03) 9px)";

const studios = [
  { name: "Writing", desc: "Long-form, summaries, rewrites, tone shifts" },
  { name: "Research", desc: "Deep dives, fact-checking, source synthesis" },
  { name: "Image", desc: "Generation, editing, style transfer" },
  { name: "Data", desc: "Analysis, visualization, pattern extraction" },
  { name: "Finance", desc: "Projections, reports, market analysis" },
  { name: "Compare", desc: "Run prompts against multiple models" },
];

export default function NoirLanding() {
  return (
    <div style={{ minHeight: "100vh", background: c.void, color: c.warm, fontFamily: body, position: "relative", overflow: "hidden" }}>
      {/* Venetian blind overlay */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: blinds, pointerEvents: "none", zIndex: 1 }} />

      {/* Diagonal light shaft */}
      <div style={{
        position: "fixed", top: "-20%", right: "-10%", width: "60%", height: "140%",
        background: "linear-gradient(135deg, transparent 0%, rgba(212,168,67,0.02) 40%, rgba(212,168,67,0.04) 50%, transparent 60%)",
        transform: "rotate(-15deg)", pointerEvents: "none", zIndex: 1,
      }} />

      {/* Nav */}
      <nav style={{
        maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 2.5rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "relative", zIndex: 10, borderBottom: `1px solid ${c.line}`,
      }}>
        <Link to="/noir" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
          <span style={{ fontFamily: condensed, fontSize: "1.6rem", color: c.warm, letterSpacing: "0.05em" }}>BEYOND</span>
          <span style={{ fontFamily: condensed, fontSize: "1.6rem", color: c.gold, letterSpacing: "0.05em" }}>CHAT</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link to="/noir/pricing" style={{ fontFamily: body, fontSize: "0.8rem", color: c.smoke, textDecoration: "none", letterSpacing: "0.04em", fontWeight: 400 }}>Pricing</Link>
          <Link to="/noir/login" style={{
            fontFamily: condensed, fontSize: "1rem", color: c.void, background: c.gold,
            padding: "0.5rem 1.8rem", textDecoration: "none", letterSpacing: "0.1em",
          }}>
            ENTER
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "8rem 2.5rem 6rem", position: "relative", zIndex: 10 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
          <div style={{ fontFamily: body, fontSize: "0.7rem", fontWeight: 300, letterSpacing: "0.25em", color: c.gold, textTransform: "uppercase", marginBottom: "2rem" }}>
            The AI Workspace
          </div>
        </motion.div>

        <div style={{ position: "relative" }}>
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              fontFamily: condensed, fontSize: "clamp(4rem, 12vw, 10rem)", lineHeight: 0.88,
              letterSpacing: "0.02em", marginBottom: "2rem",
            }}
          >
            EVERY<br />
            <span style={{ color: c.gold }}>MODEL.</span><br />
            ONE STAGE.
          </motion.h1>

          {/* Gold accent line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{ width: "80px", height: "2px", background: c.gold, transformOrigin: "left", marginBottom: "2rem" }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{ display: "flex", gap: "3rem", maxWidth: "700px" }}
        >
          <p style={{ fontFamily: body, fontSize: "0.95rem", fontWeight: 300, color: c.smoke, lineHeight: 1.75, flex: 1 }}>
            Six specialized studios — writing, research, image, data, finance, and model comparison.
            Every output preserved in your artifact library.
          </p>
          <p style={{ fontFamily: body, fontSize: "0.95rem", fontWeight: 300, color: c.smoke, lineHeight: 1.75, flex: 1 }}>
            All major LLMs through a single interface. Build context, compare results, export anything.
            Your workspace, your rules.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          style={{ marginTop: "3rem", display: "flex", gap: "1rem" }}
        >
          <Link to="/noir/login" style={{
            fontFamily: condensed, fontSize: "1.05rem", color: c.void, background: c.gold,
            padding: "0.8rem 2.5rem", textDecoration: "none", letterSpacing: "0.12em",
            transition: "all 0.2s",
          }}>
            GET STARTED
          </Link>
          <Link to="/noir/pricing" style={{
            fontFamily: condensed, fontSize: "1.05rem", color: c.warm, background: "transparent",
            padding: "0.8rem 2.5rem", textDecoration: "none", letterSpacing: "0.12em",
            border: `1px solid ${c.line}`, transition: "all 0.2s",
          }}>
            VIEW PLANS
          </Link>
        </motion.div>
      </section>

      {/* Studios */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2.5rem 6rem", position: "relative", zIndex: 10 }}>
        <div style={{ borderTop: `1px solid ${c.line}`, paddingTop: "3rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3rem" }}>
            <h2 style={{ fontFamily: condensed, fontSize: "2.5rem", letterSpacing: "0.05em" }}>THE STUDIOS</h2>
            <span style={{ fontFamily: body, fontSize: "0.7rem", fontWeight: 300, letterSpacing: "0.2em", color: c.smoke }}>06 SPACES</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0" }}>
            {studios.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                style={{
                  padding: "2rem",
                  borderRight: (i + 1) % 3 !== 0 ? `1px solid ${c.line}` : "none",
                  borderBottom: i < 3 ? `1px solid ${c.line}` : "none",
                  transition: "background 0.3s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = c.surface}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ fontFamily: body, fontSize: "0.6rem", fontWeight: 300, letterSpacing: "0.2em", color: c.gold, marginBottom: "1rem" }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 style={{ fontFamily: condensed, fontSize: "1.6rem", letterSpacing: "0.04em", marginBottom: "0.5rem" }}>
                  {s.name.toUpperCase()}
                </h3>
                <p style={{ fontFamily: body, fontSize: "0.82rem", fontWeight: 300, color: c.smoke, lineHeight: 1.6 }}>
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature spotlight */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2.5rem 6rem", position: "relative", zIndex: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center", borderTop: `1px solid ${c.line}`, paddingTop: "4rem" }}>
          <div>
            <div style={{ fontFamily: body, fontSize: "0.7rem", fontWeight: 300, letterSpacing: "0.25em", color: c.gold, textTransform: "uppercase", marginBottom: "1.5rem" }}>
              Artifact Library
            </div>
            <h2 style={{ fontFamily: condensed, fontSize: "clamp(2rem, 4vw, 3.5rem)", letterSpacing: "0.03em", lineHeight: 0.95, marginBottom: "1.5rem" }}>
              NOTHING<br />GETS LOST
            </h2>
            <p style={{ fontFamily: body, fontSize: "0.9rem", fontWeight: 300, color: c.smoke, lineHeight: 1.75 }}>
              Every generation becomes a permanent artifact. Tagged by studio, model, and timestamp.
              Full-text search. Version history. Export as PDF or Markdown.
              Your work compounds — nothing disappears into a chat scroll.
            </p>
          </div>
          {/* Dramatic card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{
              background: c.surface, border: `1px solid ${c.line}`, padding: "2.5rem",
              position: "relative", overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, width: "2px", height: "100%", background: c.gold }} />
            <div style={{ fontFamily: body, fontSize: "0.6rem", fontWeight: 300, letterSpacing: "0.2em", color: c.gold, marginBottom: "1.5rem" }}>ARTIFACT PREVIEW</div>
            <div style={{ width: "70%", height: "10px", background: c.line, marginBottom: "0.8rem" }} />
            <div style={{ width: "90%", height: "8px", background: `${c.line}80`, marginBottom: "0.6rem" }} />
            <div style={{ width: "55%", height: "8px", background: `${c.line}60`, marginBottom: "1.5rem" }} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ padding: "0.3rem 0.8rem", background: `${c.gold}15`, fontFamily: body, fontSize: "0.6rem", color: c.gold, letterSpacing: "0.1em" }}>WRITING</div>
              <div style={{ padding: "0.3rem 0.8rem", background: c.line, fontFamily: body, fontSize: "0.6rem", color: c.smoke, letterSpacing: "0.1em" }}>GPT-4</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ borderTop: `1px solid ${c.line}`, position: "relative", zIndex: 10 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "6rem 2.5rem", textAlign: "center" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 style={{ fontFamily: condensed, fontSize: "clamp(3rem, 8vw, 6rem)", letterSpacing: "0.03em", lineHeight: 0.9, marginBottom: "1.5rem" }}>
              TAKE THE<br /><span style={{ color: c.gold }}>STAGE</span>
            </h2>
            <p style={{ fontFamily: body, fontSize: "0.9rem", fontWeight: 300, color: c.smoke, maxWidth: "350px", margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
              Free to start. No credit card required. Your workspace is waiting.
            </p>
            <Link to="/noir/login" style={{
              fontFamily: condensed, fontSize: "1.1rem", color: c.void, background: c.gold,
              padding: "0.9rem 3rem", textDecoration: "none", letterSpacing: "0.12em",
              display: "inline-block",
            }}>
              BEGIN NOW
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${c.line}`, position: "relative", zIndex: 10 }}>
        <span style={{ fontFamily: body, fontSize: "0.75rem", fontWeight: 300, color: "#444" }}>Beyond Chat</span>
        <Link to="/" style={{ fontFamily: body, fontSize: "0.75rem", fontWeight: 300, color: "#444", textDecoration: "none" }}>All variants</Link>
      </footer>
    </div>
  );
}
