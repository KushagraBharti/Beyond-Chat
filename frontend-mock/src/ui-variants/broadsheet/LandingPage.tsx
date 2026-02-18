import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/*
 * BROADSHEET — Editorial / Print / Newspaper aesthetic
 * Fonts: Cormorant Garamond (display) + Source Serif 4 (body)
 * Colors: Ivory paper (#FAF7F2), black ink, crimson accent (#C5303A)
 * Layout: Multi-column newspaper grid, thin rules, drop caps, pull quotes
 * Feel: New York Times meets Stripe — refined, intellectual, timeless
 */

const serif = "'Cormorant Garamond', serif";
const body = "'Source Serif 4', serif";

const studios = [
  {
    name: "Writing",
    desc: "Draft, constrain, refine, and export polished prose with a structured composition environment.",
  },
  {
    name: "Research",
    desc: "Multi-step investigative workflows producing organized, citation-rich analytical reports.",
  },
  {
    name: "Image",
    desc: "Prompt engineering with variant generation, iterative refinement, and curated visual libraries.",
  },
  {
    name: "Data",
    desc: "Tabular upload, transformation pipelines, and AI-driven statistical insight extraction.",
  },
  {
    name: "Finance",
    desc: "Autonomous agent research with transparent step-by-step methodology and structured output.",
  },
  {
    name: "Compare",
    desc: "Simultaneous multi-model inference across GPT-4, Claude, Gemini, and others. Side-by-side.",
  },
];

