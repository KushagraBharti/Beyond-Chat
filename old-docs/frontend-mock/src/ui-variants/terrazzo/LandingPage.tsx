import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";

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

/* SVG terrazzo speckle pattern */
const terrazzo = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='t' x='0' y='0' width='120' height='120' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='15' cy='25' r='2' fill='%23C8553D' opacity='0.15'/%3E%3Ccircle cx='65' cy='10' r='1.5' fill='%237B946B' opacity='0.12'/%3E%3Ccircle cx='100' cy='45' r='2.5' fill='%23D4A574' opacity='0.13'/%3E%3Ccircle cx='35' cy='70' r='1.8' fill='%23C8553D' opacity='0.1'/%3E%3Ccircle cx='80' cy='85' r='2' fill='%237B946B' opacity='0.14'/%3E%3Ccircle cx='50' cy='110' r='1.5' fill='%23D4A574' opacity='0.11'/%3E%3Ccircle cx='10' cy='100' r='2.2' fill='%237B946B' opacity='0.1'/%3E%3Ccircle cx='110' cy='15' r='1.8' fill='%23C8553D' opacity='0.12'/%3E%3Crect x='45' y='40' width='6' height='2' rx='1' fill='%23D4A574' opacity='0.1' transform='rotate(35 48 41)'/%3E%3Crect x='85' y='65' width='5' height='2' rx='1' fill='%23C8553D' opacity='0.09' transform='rotate(-20 87 66)'/%3E%3Crect x='20' y='50' width='4' height='1.5' rx='0.75' fill='%237B946B' opacity='0.1' transform='rotate(55 22 51)'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='120' height='120' fill='url(%23t)'/%3E%3C/svg%3E")`;

const studios = [
  { name: "Writing Studio", icon: "~", color: c.terracotta },
  { name: "Research Lab", icon: "?", color: c.sage },
  { name: "Image Atelier", icon: "◯", color: c.clay },
  { name: "Data Workshop", icon: "#", color: c.terracotta },
  { name: "Finance Desk", icon: "$", color: c.sage },
  { name: "Model Compare", icon: "⟷", color: c.clay },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" } }),
};

