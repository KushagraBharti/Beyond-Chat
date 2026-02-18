import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const heading = "'Bricolage Grotesque', sans-serif";
const body = "'Plus Jakarta Sans', sans-serif";

const c = {
  canvas: "#F7F7F5",
  surface: "#FFFFFF",
  ink: "#111111",
  primary: "#5B4FE9",
  accent: "#F06225",
  muted: "#71717A",
  border: "#E8E8E6",
};

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "For individuals exploring AI workflows.",
    cta: "Get started",
    highlight: false,
    features: [
      "3 studios (Writing, Research, Image)",
      "50 runs per month",
      "100 artifacts",
      "1 workspace",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$20",
    period: "/month",
    desc: "Full power for serious makers.",
    cta: "Start Pro trial",
    highlight: true,
    features: [
      "All 6 studios",
      "Unlimited runs",
      "Unlimited artifact storage",
      "Model Compare (up to 5 models)",
      "Context Builder with file uploads",
      "PDF & Markdown export",
      "5 workspaces",
      "Priority support",
    ],
  },
  {
    name: "Team",
    price: "$40",
    period: "/seat/mo",
    desc: "For teams building together.",
    cta: "Contact sales",
    highlight: false,
    features: [
      "Everything in Pro",
      "Unlimited workspaces",
      "Shared artifact library",
      "Comments & collaboration",
      "Admin dashboard & permissions",
      "SSO & audit logs",
      "Dedicated support",
    ],
  },
];

const faqs = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrade instantly, downgrade at the next billing cycle. Cancel anytime with no fees.",
  },
  {
    q: "Which AI models are available?",
    a: "All major LLMs through OpenRouter: GPT-4, Claude, Gemini, Llama, Mistral, and more as they launch.",
  },
  {
    q: "How is my data protected?",
    a: "Row-level security on Supabase, encryption at rest, workspace-level isolation, and we never train on your data.",
  },
  {
    q: "Do I need my own API keys?",
    a: "No. Pro and Team plans include compute credits. The Free tier operates under a monthly run limit.",
  },
];

const dotGrid = "radial-gradient(circle, #d4d4d2 0.8px, transparent 0.8px)";

