import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const serif = "'Cormorant Garamond', serif";
const body = "'Source Serif 4', serif";

const tiers = [
  {
    name: "Reader",
    price: "Free",
    sub: "No charge, ever",
    features: [
      "3 studios — Writing, Research, Image",
      "50 runs per month",
      "100 artifact limit",
      "Single workspace",
      "Community forum access",
    ],
    cta: "Start reading",
  },
  {
    name: "Correspondent",
    price: "$20",
    sub: "per month, billed monthly",
    highlight: true,
    features: [
      "All 6 studios, unlimited runs",
      "Unlimited artifact storage",
      "Model Compare — up to 5 models",
      "Context Builder with file attachments",
      "PDF & Markdown export",
      "5 workspaces",
      "Priority correspondence",
    ],
    cta: "Subscribe now",
  },
  {
    name: "Newsroom",
    price: "$40",
    sub: "per seat / month",
    features: [
      "Everything in Correspondent",
      "Unlimited workspaces",
      "Shared artifact library",
      "Collaborative annotations",
      "Admin controls & permissions",
      "SSO & audit trail",
      "Dedicated editorial support",
    ],
    cta: "Contact the desk",
  },
];

const faqs = [
  {
    q: "May I change my subscription at any time?",
    a: "Certainly. Upgrades take effect immediately; downgrades apply at the next billing date. No cancellation fees.",
  },
  {
    q: "Which language models are available?",
    a: "All major models through OpenRouter — GPT-4, Claude, Gemini, Llama, Mistral, and a growing roster of alternatives.",
  },
  {
    q: "How is my data handled?",
    a: "Row-level security, encryption at rest, full workspace isolation. We never train models on your content. Your work remains exclusively yours.",
  },
  {
    q: "Are personal API keys required?",
    a: "No. Correspondent and Newsroom plans include compute credits. The Reader tier operates under a monthly run limit.",
  },
];

