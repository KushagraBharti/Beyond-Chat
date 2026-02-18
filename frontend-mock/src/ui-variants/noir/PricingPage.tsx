import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

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

const blinds = "repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(212,168,67,0.03) 8px, rgba(212,168,67,0.03) 9px)";

const tiers = [
  {
    name: "FREE",
    price: "$0",
    period: "forever",
    desc: "For individuals exploring AI workflows.",
    cta: "GET STARTED",
    highlight: false,
    features: ["3 studios (Writing, Research, Image)", "50 runs per month", "100 artifacts", "1 workspace", "Community support"],
  },
  {
    name: "PRO",
    price: "$20",
    period: "/month",
    desc: "Full power for serious makers.",
    cta: "START PRO TRIAL",
    highlight: true,
    features: ["All 6 studios", "Unlimited runs", "Unlimited artifact storage", "Model Compare (up to 5 models)", "Context Builder with file uploads", "PDF & Markdown export", "5 workspaces", "Priority support"],
  },
  {
    name: "TEAM",
    price: "$40",
    period: "/seat/mo",
    desc: "For teams building together.",
    cta: "CONTACT SALES",
    highlight: false,
    features: ["Everything in Pro", "Unlimited workspaces", "Shared artifact library", "Comments & collaboration", "Admin dashboard & permissions", "SSO & audit logs", "Dedicated support"],
  },
];

const faqs = [
  { q: "Can I switch plans at any time?", a: "Yes. Upgrade instantly, downgrade at the next billing cycle. Cancel anytime with no fees." },
  { q: "Which AI models are available?", a: "All major LLMs through OpenRouter: GPT-4, Claude, Gemini, Llama, Mistral, and more as they launch." },
  { q: "How is my data protected?", a: "Row-level security on Supabase, encryption at rest, workspace-level isolation, and we never train on your data." },
  { q: "Do I need my own API keys?", a: "No. Pro and Team plans include compute credits. The Free tier operates under a monthly run limit." },
];

export default function NoirPricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: c.void, color: c.warm, fontFamily: body, position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: blinds, pointerEvents: "none", zIndex: 1 }} />

      {/* Nav */}
      <nav style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10, borderBottom: `1px solid ${c.line}` }}>
        <Link to="/noir" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
          <span style={{ fontFamily: condensed, fontSize: "1.6rem", color: c.warm, letterSpacing: "0.05em" }}>BEYOND</span>
          <span style={{ fontFamily: condensed, fontSize: "1.6rem", color: c.gold, letterSpacing: "0.05em" }}>CHAT</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link to="/noir" style={{ fontFamily: body, fontSize: "0.8rem", color: c.smoke, textDecoration: "none" }}>Home</Link>
          <Link to="/noir/login" style={{ fontFamily: condensed, fontSize: "1rem", color: c.void, background: c.gold, padding: "0.5rem 1.8rem", textDecoration: "none", letterSpacing: "0.1em" }}>
            ENTER
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2.5rem", position: "relative", zIndex: 10 }}>
        {/* Header */}
        <div style={{ padding: "5rem 0 3rem", borderBottom: `1px solid ${c.line}` }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div style={{ fontFamily: body, fontSize: "0.7rem", fontWeight: 300, letterSpacing: "0.25em", color: c.gold, textTransform: "uppercase", marginBottom: "1.5rem" }}>
              Pricing
            </div>
            <h1 style={{ fontFamily: condensed, fontSize: "clamp(3rem, 7vw, 5.5rem)", letterSpacing: "0.03em", lineHeight: 0.9 }}>
              CHOOSE YOUR<br /><span style={{ color: c.gold }}>SPOTLIGHT</span>
            </h1>
          </motion.div>
        </div>

        {/* Tiers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0", borderBottom: `1px solid ${c.line}` }}>
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              style={{
                padding: "2.5rem",
                borderRight: i < 2 ? `1px solid ${c.line}` : "none",
                display: "flex", flexDirection: "column",
                position: "relative",
                background: tier.highlight ? c.surface : "transparent",
              }}
            >
              {tier.highlight && (
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "2px", background: c.gold }} />
              )}

              <div style={{ fontFamily: body, fontSize: "0.6rem", fontWeight: 300, letterSpacing: "0.2em", color: c.gold, marginBottom: "1rem" }}>
                {String(i + 1).padStart(2, "0")}
              </div>

              <h3 style={{ fontFamily: condensed, fontSize: "2rem", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>{tier.name}</h3>
              <p style={{ fontFamily: body, fontSize: "0.8rem", fontWeight: 300, color: c.smoke, marginBottom: "2rem" }}>{tier.desc}</p>

              <div style={{ marginBottom: "2rem" }}>
                <span style={{ fontFamily: condensed, fontSize: "3.5rem", letterSpacing: "0.02em" }}>{tier.price}</span>
                <span style={{ fontFamily: body, fontSize: "0.75rem", fontWeight: 300, color: c.smoke, marginLeft: "0.3rem" }}>{tier.period}</span>
              </div>

              <Link to="/noir/login" style={{
                fontFamily: condensed, fontSize: "1rem", textDecoration: "none",
                padding: "0.8rem 2rem", textAlign: "center", letterSpacing: "0.1em",
                marginBottom: "2rem", display: "block", transition: "all 0.2s",
                ...(tier.highlight
                  ? { background: c.gold, color: c.void }
                  : { background: "transparent", color: c.warm, border: `1px solid ${c.line}` }),
              }}>
                {tier.cta}
              </Link>

              <div style={{ height: "1px", background: c.line, marginBottom: "1.5rem" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {tier.features.map((f) => (
                  <li key={f} style={{ fontFamily: body, fontSize: "0.8rem", fontWeight: 300, color: c.smoke, lineHeight: 1.6, marginBottom: "0.5rem", paddingLeft: "1rem", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: tier.highlight ? c.gold : c.smoke }}>—</span>
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <section style={{ maxWidth: "640px", margin: "0 auto", padding: "4rem 0 5rem" }}>
          <h2 style={{ fontFamily: condensed, fontSize: "2rem", letterSpacing: "0.06em", textAlign: "center", marginBottom: "2.5rem" }}>
            COMMON QUESTIONS
          </h2>
          {faqs.map((f, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "transparent", border: "none",
                borderBottom: `1px solid ${c.line}`, padding: "1.25rem 0",
                cursor: "pointer", transition: "background 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: body, fontSize: "0.9rem", fontWeight: 400, color: c.warm }}>{f.q}</span>
                <span style={{ fontFamily: condensed, fontSize: "1.2rem", color: openFaq === i ? c.gold : c.smoke, transition: "color 0.2s", flexShrink: 0, marginLeft: "1rem" }}>
                  {openFaq === i ? "−" : "+"}
                </span>
              </div>
              {openFaq === i && (
                <p style={{ fontFamily: body, fontSize: "0.85rem", fontWeight: 300, color: c.smoke, lineHeight: 1.7, marginTop: "0.75rem" }}>{f.a}</p>
              )}
            </button>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${c.line}`, position: "relative", zIndex: 10 }}>
        <span style={{ fontFamily: body, fontSize: "0.75rem", fontWeight: 300, color: "#444" }}>Beyond Chat</span>
        <Link to="/" style={{ fontFamily: body, fontSize: "0.75rem", fontWeight: 300, color: "#444", textDecoration: "none" }}>All variants</Link>
      </footer>
    </div>
  );
}
