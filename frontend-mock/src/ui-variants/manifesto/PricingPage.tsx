import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const display = "'Archivo Black', sans-serif";
const mono = "'Space Mono', monospace";

const c = {
  bg: "#FAFAFA",
  black: "#000000",
  neon: "#BEFF00",
  gray: "#666",
  rule: "#E0E0E0",
};

const grain = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

const tiers = [
  {
    name: "FREE",
    price: "$0",
    period: "FOREVER",
    desc: "For explorers. No card required.",
    cta: "START FREE",
    highlight: false,
    features: [
      "3 studios (Writing, Research, Image)",
      "50 runs / month",
      "100 artifacts",
      "1 workspace",
      "Community support",
    ],
  },
  {
    name: "PRO",
    price: "$20",
    period: "/MONTH",
    desc: "Full power. No limits.",
    cta: "START PRO TRIAL",
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
    name: "TEAM",
    price: "$40",
    period: "/SEAT/MO",
    desc: "For teams shipping together.",
    cta: "CONTACT SALES",
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

export default function ManifestoPricing() {
  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.black, position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: grain, backgroundSize: "256px 256px", pointerEvents: "none", zIndex: 100 }} />

      {/* Nav */}
      <nav style={{ padding: "1.25rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `2px solid ${c.black}`, position: "relative", zIndex: 10 }}>
        <Link to="/manifesto" style={{ textDecoration: "none", fontFamily: display, fontSize: "1.1rem", color: c.black }}>
          BEYOND<span style={{ color: c.neon, background: c.black, padding: "0 0.3rem", marginLeft: "0.2rem" }}>CHAT</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link to="/manifesto" style={{ fontFamily: mono, fontSize: "0.75rem", color: c.black, textDecoration: "none", letterSpacing: "0.05em" }}>HOME</Link>
          <Link to="/manifesto/login" style={{ fontFamily: mono, fontSize: "0.75rem", color: c.black, background: c.neon, padding: "0.6rem 1.5rem", textDecoration: "none", letterSpacing: "0.05em", border: `2px solid ${c.black}` }}>
            ENTER
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2.5rem", position: "relative", zIndex: 10 }}>
        {/* Header */}
        <div style={{ padding: "5rem 0 2rem", borderBottom: `2px solid ${c.black}`, marginBottom: "0" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span style={{ fontFamily: mono, fontSize: "0.65rem", letterSpacing: "0.15em", color: c.gray }}>PRICING</span>
            <h1 style={{ fontFamily: display, fontSize: "clamp(2.5rem, 6vw, 5rem)", letterSpacing: "-0.04em", lineHeight: 0.9, marginTop: "1rem" }}>
              PAY FOR<br />
              <span style={{ position: "relative", display: "inline-block" }}>
                POWER
                <div style={{ position: "absolute", bottom: "0.05em", left: 0, right: 0, height: "0.2em", background: c.neon, zIndex: -1 }} />
              </span>.
            </h1>
          </motion.div>
        </div>

        {/* Tier grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0" }}>
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              style={{
                padding: "2.5rem",
                borderRight: i < 2 ? `2px solid ${c.black}` : "none",
                borderBottom: `2px solid ${c.black}`,
                background: tier.highlight ? c.black : "transparent",
                color: tier.highlight ? c.bg : c.black,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.15em", color: tier.highlight ? "#888" : c.gray, marginBottom: "1rem" }}>
                {String(i + 1).padStart(2, "0")}
              </div>

              <h3 style={{ fontFamily: display, fontSize: "1.5rem", letterSpacing: "-0.01em", marginBottom: "0.5rem" }}>
                {tier.name}
              </h3>

              <p style={{ fontFamily: mono, fontSize: "0.75rem", color: tier.highlight ? "#aaa" : c.gray, marginBottom: "2rem", lineHeight: 1.6 }}>
                {tier.desc}
              </p>

              <div style={{ marginBottom: "2rem" }}>
                <span style={{ fontFamily: display, fontSize: "3rem", letterSpacing: "-0.03em" }}>{tier.price}</span>
                <span style={{ fontFamily: mono, fontSize: "0.7rem", color: tier.highlight ? "#888" : c.gray, marginLeft: "0.4rem" }}>{tier.period}</span>
              </div>

              <Link
                to="/manifesto/login"
                style={{
                  fontFamily: mono, fontSize: "0.75rem", fontWeight: 700, textDecoration: "none",
                  padding: "0.9rem 2rem", textAlign: "center", letterSpacing: "0.08em",
                  marginBottom: "2rem", display: "block", transition: "all 0.15s ease",
                  ...(tier.highlight
                    ? { background: c.neon, color: c.black, border: `2px solid ${c.neon}` }
                    : { background: "transparent", color: c.black, border: `2px solid ${c.black}` }),
                }}
              >
                {tier.cta} →
              </Link>

              <div style={{ height: "2px", background: tier.highlight ? "#333" : c.black, marginBottom: "1.5rem" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {tier.features.map((f) => (
                  <li key={f} style={{ fontFamily: mono, fontSize: "0.75rem", color: tier.highlight ? "#ccc" : "#444", lineHeight: 1.6, marginBottom: "0.5rem", paddingLeft: "1.25rem", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: tier.highlight ? c.neon : c.black, fontWeight: 700 }}>+</span>
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10 }}>
        <span style={{ fontFamily: mono, fontSize: "0.7rem", color: c.gray, letterSpacing: "0.05em" }}>BEYOND CHAT</span>
        <Link to="/" style={{ fontFamily: mono, fontSize: "0.7rem", color: c.gray, textDecoration: "none", letterSpacing: "0.05em" }}>ALL VARIANTS</Link>
      </footer>
    </div>
  );
}