export default function BroadsheetPricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF7F2",
        color: "#1a1a1a",
        fontFamily: body,
        position: "relative",
      }}
    >
      {/* Paper texture */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Masthead */}
      <header
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "2rem 2rem 0",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: "3px",
            background: "#1a1a1a",
            marginBottom: "0.5rem",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "0.5rem 0",
          }}
        >
          <Link
            to="/broadsheet"
            style={{
              fontFamily: serif,
              fontSize: "1.6rem",
              fontWeight: 300,
              color: "#1a1a1a",
              textDecoration: "none",
            }}
          >
            Beyond Chat
          </Link>
          <div style={{ display: "flex", gap: "2rem", alignItems: "baseline" }}>
            <Link
              to="/broadsheet"
              style={{
                fontFamily: body,
                fontSize: "0.8rem",
                color: "#666",
                textDecoration: "none",
              }}
            >
              Front Page
            </Link>
            <Link
              to="/broadsheet/login"
              style={{
                fontFamily: body,
                fontSize: "0.8rem",
                color: "#C5303A",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
        <div style={{ height: "1px", background: "#ddd" }} />
      </header>

      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 2rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: "center", padding: "3rem 0 1rem" }}
        >
          <p
            style={{
              fontFamily: body,
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "#C5303A",
              marginBottom: "0.5rem",
              fontWeight: 600,
            }}
          >
            Subscription Rates
          </p>
          <h1
            style={{
              fontFamily: serif,
              fontSize: "clamp(2rem, 4vw, 3.2rem)",
              fontWeight: 300,
              letterSpacing: "-0.01em",
            }}
          >
            Choose your edition
          </h1>
          <p
            style={{
              fontFamily: body,
              fontSize: "0.95rem",
              color: "#777",
              fontStyle: "italic",
              marginTop: "0.5rem",
            }}
          >
            Begin with the Reader edition at no charge. Upgrade as your needs
            grow.
          </p>
        </motion.div>

        <div
          style={{
            height: "1px",
            background: "#e0dbd3",
            marginBottom: "2rem",
          }}
        />

        {/* Pricing — newspaper classifieds style */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0",
            borderLeft: "1px solid #e0dbd3",
          }}
        >
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              style={{
                padding: "2rem 2rem 2.5rem",
                borderRight: "1px solid #e0dbd3",
                position: "relative",
                background: tier.highlight
                  ? "linear-gradient(180deg, #f5f0e8 0%, #FAF7F2 100%)"
                  : "transparent",
              }}
            >
              {tier.highlight && (
                <div
                  style={{
                    position: "absolute",
                    top: "-1px",
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: "#C5303A",
                  }}
                />
              )}
              <p
                style={{
                  fontFamily: body,
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  color: "#999",
                  marginBottom: "0.75rem",
                }}
              >
                {tier.highlight ? "Recommended" : `Edition ${i + 1}`}
              </p>
              <h3
                style={{
                  fontFamily: serif,
                  fontSize: "1.8rem",
                  fontWeight: 600,
                  marginBottom: "0.25rem",
                }}
              >
                {tier.name}
              </h3>
              <div
                style={{
                  fontFamily: serif,
                  fontSize: "2.2rem",
                  fontWeight: 300,
                  margin: "1rem 0 0.25rem",
                }}
              >
                {tier.price}
              </div>
              <p
                style={{
                  fontFamily: body,
                  fontSize: "0.75rem",
                  color: "#999",
                  fontStyle: "italic",
                  marginBottom: "1.5rem",
                }}
              >
                {tier.sub}
              </p>

              <div
                style={{
                  height: "1px",
                  background: "#e0dbd3",
                  margin: "0 0 1.5rem",
                }}
              />

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem" }}>
                {tier.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      fontFamily: body,
                      fontSize: "0.85rem",
                      lineHeight: 1.65,
                      color: "#555",
                      paddingLeft: "1rem",
                      position: "relative",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        color: "#C5303A",
                        fontSize: "0.75rem",
                      }}
                    >
                      &bull;
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/broadsheet/login"
                style={{
                  fontFamily: body,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "0.7rem 1.5rem",
                  display: "inline-block",
                  letterSpacing: "0.02em",
                  ...(tier.highlight
                    ? {
                        background: "#C5303A",
                        color: "#fff",
                      }
                    : {
                        background: "transparent",
                        color: "#1a1a1a",
                        border: "1px solid #ccc",
                      }),
                }}
              >
                {tier.cta} &rarr;
              </Link>
            </motion.div>
          ))}
        </div>

        <div
          style={{
            height: "1px",
            background: "#e0dbd3",
            marginTop: "0",
          }}
        />

        {/* FAQ */}
        <section style={{ maxWidth: "680px", margin: "0 auto", padding: "3rem 0" }}>
          <h2
            style={{
              fontFamily: serif,
              fontSize: "1.8rem",
              fontWeight: 400,
              textAlign: "center",
              marginBottom: "2rem",
            }}
          >
            Frequently Asked
          </h2>
          {faqs.map((f, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                borderBottom: "1px solid #e0dbd3",
                padding: "1.25rem 0",
                cursor: "pointer",
                fontFamily: body,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: serif,
                    fontSize: "1.1rem",
                    fontWeight: 500,
                    color: "#1a1a1a",
                  }}
                >
                  {f.q}
                </span>
                <span
                  style={{
                    color: "#C5303A",
                    fontSize: "1.2rem",
                    transition: "transform 0.3s",
                    transform:
                      openFaq === i ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  +
                </span>
              </div>
              {openFaq === i && (
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "#666",
                    lineHeight: 1.7,
                    marginTop: "0.75rem",
                  }}
                >
                  {f.a}
                </p>
              )}
            </button>
          ))}
        </section>

        <div style={{ height: "3px", background: "#1a1a1a" }} />
      </main>

      <footer
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "1.5rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 10,
        }}
      >
        <span
          style={{ fontFamily: body, fontSize: "0.75rem", color: "#999", fontStyle: "italic" }}
        >
          Beyond Chat
        </span>
        <Link
          to="/"
          style={{
            fontFamily: body,
            fontSize: "0.75rem",
            color: "#999",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          All editions
        </Link>
      </footer>
    </div>
  );
}
