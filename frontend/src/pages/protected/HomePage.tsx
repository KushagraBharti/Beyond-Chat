import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";

const heading = "'Bricolage Grotesque', sans-serif";
const body = "'Plus Jakarta Sans', sans-serif";

const c = {
  canvas: "#F2F2F0",
  surface: "#FFFFFF",
  ink: "#0D0D0D",
  primary: "#4F3FE8",
  muted: "#6B6B70",
  border: "#E2E2E0",
};

const studios = [
  {
    id: "writing",
    name: "Writing Studio",
    desc: "Draft with constraints, refine with AI, export polished documents.",
    color: "#4F3FE8",
    icon: "✎",
    span: 2,
  },
  {
    id: "research",
    name: "Research Studio",
    desc: "Multi-step investigations that produce organized, citation-rich reports.",
    color: "#0E7AE6",
    icon: "◉",
    span: 1,
  },
  {
    id: "image",
    name: "Image Studio",
    desc: "Visual prompt engineering with variant grids and iterative refinement.",
    color: "#E5484D",
    icon: "◧",
    span: 1,
  },
  {
    id: "data",
    name: "Data Studio",
    desc: "Upload tables, apply transformations, and surface statistical insights.",
    color: "#30A46C",
    icon: "▤",
    span: 1,
  },
  {
    id: "finance",
    name: "Finance Studio",
    desc: "Autonomous agent research with transparent step-by-step reasoning.",
    color: "#E55613",
    icon: "△",
    span: 1,
  },
  {
    id: "compare",
    name: "Model Compare",
    desc: "Same prompt. GPT-4, Claude, Gemini side-by-side.",
    color: "#8B5CF6",
    icon: "⧉",
    span: 2,
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.email?.split("@")[0] ?? "there";

  return (
    <div style={{ padding: "2.5rem 3rem", maxWidth: 960, fontFamily: body }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: "2.5rem" }}
      >
        <h1
          style={{
            fontFamily: heading,
            fontSize: "1.85rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: c.ink,
            marginBottom: "0.35rem",
          }}
        >
          Good {getGreeting()}, {firstName}
        </h1>
        <p style={{ color: c.muted, fontSize: "0.95rem", margin: 0 }}>
          Pick a studio to start working, or continue where you left off.
        </p>
      </motion.div>

      {/* Studio Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1rem",
        }}
      >
        {studios.map((studio, i) => (
          <motion.div
            key={studio.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            onClick={() => navigate(`/studio/${studio.id}`)}
            style={{
              gridColumn: studio.span === 2 ? "span 2" : "span 1",
              background: c.surface,
              borderRadius: 14,
              border: `1px solid ${c.border}`,
              padding: "1.5rem",
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
              overflow: "hidden",
            }}
            whileHover={{
              y: -3,
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              borderColor: studio.color,
            }}
          >
            {/* Accent bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: studio.color,
                opacity: 0.7,
                borderRadius: "14px 14px 0 0",
              }}
            />

            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${studio.color}10`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  color: studio.color,
                  flexShrink: 0,
                }}
              >
                {studio.icon}
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: heading,
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: c.ink,
                    margin: "0 0 0.3rem 0",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {studio.name}
                </h3>
                <p style={{ color: c.muted, fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
                  {studio.desc}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
