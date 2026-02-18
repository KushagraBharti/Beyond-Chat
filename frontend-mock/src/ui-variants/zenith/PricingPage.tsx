import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

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

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "For individuals exploring AI workflows.",
    cta: "Get started",
    highlight: false,
    features: ["3 studios", "50 runs per month", "100 artifacts", "1 workspace", "Community support"],
  },
  {
    name: "Pro",
    price: "$20",
    period: "/month",
    desc: "Full power for serious makers.",
    cta: "Start Pro trial",
    highlight: true,
    features: ["All 6 studios", "Unlimited runs", "Unlimited storage", "Model Compare", "Context Builder", "PDF & Markdown export", "5 workspaces", "Priority support"],
  },
  {
    name: "Team",
    price: "$40",
    period: "/seat/mo",
    desc: "For teams building together.",
    cta: "Contact sales",
    highlight: false,
    features: ["Everything in Pro", "Unlimited workspaces", "Shared library", "Collaboration", "Admin & permissions", "SSO & audit logs", "Dedicated support"],
  },
];

const faqs = [
  { q: "Can I switch plans at any time?", a: "Yes. Upgrade instantly, downgrade at the next billing cycle. Cancel anytime with no fees." },
  { q: "Which AI models are available?", a: "All major LLMs through OpenRouter: GPT-4, Claude, Gemini, Llama, Mistral, and more as they launch." },
  { q: "How is my data protected?", a: "Row-level security on Supabase, encryption at rest, workspace-level isolation, and we never train on your data." },
  { q: "Do I need my own API keys?", a: "No. Pro and Team plans include compute credits. The Free tier operates under a monthly run limit." },
];

export default function ZenithPricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: sans }}>
      {/* Nav */}
      <nav style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/zenith" style={{ textDecoration: "none", fontFamily: serif, fontSize: "1.15rem", fontWeight: 500, color: c.text, fontStyle: "italic" }}>
          Beyond Chat
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link to="/zenith" style={{ fontFamily: sans, fontSize: "0.82rem", color: c.stone, textDecoration: "none" }}>Home</Link>
          <Link to="/zenith/login" style={{ fontFamily: sans, fontSize: "0.82rem", color: c.text, textDecoration: "none", fontWeight: 500, borderBottom: `1px solid ${c.text}`, paddingBottom: "2px" }}>
            Sign in
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 2rem" }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9 }} style={{ padding: "6rem 0 2rem" }}>
          <p style={{ fontFamily: sans, fontSize: "0.72rem", fontWeight: 400, letterSpacing: "0.2em", color: c.stone, textTransform: "uppercase", marginBottom: "2rem" }}>
            Pricing
          </p>
          <h1 style={{ fontFamily: serif, fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 400, fontStyle: "italic", letterSpacing: "-0.01em", marginBottom: "0.75rem" }}>
            Simple plans, honestly priced
          </h1>
          <p style={{ fontFamily: sans, fontSize: "0.95rem", color: c.stone, lineHeight: 1.7, maxWidth: "400px" }}>
            Start free. Upgrade only when you need more.
          </p>
        </motion.div>

        <div style={{ height: "1px", background: c.line, marginBottom: "3rem" }} />

        {/* Tiers — elegant list style */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2rem", padding: "0 0 4rem" }}>
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              style={{
                display: "flex", flexDirection: "column",
                paddingTop: tier.highlight ? "0" : "0",
                position: "relative",
              }}
            >
              {tier.highlight && (
                <div style={{ width: "40px", height: "1px", background: c.blush, marginBottom: "1.5rem" }} />
              )}

              <h3 style={{ fontFamily: serif, fontSize: "1.2rem", fontWeight: 500, fontStyle: "italic", marginBottom: "0.3rem" }}>
                {tier.name}
              </h3>
              <p style={{ fontFamily: sans, fontSize: "0.82rem", color: c.stone, marginBottom: "1.5rem" }}>
                {tier.desc}
              </p>

              <div style={{ marginBottom: "1.5rem" }}>
                <span style={{ fontFamily: serif, fontSize: "2.5rem", fontWeight: 600, letterSpacing: "-0.02em" }}>{tier.price}</span>
                <span style={{ fontFamily: sans, fontSize: "0.82rem", color: c.stone, marginLeft: "0.2rem" }}>{tier.period}</span>
              </div>

              <Link to="/zenith/login" style={{
                fontFamily: sans, fontSize: "0.85rem", fontWeight: 500, textDecoration: "none",
                color: c.text, borderBottom: `1px solid ${tier.highlight ? c.text : c.line}`,
                paddingBottom: "4px", alignSelf: "flex-start", marginBottom: "2rem",
                letterSpacing: "0.01em",
              }}>
                {tier.cta}
              </Link>

              <div style={{ height: "1px", background: c.line, marginBottom: "1.25rem" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {tier.features.map((f) => (
                  <li key={f} style={{ fontFamily: sans, fontSize: "0.82rem", color: c.stone, lineHeight: 1.6, marginBottom: "0.4rem" }}>
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div style={{ height: "1px", background: c.line }} />

        {/* FAQ */}
        <section style={{ maxWidth: "600px", margin: "0 auto", padding: "4rem 0 5rem" }}>
          <h2 style={{ fontFamily: serif, fontSize: "1.3rem", fontWeight: 400, fontStyle: "italic", textAlign: "center", marginBottom: "2.5rem" }}>
            Common questions
          </h2>
          {faqs.map((f, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "transparent", border: "none",
                borderBottom: `1px solid ${c.line}`, padding: "1.25rem 0",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: sans, fontSize: "0.9rem", fontWeight: 500, color: c.text }}>{f.q}</span>
                <span style={{ fontFamily: sans, fontSize: "0.8rem", color: c.stone, flexShrink: 0, marginLeft: "1rem", transition: "color 0.2s" }}>
                  {openFaq === i ? "−" : "+"}
                </span>
              </div>
              {openFaq === i && (
                <p style={{ fontFamily: sans, fontSize: "0.85rem", fontWeight: 400, color: c.stone, lineHeight: 1.7, marginTop: "0.75rem" }}>{f.a}</p>
              )}
            </button>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer style={{ maxWidth: "1000px", margin: "0 auto", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${c.line}` }}>
        <span style={{ fontFamily: sans, fontSize: "0.75rem", fontWeight: 400, color: c.stone }}>Beyond Chat</span>
        <Link to="/" style={{ fontFamily: sans, fontSize: "0.75rem", fontWeight: 400, color: c.stone, textDecoration: "none" }}>All variants</Link>
      </footer>
    </div>
  );
}