export default function TerrazzoLanding() {
  return (
    <div style={{ minHeight: "100vh", background: c.cream, color: c.espresso, fontFamily: sans, position: "relative" }}>
      {/* Terrazzo pattern overlay */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: terrazzo, backgroundSize: "120px 120px", pointerEvents: "none", zIndex: 0 }} />

      {/* Nav */}
      <nav style={{ maxWidth: "1160px", margin: "0 auto", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10 }}>
        <Link to="/terrazzo" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: `linear-gradient(135deg, ${c.terracotta}, ${c.clay})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: c.cream }} />
          </div>
          <span style={{ fontFamily: serif, fontSize: "1.15rem", fontWeight: 600, color: c.espresso }}>Beyond Chat</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link to="/terrazzo/pricing" style={{ fontFamily: sans, fontSize: "0.88rem", fontWeight: 500, color: c.stone, textDecoration: "none" }}>Pricing</Link>
          <Link to="/terrazzo/login" style={{
            fontFamily: sans, fontSize: "0.88rem", fontWeight: 600, color: c.cream,
            background: c.espresso, padding: "0.6rem 1.5rem", borderRadius: "99px",
            textDecoration: "none",
          }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: "1060px", margin: "0 auto", padding: "6rem 2rem 4rem", position: "relative", zIndex: 10 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div style={{ display: "inline-block", fontFamily: sans, fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: c.terracotta, background: `${c.terracotta}14`, padding: "0.4rem 1rem", borderRadius: "99px", marginBottom: "1.5rem" }}>
            Your creative AI workspace
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            fontFamily: serif, fontSize: "clamp(2.5rem, 5.5vw, 4.2rem)", fontWeight: 700,
            lineHeight: 1.08, letterSpacing: "-0.025em", maxWidth: "680px", marginBottom: "1.5rem",
          }}
        >
          Craft with every AI,{" "}
          <span style={{ color: c.terracotta, fontStyle: "italic", fontWeight: 400 }}>all in one place</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          style={{ fontFamily: sans, fontSize: "1.05rem", color: c.stone, lineHeight: 1.65, maxWidth: "480px", marginBottom: "2.5rem" }}
        >
          Six specialized studios for writing, research, image generation, data analysis, and more.
          One beautiful artifact library to keep it all.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
        >
          <Link to="/terrazzo/login" style={{
            fontFamily: sans, fontSize: "0.9rem", fontWeight: 600, color: c.cream,
            background: c.terracotta, padding: "0.75rem 2rem", borderRadius: "99px",
            textDecoration: "none", boxShadow: `0 4px 16px ${c.terracotta}30`,
          }}>
            Start free
          </Link>
          <Link to="/terrazzo/pricing" style={{
            fontFamily: sans, fontSize: "0.9rem", fontWeight: 600, color: c.espresso,
            background: c.sand, padding: "0.75rem 2rem", borderRadius: "99px",
            textDecoration: "none",
          }}>
            View pricing
          </Link>
        </motion.div>
      </section>

      {/* Organic blob section with studios */}
      <section style={{ maxWidth: "1060px", margin: "0 auto", padding: "3rem 2rem 5rem", position: "relative", zIndex: 10 }}>
        <div style={{
          background: c.cream, border: `1px solid ${c.sand}`, borderRadius: "32px",
          padding: "3rem", position: "relative", overflow: "hidden",
          boxShadow: "0 8px 40px rgba(46,31,20,0.05)",
        }}>
          {/* Decorative blobs */}
          <div style={{ position: "absolute", top: "-60px", right: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: `${c.terracotta}08`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "-80px", left: "-30px", width: "250px", height: "250px", borderRadius: "50%", background: `${c.sage}08`, pointerEvents: "none" }} />

          <div style={{ textAlign: "center", marginBottom: "2.5rem", position: "relative" }}>
            <span style={{ fontFamily: sans, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: c.sage }}>Six studios</span>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.02em", marginTop: "0.4rem" }}>
              A studio for every craft
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", position: "relative" }}>
            {studios.map((s, i) => (
              <motion.div
                key={s.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "20px",
                  padding: "1.75rem",
                  border: `1px solid ${c.sand}`,
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = `0 8px 24px ${s.color}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{
                  width: "40px", height: "40px", borderRadius: "12px",
                  background: `${s.color}12`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: serif, fontSize: "1.2rem", color: s.color, fontWeight: 600, marginBottom: "1rem",
                }}>
                  {s.icon}
                </div>
                <h3 style={{ fontFamily: serif, fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                  {s.name}
                </h3>
                <p style={{ fontFamily: sans, fontSize: "0.82rem", color: c.stone, lineHeight: 1.55 }}>
                  Purpose-built tools and prompts tuned for this domain.
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: "1060px", margin: "0 auto", padding: "2rem 2rem 5rem", position: "relative", zIndex: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
          <div>
            <span style={{ fontFamily: sans, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: c.terracotta }}>Artifact Library</span>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.02em", marginTop: "0.4rem", marginBottom: "1rem" }}>
              Everything you create, <span style={{ fontStyle: "italic", fontWeight: 400, color: c.terracotta }}>preserved</span>
            </h2>
            <p style={{ fontFamily: sans, fontSize: "0.95rem", color: c.stone, lineHeight: 1.65, marginBottom: "1.5rem" }}>
              Every output becomes an artifact — tagged, searchable, and organized by workspace.
              Export as PDF or Markdown. Build on past work instead of starting over.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {["Auto-tagged by studio & model", "Full-text search across everything", "Version history on every artifact"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.sage, flexShrink: 0 }} />
                  <span style={{ fontFamily: sans, fontSize: "0.88rem", color: c.espresso }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Decorative card stack */}
          <div style={{ position: "relative", height: "320px" }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, rotate: (i - 1) * 3 }}
                whileInView={{ opacity: 1, y: 0, rotate: (i - 1) * 3 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                style={{
                  position: "absolute",
                  top: `${i * 20}px`, left: `${i * 15}px`,
                  width: "85%", height: "240px",
                  background: "#fff", borderRadius: "20px",
                  border: `1px solid ${c.sand}`,
                  boxShadow: "0 4px 20px rgba(46,31,20,0.06)",
                  padding: "1.5rem",
                }}
              >
                <div style={{ width: "50%", height: "12px", background: c.sand, borderRadius: "6px", marginBottom: "0.75rem" }} />
                <div style={{ width: "80%", height: "8px", background: `${c.sand}80`, borderRadius: "4px", marginBottom: "0.5rem" }} />
                <div style={{ width: "65%", height: "8px", background: `${c.sand}60`, borderRadius: "4px", marginBottom: "1.5rem" }} />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <div style={{ width: "60px", height: "22px", background: `${[c.terracotta, c.sage, c.clay][i]}15`, borderRadius: "99px" }} />
                  <div style={{ width: "50px", height: "22px", background: `${c.sand}80`, borderRadius: "99px" }} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        margin: "0 2rem 4rem", borderRadius: "32px", padding: "4rem 3rem",
        background: c.espresso, color: c.cream, textAlign: "center",
        maxWidth: "1060px", marginLeft: "auto", marginRight: "auto",
        position: "relative", zIndex: 10, overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", borderRadius: "50%", background: `${c.terracotta}20`, pointerEvents: "none" }} />
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 style={{ fontFamily: serif, fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>
            Ready to start crafting?
          </h2>
          <p style={{ fontFamily: sans, fontSize: "0.95rem", color: `${c.cream}AA`, lineHeight: 1.6, maxWidth: "380px", margin: "0 auto 2rem" }}>
            Free to start. No credit card. Upgrade when you're ready.
          </p>
          <Link to="/terrazzo/login" style={{
            fontFamily: sans, fontSize: "0.9rem", fontWeight: 600, color: c.espresso,
            background: c.clay, padding: "0.8rem 2.5rem", borderRadius: "99px",
            textDecoration: "none", display: "inline-block",
          }}>
            Start for free
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ maxWidth: "1160px", margin: "0 auto", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${c.sand}`, position: "relative", zIndex: 10 }}>
        <span style={{ fontFamily: sans, fontSize: "0.8rem", color: c.stone }}>Beyond Chat</span>
        <Link to="/" style={{ fontFamily: sans, fontSize: "0.8rem", color: c.stone, textDecoration: "none" }}>All variants</Link>
      </footer>
    </div>
  );
}
