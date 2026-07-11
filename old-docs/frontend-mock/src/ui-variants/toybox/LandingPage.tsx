import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/*
 * TOYBOX — Bold Geometric Maximalism
 * Fonts: Syne (display, 800 weight) + DM Sans (body)
 * Colors: White base, thick black outlines, primary color pops
 *   - Coral: #FF5C38
 *   - Electric blue: #3B5BFF
 *   - Lemon: #FFD43B
 *   - Mint: #2DD4A8
 * Layout: Chunky cards, rotated elements, overlapping shapes, pill buttons
 * Feel: Memphis Group meets modern SaaS — fun, bold, unapologetic
 */

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

const studios = [
  {
    name: "Writing",
    desc: "Structured composition with constraints, drafts, and polished exports.",
    color: colors.coral,
    rotate: "-2deg",
  },
  {
    name: "Research",
    desc: "Multi-step investigations that output organized, citeable reports.",
    color: colors.blue,
    rotate: "1.5deg",
  },
  {
    name: "Image",
    desc: "Visual prompt builder with variant grids and a gallery you'll actually use.",
    color: colors.lemon,
    rotate: "-1deg",
  },
  {
    name: "Data",
    desc: "Upload CSVs, run transformations, and get insights that make sense.",
    color: colors.mint,
    rotate: "2deg",
  },
  {
    name: "Finance",
    desc: "Agent-driven financial research. Every step visible. Every source cited.",
    color: colors.coral,
    rotate: "-1.5deg",
  },
  {
    name: "Compare",
    desc: "Same prompt. Multiple models. Side-by-side. Keep the best one.",
    color: colors.blue,
    rotate: "1deg",
  },
];

