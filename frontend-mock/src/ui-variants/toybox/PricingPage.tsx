import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const display = "'Syne', sans-serif";
const bodyFont = "'DM Sans', sans-serif";
const colors = {
  coral: "#FF5C38",
  blue: "#3B5BFF",
  lemon: "#FFD43B",
  mint: "#2DD4A8",
  ink: "#1a1a1a",
  bg: "#FFFDF8",
};

const tiers = [
  {
    name: "Free",
    price: "$0",
    sub: "forever",
    color: colors.mint,
    features: [
      "3 studios",
      "50 runs / month",
      "100 artifacts",
      "1 workspace",
      "Community support",
    ],
    cta: "Start free",
    shadow: colors.mint,
  },
  {
    name: "Pro",
    price: "$20",
    sub: "/month",
    color: colors.coral,
    highlight: true,
    features: [
      "All 6 studios",
      "Unlimited runs",
      "Unlimited artifacts",
      "Model Compare (5 models)",
      "Context Builder + uploads",
      "PDF & Markdown export",
      "5 workspaces",
      "Priority support",
    ],
    cta: "Go Pro",
    shadow: colors.coral,
  },
  {
    name: "Team",
    price: "$40",
    sub: "/seat/mo",
    color: colors.blue,
    features: [
      "Everything in Pro",
      "Unlimited workspaces",
      "Shared artifact library",
      "Team collaboration",
      "Admin dashboard",
      "SSO & audit logs",
      "Dedicated support",
    ],
    cta: "Contact us",
    shadow: colors.blue,
  },
];

const faqs = [
  { q: "Can I switch plans?", a: "Anytime. Upgrades are instant, downgrades apply next cycle." },
  { q: "What models can I use?", a: "GPT-4, Claude, Gemini, Llama, Mistral, and more through OpenRouter." },
  { q: "Is my data safe?", a: "Yes. Row-level security, encrypted storage, zero training on your data." },
  { q: "Do I need API keys?", a: "Nope. Pro and Team plans include credits. Free has a monthly limit." },
];