export default function AtelierPricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: c.canvas,
        color: c.ink,
        fontFamily: body,
        position: "relative",
      }}
    >
      {/* Dot grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: dotGrid,
          backgroundSize: "24px 24px",
          opacity: 0.5,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Nav */}
      <nav
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "1.25rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        <Link
          to="/atelier"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div style={{ position: "relative", width: "24px", height: "24px" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "14px", height: "14px", borderRadius: "4px", background: c.primary }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "14px", height: "14px", borderRadius: "4px", background: c.accent, opacity: 0.8 }} />
          </div>
          <span style={{ fontFamily: heading, fontSize: "1.1rem", fontWeight: 700, color: c.ink, letterSpacing: "-0.02em" }}>
            Beyond Chat
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link to="/atelier" style={{ fontFamily: body, fontSize: "0.85rem", fontWeight: 500, color: c.muted, textDecoration: "none" }}>
            Home
          </Link>
          <Link
            to="/atelier/login"
            style={{
              fontFamily: body, fontSize: "0.85rem", fontWeight: 600, color: "#fff", textDecoration: "none",
              background: c.primary, padding: "0.55rem 1.25rem", borderRadius: "8px",
              boxShadow: "0 1px 2px rgba(91,79,233,0.2)",
            }}
          >
            Get started
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 2rem", position: "relative", zIndex: 10 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", padding: "4rem 0 1.5rem" }}
        >
          <span style={{ fontFamily: body, fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: c.primary, display: "block", marginBottom: "0.5rem" }}>
            Pricing
          </span>
          <h1 style={{ fontFamily: heading, fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>
            Plans that scale with your work
          </h1>
          <p style={{ fontFamily: body, fontSize: "1.05rem", color: c.muted, maxWidth: "440px", margin: "0 auto", lineHeight: 1.6 }}>
            Start free with 3 studios. Upgrade when you need unlimited power or team collaboration.
          </p>
        </motion.div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0.75rem", padding: "2rem 0 4rem" }}>
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              style={{
                background: c.surface,
                border: `1px solid ${tier.highlight ? c.primary + "30" : c.border}`,
                borderRadius: "16px",
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
                boxShadow: tier.highlight ? `0 4px 24px rgba(91,79,233,0.08)` : "none",
              }}
            >
              {tier.highlight && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${c.primary}, ${c.accent})` }} />
              )}

              {tier.highlight && (
                <div style={{ display: "inline-flex", alignSelf: "flex-start", padding: "0.2rem 0.7rem", background: `${c.primary}10`, borderRadius: "6px", marginBottom: "1rem" }}>
                  <span style={{ fontFamily: body, fontSize: "0.7rem", fontWeight: 600, color: c.primary }}>Most popular</span>
                </div>
              )}

              <h3 style={{ fontFamily: heading, fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
                {tier.name}
              </h3>
              <p style={{ fontFamily: body, fontSize: "0.85rem", color: c.muted, marginBottom: "1.25rem" }}>
                {tier.desc}
              </p>

              <div style={{ marginBottom: "1.5rem" }}>
                <span style={{ fontFamily: heading, fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{tier.price}</span>
                <span style={{ fontFamily: body, fontSize: "0.85rem", color: c.muted, marginLeft: "0.2rem" }}>{tier.period}</span>
              </div>

              <Link
                to="/atelier/login"
                style={{
                  fontFamily: body,
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "0.7rem 1.5rem",
                  borderRadius: "10px",
                  textAlign: "center",
                  marginBottom: "1.5rem",
                  transition: "all 0.2s ease",
                  display: "block",
                  ...(tier.highlight
                    ? { background: c.primary, color: "#fff", boxShadow: "0 2px 8px rgba(91,79,233,0.2)" }
                    : { background: c.canvas, color: c.ink, border: `1px solid ${c.border}` }),
                }}
              >
                {tier.cta}
              </Link>

              <div style={{ height: "1px", background: c.border, marginBottom: "1.5rem" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {tier.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      fontFamily: body,
                      fontSize: "0.85rem",
                      color: "#555",
                      lineHeight: 1.55,
                      marginBottom: "0.5rem",
                      paddingLeft: "1.25rem",
                      position: "relative",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      style={{ position: "absolute", left: 0, top: "3px" }}
                    >
                      <path
                        d="M3 7l2.5 2.5L11 4"
                        stroke={tier.highlight ? c.primary : "#30A46C"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <section style={{ maxWidth: "640px", margin: "0 auto", padding: "0 0 5rem" }}>
          <h2 style={{ fontFamily: heading, fontSize: "1.6rem", fontWeight: 700, textAlign: "center", letterSpacing: "-0.02em", marginBottom: "2rem" }}>
            Common questions
          </h2>
          {faqs.map((f, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: openFaq === i ? c.surface : "transparent",
                border: "none",
                borderBottom: `1px solid ${c.border}`,
                padding: "1.25rem 0.5rem",
                cursor: "pointer",
                fontFamily: body,
                borderRadius: openFaq === i ? "10px" : 0,
                transition: "background 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: heading, fontSize: "1rem", fontWeight: 600, color: c.ink, letterSpacing: "-0.01em" }}>
                  {f.q}
                </span>
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "6px",
                    background: openFaq === i ? `${c.primary}15` : c.canvas,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: openFaq === i ? c.primary : c.muted,
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                >
                  {openFaq === i ? "−" : "+"}
                </span>
              </div>
              {openFaq === i && (
                <p style={{ fontFamily: body, fontSize: "0.9rem", color: c.muted, lineHeight: 1.65, marginTop: "0.75rem" }}>
                  {f.a}
                </p>
              )}
            </button>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "1.5rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `1px solid ${c.border}`,
          position: "relative",
          zIndex: 10,
        }}
      >
        <span style={{ fontFamily: body, fontSize: "0.8rem", color: "#bbb" }}>Beyond Chat</span>
        <Link to="/" style={{ fontFamily: body, fontSize: "0.8rem", color: "#bbb", textDecoration: "none" }}>
          All variants
        </Link>
      </footer>
    </div>
  );
}
