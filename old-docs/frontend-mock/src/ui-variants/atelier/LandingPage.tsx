import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";

/*
 * ATELIER — Professional AI Workspace Aesthetic
 * Fonts: Bricolage Grotesque (display) + Plus Jakarta Sans (body)
 * Colors:
 *   Canvas: #F7F7F5 (warm off-white)
 *   Surface: #FFFFFF
 *   Ink: #111111
 *   Primary: #5B4FE9 (rich indigo)
 *   Accent: #F06225 (warm orange)
 *   Studio palette: indigo, blue, rose, green, orange, violet
 *   Muted: #71717A
 *   Border: #E8E8E6
 * Layout: Product-focused, workspace preview in hero, bento grid studios
 * Background: Dot-grid canvas pattern
 * Feel: Linear + Figma + Notion — you're looking at a real product
 */

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
  subtle: "#F0F0EE",
};

const studioColors = {
  writing: "#5B4FE9",
  research: "#0E7AE6",
  image: "#E5484D",
  data: "#30A46C",
  finance: "#F06225",
  compare: "#8B5CF6",
};

const studios = [
  {
    name: "Writing Studio",
    desc: "Draft with constraints, refine with AI, export polished documents. Your structured composition environment.",
    color: studioColors.writing,
    span: "col",
  },
  {
    name: "Research Studio",
    desc: "Multi-step investigations that produce organized, citation-rich reports with visible methodology.",
    color: studioColors.research,
    span: "col",
  },
  {
    name: "Image Studio",
    desc: "Visual prompt engineering with variant grids, iterative refinement, and an organized gallery.",
    color: studioColors.image,
    span: "row",
  },
  {
    name: "Data Studio",
    desc: "Upload tables, apply transformation steps, and surface AI-driven statistical insights.",
    color: studioColors.data,
    span: "col",
  },
  {
    name: "Finance Studio",
    desc: "Autonomous agent research with transparent step-by-step reasoning and structured output.",
    color: studioColors.finance,
    span: "col",
  },
  {
    name: "Model Compare",
    desc: "Same prompt. GPT-4, Claude, Gemini, Llama — side-by-side. Keep the best result as an artifact.",
    color: studioColors.compare,
    span: "wide",
  },
];