export default function ToyboxPricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        color: colors.ink,
        fontFamily: bodyFont,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Floating shapes */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "5%", right: "-20px", width: "140px", height: "140px", borderRadius: "50%", border: `4px solid ${colors.lemon}`, opacity: 0.2 }} />
        <div style={{ position: "absolute", bottom: "20%", left: "-20px", width: "90px", height: "90px", background: colors.blue, opacity: 0.1, transform: "rotate(30deg)" }} />
      </div>

      {/* Nav */}
      <nav style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10 }}>
        <Link to="/toybox" style={{ fontFamily: display, fontSize: "1.3rem", fontWeight: 800, color: colors.ink, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ display: "inline-block", width: "28px", height: "28px", borderRadius: "50%", background: colors.coral, border: `3px solid ${colors.ink}` }} />
          Beyond Chat
        </Link>
        <Link to="/toybox/login" style={{ fontFamily: display, fontSize: "0.85rem", fontWeight: 700, color: colors.ink, textDecoration: "none", background: colors.lemon, padding: "0.6rem 1.5rem", borderRadius: "99px", border: `3px solid ${colors.ink}`, boxShadow: `4px 4px 0 ${colors.ink}` }}>
          Sign In
        </Link>
      </nav>

      {/* Header */}
      <section style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem 2rem 2rem", textAlign: "center", position: "relative", zIndex: 10 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div style={{ display: "inline-block", fontFamily: display, fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#fff", background: colors.blue, padding: "0.35rem 1rem", borderRadius: "99px", border: `2px solid ${colors.ink}`, marginBottom: "1.5rem" }}>
            Pricing
          </div>
          <h1 style={{ fontFamily: display, fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: "1rem" }}>
            Pick your <span style={{ color: colors.coral }}>vibe</span>
          </h1>
          <p style={{ fontFamily: bodyFont, fontSize: "1.05rem", color: "#666", maxWidth: "420px", margin: "0 auto", lineHeight: 1.6 }}>
            Start free. Upgrade when you need unlimited runs, all studios, or team features.
          </p>
        </motion.div>
      </section>

      {/* Cards */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "1rem 2rem 4rem", position: "relative", zIndex: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {tiers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30, rotate: i === 0 ? -1.5 : i === 2 ? 1.5 : 0 }}
              animate={{ opacity: 1, y: 0, rotate: i === 0 ? -1.5 : i === 2 ? 1.5 : 0 }}
              whileHover={{ rotate: 0, scale: 1.02 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              style={{
                background: "#fff",
                border: `3px solid ${colors.ink}`,
                borderRadius: "24px",
                padding: "2.5rem 2rem",
                position: "relative",
                boxShadow: `6px 6px 0 ${t.shadow}`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {t.highlight && (
                <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", fontFamily: display, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", background: colors.coral, color: "#fff", padding: "0.35rem 1.2rem", borderRadius: "99px", border: `2px solid ${colors.ink}` }}>
                  Popular
                </div>
              )}

              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: t.color, border: `3px solid ${colors.ink}`, marginBottom: "1.25rem" }} />

              <h3 style={{ fontFamily: display, fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem" }}>{t.name}</h3>
              <div style={{ fontFamily: display, fontSize: "2.5rem", fontWeight: 800, marginTop: "0.5rem" }}>
                {t.price}
                <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#999" }}> {t.sub}</span>
              </div>

              <div style={{ height: "3px", background: t.color, borderRadius: "99px", margin: "1.5rem 0" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem", flex: 1 }}>
                {t.features.map((f) => (
                  <li key={f} style={{ fontFamily: bodyFont, fontSize: "0.88rem", color: "#555", lineHeight: 1.55, marginBottom: "0.4rem", paddingLeft: "1.2rem", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, fontWeight: 700, color: t.color }}>+</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/toybox/login"
                style={{
                  fontFamily: display,
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: t.highlight ? "#fff" : colors.ink,
                  textDecoration: "none",
                  background: t.highlight ? colors.ink : "#fff",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "99px",
                  border: `3px solid ${colors.ink}`,
                  textAlign: "center",
                  boxShadow: `4px 4px 0 ${t.color}`,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(2px, 2px)"; e.currentTarget.style.boxShadow = `2px 2px 0 ${t.color}`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translate(0, 0)"; e.currentTarget.style.boxShadow = `4px 4px 0 ${t.color}`; }}
              >
                {t.cta} &rarr;
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: "650px", margin: "0 auto", padding: "0 2rem 4rem", position: "relative", zIndex: 10 }}>
        <h2 style={{ fontFamily: display, fontSize: "1.8rem", fontWeight: 800, textAlign: "center", marginBottom: "2rem" }}>
          Questions?
        </h2>
        {faqs.map((f, i) => (
          <button
            key={i}
            onClick={() => setOpenFaq(openFaq === i ? null : i)}
            style={{ display: "block", width: "100%", textAlign: "left", background: openFaq === i ? "#fff" : "transparent", border: `3px solid ${colors.ink}`, borderRadius: "16px", padding: "1.25rem 1.5rem", marginBottom: "0.75rem", cursor: "pointer", fontFamily: bodyFont, boxShadow: openFaq === i ? `4px 4px 0 ${colors.lemon}` : "none", transition: "all 0.2s ease" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: display, fontSize: "1rem", fontWeight: 600 }}>{f.q}</span>
              <span style={{ fontFamily: display, fontSize: "1.2rem", fontWeight: 800, color: colors.coral, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
            </div>
            {openFaq === i && (
              <p style={{ fontSize: "0.9rem", color: "#666", lineHeight: 1.6, marginTop: "0.75rem" }}>{f.a}</p>
            )}
          </button>
        ))}
      </section>

      {/* Footer */}
      <footer style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `3px solid ${colors.ink}`, position: "relative", zIndex: 10 }}>
        <span style={{ fontFamily: display, fontSize: "0.8rem", fontWeight: 600, color: "#999" }}>Beyond Chat</span>
        <Link to="/" style={{ fontFamily: display, fontSize: "0.75rem", fontWeight: 600, color: "#999", textDecoration: "none" }}>All variants &rarr;</Link>
      </footer>
    </div>
  );
}
