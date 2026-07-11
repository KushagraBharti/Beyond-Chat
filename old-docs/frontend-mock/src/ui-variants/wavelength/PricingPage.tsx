import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const heading = "'Urbanist', sans-serif";
const mono = "'IBM Plex Mono', monospace";

const c = {
  deep: "#0C0F1A",
  surface: "#131728",
  text: "#E8E6F0",
  muted: "#6B6A80",
  pink: "#FF006E",
  orange: "#FF6B35",
  cyan: "#00D4FF",
  violet: "#8B5CF6",
};

const spectrum = `linear-gradient(90deg, ${c.pink}, ${c.orange}, ${c.cyan})`;

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "For individuals exploring AI workflows.",
    cta: "Get started",
    highlight: false,
    accent: c.cyan,
    features: ["3 studios (Writing, Research, Image)", "50 runs per month", "100 artifacts", "1 workspace", "Community support"],
  },
  {
    name: "Pro",
    price: "$20",
    period: "/month",
    desc: "Full power for serious makers.",
    cta: "Start Pro trial",
    highlight: true,
    accent: c.pink,
    features: ["All 6 studios", "Unlimited runs", "Unlimited artifact storage", "Model Compare (up to 5 models)", "Context Builder with file uploads", "PDF & Markdown export", "5 workspaces", "Priority support"],
  },
  {
    name: "Team",
    price: "$40",
    period: "/seat/mo",
    desc: "For teams building together.",
    cta: "Contact sales",
    highlight: false,
    accent: c.violet,
    features: ["Everything in Pro", "Unlimited workspaces", "Shared artifact library", "Comments & collaboration", "Admin dashboard & permissions", "SSO & audit logs", "Dedicated support"],
  },
];

const faqs = [
  { q: "Can I switch plans at any time?", a: "Yes. Upgrade instantly, downgrade at the next billing cycle. Cancel anytime with no fees." },
  { q: "Which AI models are available?", a: "All major LLMs through OpenRouter: GPT-4, Claude, Gemini, Llama, Mistral, and more as they launch." },
  { q: "How is my data protected?", a: "Row-level security on Supabase, encryption at rest, workspace-level isolation, and we never train on your data." },
  { q: "Do I need my own API keys?", a: "No. Pro and Team plans include compute credits. The Free tier operates under a monthly run limit." },
];