const dotGrid = "radial-gradient(circle, #d4d4d2 0.8px, transparent 0.8px)";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function AtelierLanding() {
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
      {/* Dot grid background */}
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
          {/* Logo mark — layered squares representing studios */}
          <div style={{ position: "relative", width: "24px", height: "24px" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "14px",
                height: "14px",
                borderRadius: "4px",
                background: c.primary,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "14px",
                height: "14px",
                borderRadius: "4px",
                background: c.accent,
                opacity: 0.8,
              }}
            />
          </div>
          <span
            style={{
              fontFamily: heading,
              fontSize: "1.1rem",
              fontWeight: 700,
              color: c.ink,
              letterSpacing: "-0.02em",
            }}
          >
            Beyond Chat
          </span>
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2rem",
          }}
        >
          <div
            style={{
              display: "none",
              gap: "1.5rem",
              alignItems: "center",
            }}
            className="atelier-nav-links"
          >
            <Link
              to="/atelier"
              style={{
                fontFamily: body,
                fontSize: "0.85rem",
                fontWeight: 500,
                color: c.ink,
                textDecoration: "none",
              }}
            >
              Home
            </Link>
            <Link
              to="/atelier/pricing"
              style={{
                fontFamily: body,
                fontSize: "0.85rem",
                fontWeight: 500,
                color: c.muted,
                textDecoration: "none",
              }}
            >
              Pricing
            </Link>
            <a
              href="#studios"
              style={{
                fontFamily: body,
                fontSize: "0.85rem",
                fontWeight: 500,
                color: c.muted,
                textDecoration: "none",
              }}
            >
              Studios
            </a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link
              to="/atelier/login"
              style={{
                fontFamily: body,
                fontSize: "0.85rem",
                fontWeight: 500,
                color: c.muted,
                textDecoration: "none",
              }}
            >
              Sign in
            </Link>
            <Link
              to="/atelier/login"
              style={{
                fontFamily: body,
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#fff",
                textDecoration: "none",
                background: c.primary,
                padding: "0.55rem 1.25rem",
                borderRadius: "8px",
                transition: "all 0.2s ease",
                boxShadow: `0 1px 2px rgba(91,79,233,0.2)`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#4F43D6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = c.primary)}
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "5rem 2rem 4rem",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "4rem",
          alignItems: "center",
          position: "relative",
          zIndex: 10,
        }}
        className="atelier-hero-grid"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ maxWidth: "660px" }}
        >
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.35rem 0.9rem",
              background: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: "99px",
              marginBottom: "1.75rem",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#30A46C",
              }}
            />
            <span
              style={{
                fontFamily: body,
                fontSize: "0.78rem",
                fontWeight: 500,
                color: c.muted,
              }}
            >
              A modular AI workspace
            </span>
          </div>

          <h1
            style={{
              fontFamily: heading,
              fontSize: "clamp(2.5rem, 5.5vw, 4.2rem)",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              marginBottom: "1.5rem",
            }}
          >
            Your AI work,
            <br />
            <span style={{ color: c.primary }}>finally organized.</span>
          </h1>

          <p
            style={{
              fontFamily: body,
              fontSize: "1.1rem",
              color: c.muted,
              lineHeight: 1.65,
              maxWidth: "480px",
              marginBottom: "2rem",
            }}
          >
            Six purpose-built studios replace the endless chat thread.
            Every output saved as a reusable artifact. Compare models
            side-by-side. This is how professionals use AI.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/atelier/login"
              style={{
                fontFamily: body,
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#fff",
                textDecoration: "none",
                background: c.primary,
                padding: "0.75rem 1.75rem",
                borderRadius: "10px",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                transition: "all 0.2s ease",
                boxShadow: `0 2px 8px rgba(91,79,233,0.25)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#4F43D6";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(91,79,233,0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = c.primary;
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(91,79,233,0.25)";
              }}
            >
              Start for free
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
            <a
              href="#studios"
              style={{
                fontFamily: body,
                fontSize: "0.9rem",
                fontWeight: 500,
                color: c.muted,
                textDecoration: "none",
                padding: "0.75rem 1.75rem",
                borderRadius: "10px",
                border: `1px solid ${c.border}`,
                background: c.surface,
                transition: "border-color 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#ccc")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.border)}
            >
              See how it works
            </a>
          </div>
        </motion.div>

        {/* Hero visual — CSS workspace mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          style={{
            background: c.surface,
            borderRadius: "16px",
            border: `1px solid ${c.border}`,
            padding: "1.5rem",
            boxShadow: "0 8px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Fake app chrome */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              marginBottom: "1rem",
              paddingBottom: "1rem",
              borderBottom: `1px solid ${c.border}`,
            }}
          >
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#E5484D" }} />
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F5D90A" }} />
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#30A46C" }} />
            <div
              style={{
                marginLeft: "auto",
                fontFamily: body,
                fontSize: "0.65rem",
                color: "#bbb",
                fontWeight: 500,
              }}
            >
              beyond-chat.app/workspace
            </div>
          </div>

          {/* Bento layout mockup of studios */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gridTemplateRows: "auto auto auto",
              gap: "0.6rem",
            }}
          >
            {/* Sidebar mock */}
            <div
              style={{
                gridRow: "1 / 4",
                background: c.subtle,
                borderRadius: "8px",
                padding: "0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              {Object.entries(studioColors).map(([name, color]) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "5px",
                    background: name === "writing" ? `${color}10` : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "2px",
                      background: color,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: body,
                      fontSize: "0.55rem",
                      fontWeight: 500,
                      color: name === "writing" ? color : "#999",
                      textTransform: "capitalize",
                    }}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>

            {/* Main content area */}
            <div
              style={{
                gridColumn: "2 / 4",
                gridRow: "1 / 3",
                background: c.subtle,
                borderRadius: "8px",
                padding: "0.75rem",
              }}
            >
              <div
                style={{
                  width: "60%",
                  height: "8px",
                  background: c.border,
                  borderRadius: "4px",
                  marginBottom: "0.5rem",
                }}
              />
              <div
                style={{
                  width: "80%",
                  height: "6px",
                  background: c.border,
                  borderRadius: "3px",
                  marginBottom: "0.35rem",
                }}
              />
              <div
                style={{
                  width: "45%",
                  height: "6px",
                  background: c.border,
                  borderRadius: "3px",
                  marginBottom: "0.75rem",
                }}
              />
              {/* Mini artifact cards */}
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {[studioColors.writing, studioColors.research, studioColors.image].map(
                  (clr, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: "32px",
                        borderRadius: "5px",
                        background: c.surface,
                        border: `1px solid ${c.border}`,
                        borderTop: `2px solid ${clr}`,
                      }}
                    />
                  )
                )}
              </div>
            </div>

            {/* Right panel — model compare mockup */}
            <div
              style={{
                gridColumn: "4",
                gridRow: "1 / 4",
                background: c.subtle,
                borderRadius: "8px",
                padding: "0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <div
                style={{
                  fontFamily: body,
                  fontSize: "0.5rem",
                  fontWeight: 600,
                  color: studioColors.compare,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "0.2rem",
                }}
              >
                Compare
              </div>
              {["GPT-4", "Claude", "Gemini"].map((model) => (
                <div
                  key={model}
                  style={{
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    borderRadius: "5px",
                    padding: "0.4rem 0.5rem",
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      fontFamily: body,
                      fontSize: "0.5rem",
                      fontWeight: 600,
                      color: "#999",
                    }}
                  >
                    {model}
                  </span>
                  <div
                    style={{
                      width: "70%",
                      height: "4px",
                      background: c.border,
                      borderRadius: "2px",
                      marginTop: "0.3rem",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Bottom bar */}
            <div
              style={{
                gridColumn: "2 / 4",
                background: c.subtle,
                borderRadius: "8px",
                padding: "0.6rem 0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <div
                style={{
                  fontFamily: body,
                  fontSize: "0.5rem",
                  fontWeight: 600,
                  color: studioColors.data,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Artifacts
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  gap: "0.3rem",
                }}
              >
                {[studioColors.writing, studioColors.finance, studioColors.image, studioColors.data].map(
                  (clr, i) => (
                    <div
                      key={i}
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "3px",
                        background: `${clr}18`,
                        border: `1px solid ${clr}30`,
                      }}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* How it works strip */}
      <section
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "0 2rem 4rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1px",
            background: c.border,
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          {[
            {
              step: "01",
              title: "Choose a studio",
              desc: "Pick the workspace that matches your task — writing, research, image, data, finance, or compare.",
              color: c.primary,
            },
            {
              step: "02",
              title: "Generate & refine",
              desc: "Use structured prompts, attach context, run multi-step workflows. Every studio is optimized for its job.",
              color: c.accent,
            },
            {
              step: "03",
              title: "Save as artifact",
              desc: "Every output becomes a named, tagged, searchable artifact. Attach it to future requests or export it.",
              color: "#30A46C",
            },
          ].map((s) => (
            <motion.div
              key={s.step}
              variants={fadeUp}
              style={{
                background: c.surface,
                padding: "2rem",
              }}
            >
              <span
                style={{
                  fontFamily: heading,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: s.color,
                  letterSpacing: "-0.01em",
                }}
              >
                {s.step}
              </span>
              <h3
                style={{
                  fontFamily: heading,
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  marginTop: "0.75rem",
                  marginBottom: "0.5rem",
                  letterSpacing: "-0.02em",
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  fontFamily: body,
                  fontSize: "0.88rem",
                  color: c.muted,
                  lineHeight: 1.6,
                }}
              >
                {s.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Studios — bento grid */}
      <section
        id="studios"
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "0 2rem 5rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: "2.5rem" }}
        >
          <span
            style={{
              fontFamily: body,
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: c.primary,
              display: "block",
              marginBottom: "0.5rem",
            }}
          >
            Studios
          </span>
          <h2
            style={{
              fontFamily: heading,
              fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            A dedicated workspace for every kind of work
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.75rem",
          }}
          className="atelier-studio-grid"
        >
          {studios.map((s) => (
            <motion.div
              key={s.name}
              variants={fadeUp}
              style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: "14px",
                padding: "1.75rem",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.25s ease",
                cursor: "default",
                gridColumn:
                  s.span === "wide" ? "span 3" : s.span === "row" ? "span 1" : "span 1",
              }}
              className="atelier-studio-card"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = s.color + "40";
                e.currentTarget.style.boxShadow = `0 4px 20px ${s.color}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = c.border;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Color accent bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "1.75rem",
                  right: "1.75rem",
                  height: "2px",
                  background: `linear-gradient(90deg, ${s.color}, ${s.color}00)`,
                  opacity: 0.6,
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  marginBottom: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "3px",
                    background: s.color,
                  }}
                />
                <h3
                  style={{
                    fontFamily: heading,
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.name}
                </h3>
              </div>
              <p
                style={{
                  fontFamily: body,
                  fontSize: "0.88rem",
                  color: c.muted,
                  lineHeight: 1.6,
                }}
              >
                {s.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Key features */}
      <section
        style={{
          background: c.ink,
          color: "#fff",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: "1240px",
            margin: "0 auto",
            padding: "5rem 2rem",
          }}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              style={{
                fontFamily: body,
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: c.accent,
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              Core features
            </motion.span>
            <motion.h2
              variants={fadeUp}
              style={{
                fontFamily: heading,
                fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: "3rem",
                maxWidth: "500px",
              }}
            >
              Built for how professionals actually use AI
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "2rem",
            }}
          >
            {[
              {
                label: "Artifact Library",
                desc: "Every output is saved as a named, tagged, searchable artifact. Filter by studio, type, or date. Attach artifacts to any future request for instant context.",
                color: "#30A46C",
                icon: (
                  <div style={{ display: "flex", gap: "4px" }}>
                    {["#5B4FE9", "#E5484D", "#30A46C", "#F06225"].map((clr, i) => (
                      <div
                        key={i}
                        style={{
                          width: "12px",
                          height: "16px",
                          borderRadius: "3px",
                          background: clr,
                          opacity: 0.7,
                        }}
                      />
                    ))}
                  </div>
                ),
              },
              {
                label: "Model Compare",
                desc: "Send the same prompt to GPT-4, Claude, Gemini, Llama, and more through OpenRouter. See results side-by-side. Save the best as an artifact.",
                color: "#8B5CF6",
                icon: (
                  <div style={{ display: "flex", gap: "3px", alignItems: "flex-end" }}>
                    {[14, 18, 12].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          width: "10px",
                          height: `${h}px`,
                          borderRadius: "2px",
                          background: i === 1 ? "#8B5CF6" : "#8B5CF640",
                        }}
                      />
                    ))}
                  </div>
                ),
              },
              {
                label: "Context Builder",
                desc: "Attach files, artifacts, and notes to any request. See a clear list of everything the model receives. No more pasting the same context repeatedly.",
                color: "#0E7AE6",
                icon: (
                  <div
                    style={{
                      width: "22px",
                      height: "18px",
                      borderRadius: "4px",
                      border: "2px solid #0E7AE6",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "3px",
                        left: "3px",
                        width: "8px",
                        height: "2px",
                        background: "#0E7AE6",
                        borderRadius: "1px",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "7px",
                        left: "3px",
                        width: "12px",
                        height: "2px",
                        background: "#0E7AE660",
                        borderRadius: "1px",
                      }}
                    />
                  </div>
                ),
              },
            ].map((f) => (
              <motion.div key={f.label} variants={fadeUp}>
                <div style={{ marginBottom: "1rem" }}>{f.icon}</div>
                <h3
                  style={{
                    fontFamily: heading,
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    marginBottom: "0.5rem",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {f.label}
                </h3>
                <p
                  style={{
                    fontFamily: body,
                    fontSize: "0.9rem",
                    color: "#999",
                    lineHeight: 1.65,
                  }}
                >
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "5rem 2rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            background: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: "20px",
            padding: "4rem 3rem",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Gradient accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: `linear-gradient(90deg, ${c.primary}, ${c.accent}, #30A46C, #E5484D)`,
            }}
          />

          <h2
            style={{
              fontFamily: heading,
              fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: "0.75rem",
            }}
          >
            Ready to organize your AI work?
          </h2>
          <p
            style={{
              fontFamily: body,
              fontSize: "1rem",
              color: c.muted,
              marginBottom: "2rem",
              maxWidth: "420px",
              margin: "0 auto 2rem",
              lineHeight: 1.6,
            }}
          >
            Free forever plan. No credit card required. Your workspace is
            waiting.
          </p>
          <Link
            to="/atelier/login"
            style={{
              fontFamily: body,
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#fff",
              textDecoration: "none",
              background: c.primary,
              padding: "0.85rem 2rem",
              borderRadius: "10px",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 2px 8px rgba(91,79,233,0.25)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#4F43D6";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(91,79,233,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = c.primary;
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(91,79,233,0.25)";
            }}
          >
            Get started free
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        </motion.div>
      </section>

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
        <span style={{ fontFamily: body, fontSize: "0.8rem", color: "#bbb" }}>
          Beyond Chat
        </span>
        <Link
          to="/"
          style={{
            fontFamily: body,
            fontSize: "0.8rem",
            color: "#bbb",
            textDecoration: "none",
          }}
        >
          All variants
        </Link>
      </footer>

      <style>{`
        @media (min-width: 900px) {
          .atelier-hero-grid { grid-template-columns: 1fr 1.1fr !important; }
          .atelier-nav-links { display: flex !important; }
        }
        @media (max-width: 768px) {
          .atelier-studio-grid { grid-template-columns: 1fr !important; }
          .atelier-studio-card { grid-column: span 1 !important; }
        }
      `}</style>
    </div>
  );
}