export default function ToyboxLanding() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        color: colors.ink,
        fontFamily: bodyFont,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Floating decorative shapes */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "-40px",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            border: `4px solid ${colors.coral}`,
            opacity: 0.2,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "60%",
            left: "-30px",
            width: "120px",
            height: "120px",
            background: colors.lemon,
            opacity: 0.15,
            transform: "rotate(45deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            right: "10%",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: colors.mint,
            opacity: 0.15,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "5%",
            width: "60px",
            height: "60px",
            border: `3px solid ${colors.blue}`,
            opacity: 0.15,
            transform: "rotate(15deg)",
          }}
        />
      </div>

      {/* Nav */}
      <nav
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
        <Link
          to="/toybox"
          style={{
            fontFamily: display,
            fontSize: "1.3rem",
            fontWeight: 800,
            color: colors.ink,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: colors.coral,
              border: `3px solid ${colors.ink}`,
            }}
          />
          Beyond Chat
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            to="/toybox/pricing"
            style={{
              fontFamily: display,
              fontSize: "0.85rem",
              fontWeight: 600,
              color: colors.ink,
              textDecoration: "none",
            }}
          >
            Pricing
          </Link>
          <Link
            to="/toybox/login"
            style={{
              fontFamily: display,
              fontSize: "0.85rem",
              fontWeight: 700,
              color: colors.ink,
              textDecoration: "none",
              background: colors.lemon,
              padding: "0.6rem 1.5rem",
              borderRadius: "99px",
              border: `3px solid ${colors.ink}`,
              boxShadow: `4px 4px 0 ${colors.ink}`,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(2px, 2px)";
              e.currentTarget.style.boxShadow = `2px 2px 0 ${colors.ink}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translate(0, 0)";
              e.currentTarget.style.boxShadow = `4px 4px 0 ${colors.ink}`;
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "4rem 2rem 3rem",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div
            style={{
              display: "inline-block",
              fontFamily: display,
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: colors.bg,
              background: colors.coral,
              padding: "0.4rem 1.2rem",
              borderRadius: "99px",
              border: `2px solid ${colors.ink}`,
              marginBottom: "2rem",
            }}
          >
            A workspace, not a chatbot
          </div>

          <h1
            style={{
              fontFamily: display,
              fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
              marginBottom: "1.5rem",
            }}
          >
            Make cool stuff
            <br />
            <span style={{ color: colors.blue }}>with AI.</span>
          </h1>

          <p
            style={{
              fontFamily: bodyFont,
              fontSize: "1.15rem",
              color: "#666",
              maxWidth: "520px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.6,
            }}
          >
            Six studios built for six different jobs. Every output saved as a
            real artifact you can search, reuse, and share.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/toybox/login"
              style={{
                fontFamily: display,
                fontSize: "1rem",
                fontWeight: 700,
                color: "#fff",
                textDecoration: "none",
                background: colors.blue,
                padding: "0.85rem 2.5rem",
                borderRadius: "99px",
                border: `3px solid ${colors.ink}`,
                boxShadow: `5px 5px 0 ${colors.ink}`,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(3px, 3px)";
                e.currentTarget.style.boxShadow = `2px 2px 0 ${colors.ink}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translate(0, 0)";
                e.currentTarget.style.boxShadow = `5px 5px 0 ${colors.ink}`;
              }}
            >
              Start building &rarr;
            </Link>
            <a
              href="#studios"
              style={{
                fontFamily: display,
                fontSize: "1rem",
                fontWeight: 600,
                color: colors.ink,
                textDecoration: "none",
                padding: "0.85rem 2.5rem",
                borderRadius: "99px",
                border: `3px solid ${colors.ink}`,
                background: "#fff",
                boxShadow: `5px 5px 0 ${colors.ink}`,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(3px, 3px)";
                e.currentTarget.style.boxShadow = `2px 2px 0 ${colors.ink}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translate(0, 0)";
                e.currentTarget.style.boxShadow = `5px 5px 0 ${colors.ink}`;
              }}
            >
              See studios
            </a>
          </div>
        </motion.div>
      </section>

      {/* Studios */}
      <section
        id="studios"
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "2rem 2rem 4rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{
            fontFamily: display,
            fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
            fontWeight: 800,
            textAlign: "center",
            marginBottom: "3rem",
            letterSpacing: "-0.02em",
          }}
        >
          Six studios.{" "}
          <span style={{ color: colors.coral }}>Zero endless scrolling.</span>
        </motion.h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {studios.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 30, rotate: Number(s.rotate.replace("deg", "")) }}
              whileInView={{
                opacity: 1,
                y: 0,
                rotate: Number(s.rotate.replace("deg", "")),
              }}
              whileHover={{ rotate: 0, scale: 1.03 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              style={{
                background: "#fff",
                border: `3px solid ${colors.ink}`,
                borderRadius: "20px",
                padding: "2rem",
                position: "relative",
                overflow: "hidden",
                cursor: "default",
                boxShadow: `6px 6px 0 ${colors.ink}`,
              }}
            >
              {/* Color dot */}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: s.color,
                  border: `3px solid ${colors.ink}`,
                  marginBottom: "1.25rem",
                }}
              />
              <h3
                style={{
                  fontFamily: display,
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                }}
              >
                {s.name}
              </h3>
              <p
                style={{
                  fontFamily: bodyFont,
                  fontSize: "0.9rem",
                  color: "#666",
                  lineHeight: 1.55,
                }}
              >
                {s.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features strip */}
      <section
        style={{
          background: colors.ink,
          color: "#fff",
          position: "relative",
          zIndex: 10,
          overflow: "hidden",
        }}
      >
        {/* Decorative shape */}
        <div
          style={{
            position: "absolute",
            top: "-30px",
            right: "10%",
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: colors.coral,
            opacity: 0.3,
          }}
        />
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "4rem 2rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2.5rem",
            position: "relative",
          }}
        >
          {[
            {
              title: "Artifact Library",
              desc: "Every output saved, tagged, and searchable. Attach artifacts to future requests for instant context.",
              color: colors.lemon,
            },
            {
              title: "Model Compare",
              desc: "Send the same prompt to GPT-4, Claude, Gemini — see results side-by-side. Keep the winner.",
              color: colors.mint,
            },
            {
              title: "Locked Down",
              desc: "Row-level security, encrypted storage, workspace isolation. We never train on your data.",
              color: colors.coral,
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <div
                style={{
                  width: "40px",
                  height: "8px",
                  background: f.color,
                  borderRadius: "99px",
                  marginBottom: "1.25rem",
                }}
              />
              <h3
                style={{
                  fontFamily: display,
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontFamily: bodyFont,
                  fontSize: "0.9rem",
                  color: "#aaa",
                  lineHeight: 1.6,
                }}
              >
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "5rem 2rem",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          style={{
            background: colors.lemon,
            border: `3px solid ${colors.ink}`,
            borderRadius: "28px",
            padding: "4rem 3rem",
            boxShadow: `8px 8px 0 ${colors.ink}`,
            position: "relative",
          }}
        >
          {/* Decorative circle */}
          <div
            style={{
              position: "absolute",
              top: "-20px",
              left: "-20px",
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: colors.coral,
              border: `3px solid ${colors.ink}`,
            }}
          />
          <h2
            style={{
              fontFamily: display,
              fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: "1rem",
            }}
          >
            Ready to play?
          </h2>
          <p
            style={{
              fontFamily: bodyFont,
              fontSize: "1.05rem",
              color: "#555",
              marginBottom: "2rem",
              maxWidth: "400px",
              margin: "0 auto 2rem",
              lineHeight: 1.6,
            }}
          >
            Your first workspace is free. No credit card. No trial expiration.
            Just start.
          </p>
          <Link
            to="/toybox/login"
            style={{
              fontFamily: display,
              fontSize: "1rem",
              fontWeight: 700,
              color: "#fff",
              textDecoration: "none",
              background: colors.ink,
              padding: "0.85rem 2.5rem",
              borderRadius: "99px",
              border: `3px solid ${colors.ink}`,
              display: "inline-block",
              boxShadow: `4px 4px 0 ${colors.coral}`,
            }}
          >
            Let's go &rarr;
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "1.5rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `3px solid ${colors.ink}`,
          position: "relative",
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: display,
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#999",
          }}
        >
          Beyond Chat
        </span>
        <Link
          to="/"
          style={{
            fontFamily: display,
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#999",
            textDecoration: "none",
          }}
        >
          All variants &rarr;
        </Link>
      </footer>
    </div>
  );
}
