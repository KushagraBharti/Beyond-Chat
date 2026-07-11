import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

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

const terrazzo = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='t' x='0' y='0' width='120' height='120' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='15' cy='25' r='2' fill='%23C8553D' opacity='0.15'/%3E%3Ccircle cx='65' cy='10' r='1.5' fill='%237B946B' opacity='0.12'/%3E%3Ccircle cx='100' cy='45' r='2.5' fill='%23D4A574' opacity='0.13'/%3E%3Ccircle cx='35' cy='70' r='1.8' fill='%23C8553D' opacity='0.1'/%3E%3Ccircle cx='80' cy='85' r='2' fill='%237B946B' opacity='0.14'/%3E%3Ccircle cx='50' cy='110' r='1.5' fill='%23D4A574' opacity='0.11'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='120' height='120' fill='url(%23t)'/%3E%3C/svg%3E")`;

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "For individuals exploring AI workflows.",
    cta: "Get started",
    highlight: false,
    color: c.sage,
    features: ["3 studios (Writing, Research, Image)", "50 runs per month", "100 artifacts", "1 workspace", "Community support"],
  },
  {
    name: "Pro",
    price: "$20",
    period: "/month",
    desc: "Full power for serious makers.",
    cta: "Start Pro trial",
    highlight: true,
    color: c.terracotta,
    features: ["All 6 studios", "Unlimited runs", "Unlimited artifact storage", "Model Compare (up to 5 models)", "Context Builder with file uploads", "PDF & Markdown export", "5 workspaces", "Priority support"],
  },
  {
    name: "Team",
    price: "$40",
    period: "/seat/mo",
    desc: "For teams building together.",
    cta: "Contact sales",
    highlight: false,
    color: c.clay,
    features: ["Everything in Pro", "Unlimited workspaces", "Shared artifact library", "Comments & collaboration", "Admin dashboard & permissions", "SSO & audit logs", "Dedicated support"],
  },
];

const faqs = [
  { q: "Can I switch plans at any time?", a: "Yes. Upgrade instantly, downgrade at the next billing cycle. Cancel anytime with no fees." },
  { q: "Which AI models are available?", a: "All major LLMs through OpenRouter: GPT-4, Claude, Gemini, Llama, Mistral, and more as they launch." },
  { q: "How is my data protected?", a: "Row-level security on Supabase, encryption at rest, workspace-level isolation, and we never train on your data." },
  { q: "Do I need my own API keys?", a: "No. Pro and Team plans include compute credits. The Free tier operates under a monthly run limit." },
];