export default function WavelengthPricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: c.deep, color: c.text, fontFamily: heading, position: "relative" }}>
      {/* Ambient glows */}
      <div style={{ position: "fixed", top: "-20%", left: "-15%", width: "50%", height: "50%", background: `radial-gradient(ellipse, ${c.pink}06 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-15%", right: "-10%", width: "45%", height: "45%", background: `radial-gradient(ellipse, ${c.cyan}05 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      {/* Nav */}
      <nav style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.25rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10 }}>
        <Link to="/wavelength" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="8" width="3" height="8" rx="1.5" fill={c.pink} />
            <rect x="7" y="4" width="3" height="16" rx="1.5" fill={c.orange} />
            <rect x="12" y="6" width="3" height="12" rx="1.5" fill={c.cyan} />
            <rect x="17" y="9" width="3" height="6" rx="1.5" fill={c.violet} />
          </svg>
          <span style={{ fontFamily: heading, fontSize: "1.1rem", fontWeight: 700, color: c.text }}>Wavelength</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link to="/wavelength" style={{ fontFamily: mono, fontSize: "0.75rem", color: c.muted, textDecoration: "none" }}>home</Link>
          <Link to="/wavelength/login" style={{ fontFamily: heading, fontSize: "0.85rem", fontWeight: 600, color: c.deep, background: spectrum, padding: "0.55rem 1.5rem", borderRadius: "8px", textDecoration: "none" }}>
            Get started
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 2.5rem", position: "relative", zIndex: 10 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ textAlign: "center", padding: "4rem 0 1.5rem" }}>
          <div style={{ fontFamily: mono, fontSize: "0.68rem", color: c.muted, letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
            // pricing
          </div>
          <h1 style={{ fontFamily: heading, fontSize: "clamp(2rem, 4.5vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>
            Find your{" "}
            <span style={{ background: spectrum, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>frequency</span>
          </h1>
          <p style={{ fontFamily: mono, fontSize: "0.88rem", color: c.muted, maxWidth: "420px", margin: "0 auto", lineHeight: 1.6 }}>
            Start free with 3 studios. Upgrade when you need unlimited power or team features.
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
                border: `1px solid ${tier.highlight ? tier.accent + "30" : "#1e2235"}`,
                borderRadius: "16px",
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {tier.highlight && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: spectrum }} />
              )}

              {tier.highlight && (
                <div style={{ display: "inline-flex", alignSelf: "flex-start", padding: "0.2rem 0.7rem", background: `${tier.accent}15`, borderRadius: "6px", marginBottom: "0.75rem" }}>
                  <span style={{ fontFamily: mono, fontSize: "0.62rem", fontWeight: 500, color: tier.accent }}>most popular</span>
                </div>
              )}

              <h3 style={{ fontFamily: heading, fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.25rem" }}>{tier.name}</h3>
              <p style={{ fontFamily: mono, fontSize: "0.78rem", color: c.muted, marginBottom: "1.25rem" }}>{tier.desc}</p>

              <div style={{ marginBottom: "1.5rem" }}>
                <span style={{ fontFamily: heading, fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{tier.price}</span>
                <span style={{ fontFamily: mono, fontSize: "0.78rem", color: c.muted, marginLeft: "0.2rem" }}>{tier.period}</span>
              </div>

              <Link to="/wavelength/login" style={{
                fontFamily: heading, fontSize: "0.88rem", fontWeight: 600, textDecoration: "none",
                padding: "0.7rem 1.5rem", borderRadius: "10px", textAlign: "center",
                marginBottom: "1.5rem", display: "block", transition: "all 0.2s",
                ...(tier.highlight
                  ? { background: spectrum, color: c.deep }
                  : { background: "#1a1e32", color: c.text, border: "1px solid #2a2e42" }),
              }}>
                {tier.cta}
              </Link>

              <div style={{ height: "1px", background: "#1e2235", marginBottom: "1.25rem" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {tier.features.map((f) => (
                  <li key={f} style={{ fontFamily: mono, fontSize: "0.78rem", color: c.muted, lineHeight: 1.6, marginBottom: "0.45rem", paddingLeft: "1.25rem", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: tier.accent, fontSize: "0.9rem" }}>+</span>
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <section style={{ maxWidth: "620px", margin: "0 auto", padding: "0 0 5rem" }}>
          <h2 style={{ fontFamily: heading, fontSize: "1.4rem", fontWeight: 700, textAlign: "center", marginBottom: "2rem" }}>
            Questions
          </h2>
          {faqs.map((f, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: openFaq === i ? c.surface : "transparent",
                border: "none", borderBottom: "1px solid #1e2235",
                padding: "1.25rem 0.75rem", cursor: "pointer",
                borderRadius: openFaq === i ? "12px" : 0,
                transition: "background 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: heading, fontSize: "0.95rem", fontWeight: 600, color: c.text }}>{f.q}</span>
                <span style={{
                  fontFamily: mono, fontSize: "0.85rem", color: openFaq === i ? c.cyan : c.muted,
                  transition: "color 0.2s", flexShrink: 0, marginLeft: "1rem",
                }}>
                  {openFaq === i ? "−" : "+"}
                </span>
              </div>
              {openFaq === i && (
                <p style={{ fontFamily: mono, fontSize: "0.82rem", color: c.muted, lineHeight: 1.65, marginTop: "0.75rem" }}>{f.a}</p>
              )}
            </button>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1e2235", position: "relative", zIndex: 10 }}>
        <span style={{ fontFamily: mono, fontSize: "0.72rem", color: "#3a3e55" }}>wavelength</span>
        <Link to="/" style={{ fontFamily: mono, fontSize: "0.72rem", color: "#3a3e55", textDecoration: "none" }}>all variants</Link>
      </footer>
    </div>
  );
}
