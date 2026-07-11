import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const mono = "'JetBrains Mono', monospace";
const sans = "'Instrument Sans', sans-serif";
const teal = "#00E5CC";
const violet = "#8B5CF6";

const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

const tiers = [
  {
    name: "free",
    price: "$0",
    sub: "forever",
    features: [
      "3 studios",
      "50 runs / month",
      "100 artifacts",
      "1 workspace",
      "community support",
    ],
    cta: "begin",
    glow: "transparent",
  },
  {
    name: "pro",
    price: "$20",
    sub: "/month",
    highlight: true,
    features: [
      "all 6 studios",
      "unlimited runs",
      "unlimited artifacts",
      "model compare (5 models)",
      "context builder + uploads",
      "pdf & markdown export",
      "5 workspaces",
      "priority support",
    ],
    cta: "upgrade",
    glow: teal,
  },
  {
    name: "team",
    price: "$40",
    sub: "/seat/mo",
    features: [
      "everything in pro",
      "unlimited workspaces",
      "shared artifact library",
      "team collaboration",
      "admin dashboard",
      "sso & audit logs",
      "dedicated support",
    ],
    cta: "contact",
    glow: violet,
  },
];

const faqs = [
  { q: "Can I change plans?", a: "Yes. Upgrades are instant. Downgrades take effect at the next billing cycle." },
  { q: "Which models are available?", a: "GPT-4, Claude, Gemini, Llama, Mistral, and more via OpenRouter." },
  { q: "How is data protected?", a: "Row-level security, AES-256 encryption, workspace isolation, zero training." },
  { q: "Do I need my own API keys?", a: "No. Pro and Team include credits. Free tier has a monthly run cap." },
];

export default function AbyssPricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#e0e0e0", fontFamily: sans, position: "relative", overflow: "hidden" }}>
      {/* Grain */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: noiseTexture, opacity: 0.04, pointerEvents: "none", zIndex: 100, mixBlendMode: "overlay" }} />

      {/* Glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "20%", left: "30%", width: "400px", height: "400px", background: `radial-gradient(circle, ${teal}06 0%, transparent 70%)`, filter: "blur(80px)" }} />
      </div>

      {/* Nav */}
      <nav style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10 }}>
        <Link to="/abyss" style={{ fontFamily: mono, fontSize: "0.85rem", fontWeight: 500, color: teal, textDecoration: "none", letterSpacing: "0.05em", opacity: 0.8 }}>
          beyond_chat
        </Link>
        <Link to="/abyss/login" style={{ fontFamily: mono, fontSize: "0.7rem", color: "#000", textDecoration: "none", letterSpacing: "0.08em", background: teal, padding: "0.5rem 1.25rem", borderRadius: "2px" }}>
          enter
        </Link>
      </nav>

      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 2rem", position: "relative", zIndex: 10 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} style={{ textAlign: "center", padding: "4rem 0 3rem" }}>
          <p style={{ fontFamily: mono, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.4em", color: "#444", marginBottom: "1rem" }}>
            // pricing
          </p>
          <h1 style={{ fontFamily: mono, fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", marginBottom: "0.75rem" }}>
            choose your depth
          </h1>
          <p style={{ fontFamily: sans, fontSize: "1rem", color: "#555", maxWidth: "400px", margin: "0 auto", lineHeight: 1.7 }}>
            Start free. Scale as your workflows demand more.
          </p>
        </motion.div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1px", background: "#151515", marginBottom: "4rem" }}>
          {tiers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              style={{
                background: "#000",
                padding: "2.5rem 2rem",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {t.highlight && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${teal}, ${violet})` }} />
              )}

              <p style={{ fontFamily: mono, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.3em", color: t.highlight ? teal : "#444", marginBottom: "1rem", opacity: 0.7 }}>
                // {t.name}
              </p>

              <div style={{ marginBottom: "1.5rem" }}>
                <span style={{ fontFamily: mono, fontSize: "2.5rem", fontWeight: 700, color: "#fff" }}>{t.price}</span>
                <span style={{ fontFamily: mono, fontSize: "0.75rem", color: "#444", marginLeft: "0.3rem" }}>{t.sub}</span>
              </div>

              <div style={{ height: "1px", background: "#181818", margin: "0 0 1.5rem" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem", flex: 1 }}>
                {t.features.map((f) => (
                  <li key={f} style={{ fontFamily: sans, fontSize: "0.85rem", color: "#555", lineHeight: 1.6, marginBottom: "0.3rem", paddingLeft: "1rem", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, fontFamily: mono, fontSize: "0.65rem", color: t.glow === "transparent" ? "#333" : t.glow, opacity: 0.6 }}>+</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/abyss/login"
                style={{
                  fontFamily: mono,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  padding: "0.7rem 1.5rem",
                  borderRadius: "2px",
                  textAlign: "center",
                  letterSpacing: "0.05em",
                  transition: "all 0.3s ease",
                  ...(t.highlight
                    ? { background: teal, color: "#000", boxShadow: `0 0 20px ${teal}25` }
                    : { background: "transparent", color: "#666", border: "1px solid #222" }),
                }}
                onMouseEnter={(e) => {
                  if (t.highlight) e.currentTarget.style.boxShadow = `0 0 40px ${teal}40`;
                  else e.currentTarget.style.borderColor = "#444";
                }}
                onMouseLeave={(e) => {
                  if (t.highlight) e.currentTarget.style.boxShadow = `0 0 20px ${teal}25`;
                  else e.currentTarget.style.borderColor = "#222";
                }}
              >
                {t.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <section style={{ maxWidth: "600px", margin: "0 auto", padding: "0 0 5rem" }}>
          <p style={{ fontFamily: mono, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.4em", color: "#444", marginBottom: "2rem", textAlign: "center" }}>
            // faq
          </p>
          {faqs.map((f, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid #151515", padding: "1.25rem 0", cursor: "pointer", fontFamily: sans }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: mono, fontSize: "0.85rem", fontWeight: 500, color: "#ccc" }}>{f.q}</span>
                <span style={{ fontFamily: mono, fontSize: "0.8rem", color: teal, opacity: 0.5, transition: "transform 0.3s", transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
              </div>
              {openFaq === i && (
                <p style={{ fontSize: "0.88rem", color: "#555", lineHeight: 1.65, marginTop: "0.75rem" }}>{f.a}</p>
              )}
            </button>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #111", padding: "1.5rem 2rem", maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", position: "relative", zIndex: 10 }}>
        <span style={{ fontFamily: mono, fontSize: "0.65rem", color: "#333", letterSpacing: "0.05em" }}>beyond_chat</span>
        <Link to="/" style={{ fontFamily: mono, fontSize: "0.65rem", color: "#333", textDecoration: "none", letterSpacing: "0.05em" }}>[all variants]</Link>
      </footer>
    </div>
  );
}