export default function TerrazzoPricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: c.cream, color: c.espresso, fontFamily: sans, position: "relative" }}>
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
          <Link to="/terrazzo" style={{ fontFamily: sans, fontSize: "0.88rem", fontWeight: 500, color: c.stone, textDecoration: "none" }}>Home</Link>
          <Link to="/terrazzo/login" style={{ fontFamily: sans, fontSize: "0.88rem", fontWeight: 600, color: c.cream, background: c.espresso, padding: "0.6rem 1.5rem", borderRadius: "99px", textDecoration: "none" }}>
            Get started
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: "1060px", margin: "0 auto", padding: "0 2rem", position: "relative", zIndex: 10 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ textAlign: "center", padding: "4rem 0 1rem" }}>
          <div style={{ display: "inline-block", fontFamily: sans, fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: c.sage, background: `${c.sage}14`, padding: "0.4rem 1rem", borderRadius: "99px", marginBottom: "1rem" }}>
            Pricing
          </div>
          <h1 style={{ fontFamily: serif, fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>
            Simple, <span style={{ fontStyle: "italic", fontWeight: 400, color: c.terracotta }}>honest</span> pricing
          </h1>
          <p style={{ fontFamily: sans, fontSize: "1rem", color: c.stone, maxWidth: "420px", margin: "0 auto", lineHeight: 1.6 }}>
            Start free. Upgrade when you need more power, more studios, or team collaboration.
          </p>
        </motion.div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", padding: "2.5rem 0 4rem" }}>
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              style={{
                background: "#FFFFFF",
                border: `1px solid ${tier.highlight ? tier.color + "30" : c.sand}`,
                borderRadius: "24px",
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
                boxShadow: tier.highlight ? `0 8px 32px ${tier.color}12` : "none",
              }}
            >
              {tier.highlight && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${c.terracotta}, ${c.clay})`, borderRadius: "24px 24px 0 0" }} />
              )}

              {tier.highlight && (
                <div style={{ display: "inline-flex", alignSelf: "flex-start", padding: "0.25rem 0.75rem", background: `${tier.color}10`, borderRadius: "99px", marginBottom: "0.75rem" }}>
                  <span style={{ fontFamily: sans, fontSize: "0.68rem", fontWeight: 600, color: tier.color }}>Most popular</span>
                </div>
              )}

              <h3 style={{ fontFamily: serif, fontSize: "1.3rem", fontWeight: 600, marginBottom: "0.25rem" }}>{tier.name}</h3>
              <p style={{ fontFamily: sans, fontSize: "0.85rem", color: c.stone, marginBottom: "1.25rem" }}>{tier.desc}</p>

              <div style={{ marginBottom: "1.5rem" }}>
                <span style={{ fontFamily: serif, fontSize: "2.8rem", fontWeight: 700, letterSpacing: "-0.03em" }}>{tier.price}</span>
                <span style={{ fontFamily: sans, fontSize: "0.85rem", color: c.stone, marginLeft: "0.25rem" }}>{tier.period}</span>
              </div>

              <Link to="/terrazzo/login" style={{
                fontFamily: sans, fontSize: "0.88rem", fontWeight: 600, textDecoration: "none",
                padding: "0.75rem 1.5rem", borderRadius: "99px", textAlign: "center",
                marginBottom: "1.5rem", display: "block", transition: "all 0.2s ease",
                ...(tier.highlight
                  ? { background: tier.color, color: c.cream }
                  : { background: c.sand, color: c.espresso }),
              }}>
                {tier.cta}
              </Link>

              <div style={{ height: "1px", background: c.sand, marginBottom: "1.25rem" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {tier.features.map((f) => (
                  <li key={f} style={{ fontFamily: sans, fontSize: "0.85rem", color: c.stone, lineHeight: 1.55, marginBottom: "0.5rem", paddingLeft: "1.25rem", position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, top: "7px", width: "6px", height: "6px", borderRadius: "50%", background: tier.color + "60" }} />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <section style={{ maxWidth: "600px", margin: "0 auto", padding: "0 0 5rem" }}>
          <h2 style={{ fontFamily: serif, fontSize: "1.5rem", fontWeight: 700, textAlign: "center", marginBottom: "2rem" }}>
            Questions & answers
          </h2>
          {faqs.map((f, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: openFaq === i ? "#fff" : "transparent",
                border: "none", borderBottom: `1px solid ${c.sand}`,
                padding: "1.25rem 0.75rem", cursor: "pointer",
                borderRadius: openFaq === i ? "16px" : 0,
                transition: "background 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: serif, fontSize: "1rem", fontWeight: 600, color: c.espresso }}>{f.q}</span>
                <span style={{
                  width: "24px", height: "24px", borderRadius: "50%",
                  background: openFaq === i ? `${c.terracotta}15` : c.sand,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.85rem", color: openFaq === i ? c.terracotta : c.stone,
                  transition: "all 0.2s", flexShrink: 0, fontFamily: sans,
                }}>
                  {openFaq === i ? "−" : "+"}
                </span>
              </div>
              {openFaq === i && (
                <p style={{ fontFamily: sans, fontSize: "0.9rem", color: c.stone, lineHeight: 1.6, marginTop: "0.75rem" }}>{f.a}</p>
              )}
            </button>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer style={{ maxWidth: "1160px", margin: "0 auto", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${c.sand}`, position: "relative", zIndex: 10 }}>
        <span style={{ fontFamily: sans, fontSize: "0.8rem", color: c.stone }}>Beyond Chat</span>
        <Link to="/" style={{ fontFamily: sans, fontSize: "0.8rem", color: c.stone, textDecoration: "none" }}>All variants</Link>
      </footer>
    </div>
  );
}