export default function BroadsheetLanding() {
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
      {/* Subtle paper texture overlay */}
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
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "2rem 2rem 0",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Top rule */}
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
          <span
            style={{
              fontFamily: body,
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "#999",
            }}
          >
            Est. 2025
          </span>
          <div style={{ display: "flex", gap: "2rem", alignItems: "baseline" }}>
            <Link
              to="/broadsheet/pricing"
              style={{
                fontFamily: body,
                fontSize: "0.8rem",
                color: "#666",
                textDecoration: "none",
                letterSpacing: "0.05em",
              }}
            >
              Subscriptions
            </Link>
            <Link
              to="/broadsheet/login"
              style={{
                fontFamily: body,
                fontSize: "0.8rem",
                color: "#C5303A",
                textDecoration: "none",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
        <div style={{ height: "1px", background: "#ddd", margin: "0" }} />

        {/* Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ textAlign: "center", padding: "2.5rem 0 1.5rem" }}
        >
          <h1
            style={{
              fontFamily: serif,
              fontSize: "clamp(3rem, 7vw, 5.5rem)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              lineHeight: 0.95,
              color: "#1a1a1a",
            }}
          >
            Beyond Chat
          </h1>
          <p
            style={{
              fontFamily: body,
              fontSize: "0.85rem",
              fontStyle: "italic",
              color: "#888",
              marginTop: "0.75rem",
              letterSpacing: "0.04em",
            }}
          >
            A modular AI workspace for structured, reusable output
          </p>
        </motion.div>
        <div style={{ height: "1px", background: "#ddd" }} />
      </header>

      {/* Hero — editorial layout */}
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 2rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Three-column hero */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2px 1.8fr 2px 1fr",
            gap: "0",
            padding: "2.5rem 0",
            minHeight: "420px",
          }}
        >
          {/* Left column */}
          <div style={{ padding: "0 1.5rem 0 0" }}>
            <p
              style={{
                fontFamily: body,
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: "#C5303A",
                marginBottom: "1rem",
                fontWeight: 600,
              }}
            >
              The Problem
            </p>
            <p
              style={{
                fontFamily: body,
                fontSize: "0.95rem",
                lineHeight: 1.75,
                color: "#444",
              }}
            >
              Chat interfaces work for quick questions. But for real
              work&mdash;research, writing, data analysis, image
              generation&mdash;they create an endless scroll of lost context and
              buried outputs. You need structure. You need artifacts. You need
              something beyond chat.
            </p>
          </div>

          {/* Rule */}
          <div style={{ background: "#e0dbd3", width: "1px" }} />

          {/* Center column — headline */}
          <div style={{ padding: "0 2.5rem" }}>
            <h2
              style={{
                fontFamily: serif,
                fontSize: "clamp(2rem, 4vw, 3.2rem)",
                fontWeight: 400,
                lineHeight: 1.15,
                marginBottom: "1.5rem",
                letterSpacing: "-0.01em",
              }}
            >
              <span style={{ color: "#C5303A", fontStyle: "italic" }}>
                Six dedicated studios
              </span>{" "}
              replace the endless chat thread with purpose-built workspaces for
              every kind of AI work
            </h2>
            <p
              style={{
                fontFamily: body,
                fontSize: "1rem",
                lineHeight: 1.8,
                color: "#555",
              }}
            >
              <span
                style={{
                  fontFamily: serif,
                  fontSize: "3rem",
                  float: "left",
                  lineHeight: 0.85,
                  marginRight: "0.3rem",
                  marginTop: "0.15rem",
                  fontWeight: 600,
                  color: "#1a1a1a",
                }}
              >
                E
              </span>
              very output you generate is saved as a reusable artifact. Notes,
              reports, images, tables, prompts&mdash;searchable, filterable,
              attachable to future requests. Run the same prompt across
              GPT&#8209;4, Claude, Gemini, and more. Compare results
              side&#8209;by&#8209;side. Keep only what works.
            </p>
            <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
              <Link
                to="/broadsheet/login"
                style={{
                  fontFamily: body,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#FAF7F2",
                  background: "#1a1a1a",
                  padding: "0.75rem 2rem",
                  textDecoration: "none",
                  letterSpacing: "0.02em",
                  display: "inline-block",
                }}
              >
                Begin reading &rarr;
              </Link>
              <a
                href="#studios"
                style={{
                  fontFamily: body,
                  fontSize: "0.85rem",
                  color: "#666",
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                  padding: "0.75rem 0",
                  display: "inline-block",
                }}
              >
                See the studios
              </a>
            </div>
          </div>

          {/* Rule */}
          <div style={{ background: "#e0dbd3", width: "1px" }} />

          {/* Right column — pull quote */}
          <div style={{ padding: "0 0 0 1.5rem" }}>
            <blockquote
              style={{
                fontFamily: serif,
                fontSize: "1.5rem",
                fontStyle: "italic",
                lineHeight: 1.35,
                color: "#333",
                borderLeft: "3px solid #C5303A",
                paddingLeft: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              &ldquo;Stop scrolling through chat logs for that one good output
              you made last Tuesday.&rdquo;
            </blockquote>
            <p
              style={{
                fontFamily: body,
                fontSize: "0.85rem",
                lineHeight: 1.7,
                color: "#777",
              }}
            >
              Beyond Chat saves every generation as a named, tagged, searchable
              artifact. Find anything in seconds.
            </p>
          </div>
        </motion.section>

        {/* Thin rule */}
        <div style={{ height: "1px", background: "#e0dbd3" }} />

        {/* Studios Section */}
        <section id="studios" style={{ padding: "3rem 0" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
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
              Section II
            </p>
            <h2
              style={{
                fontFamily: serif,
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 400,
                letterSpacing: "-0.01em",
              }}
            >
              The Studios
            </h2>
          </div>

          {/* Two-column newspaper grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1px 1fr",
              gap: "0",
            }}
          >
            {studios.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                style={{
                  padding: "1.5rem 2rem",
                  borderBottom: "1px solid #e0dbd3",
                  gridColumn: i % 2 === 0 ? "1" : "3",
                  gridRow: Math.floor(i / 2) + 1,
                }}
              >
                <h3
                  style={{
                    fontFamily: serif,
                    fontSize: "1.4rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    display: "flex",
                    alignItems: "baseline",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: body,
                      fontSize: "0.65rem",
                      color: "#C5303A",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      fontWeight: 600,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.name} Studio
                </h3>
                <p
                  style={{
                    fontFamily: body,
                    fontSize: "0.9rem",
                    lineHeight: 1.7,
                    color: "#555",
                  }}
                >
                  {s.desc}
                </p>
              </motion.div>
            ))}
            {/* Vertical rule between columns */}
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                style={{
                  gridColumn: "2",
                  gridRow: row + 1,
                  background: "#e0dbd3",
                }}
              />
            ))}
          </div>
        </section>

        <div style={{ height: "1px", background: "#e0dbd3" }} />

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
          }}
        >
          <h2
            style={{
              fontFamily: serif,
              fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
              fontWeight: 300,
              fontStyle: "italic",
              marginBottom: "1rem",
            }}
          >
            The workspace that respects your work.
          </h2>
          <p
            style={{
              fontFamily: body,
              fontSize: "0.95rem",
              color: "#666",
              marginBottom: "2rem",
              maxWidth: "420px",
              margin: "0 auto 2rem",
              lineHeight: 1.7,
            }}
          >
            Join the readers who've moved beyond chat. Your first workspace is
            free, always.
          </p>
          <Link
            to="/broadsheet/login"
            style={{
              fontFamily: body,
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#fff",
              background: "#C5303A",
              padding: "0.85rem 2.5rem",
              textDecoration: "none",
              letterSpacing: "0.02em",
              display: "inline-block",
            }}
          >
            Subscribe free &rarr;
          </Link>
        </motion.section>

        <div style={{ height: "3px", background: "#1a1a1a" }} />
      </main>

      {/* Footer */}
      <footer
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "1.5rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: body,
            fontSize: "0.75rem",
            color: "#999",
            fontStyle: "italic",
          }}
        >
          Beyond Chat &mdash; A modular AI workspace
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
