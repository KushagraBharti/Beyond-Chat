import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import WritingStudioPage from "./WritingStudioPage";

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

const studioMeta: Record<string, { name: string; desc: string; color: string; icon: string }> = {
  writing: { name: "Writing Studio", desc: "Draft with constraints, refine with AI, export polished documents.", color: "#4F3FE8", icon: "✎" },
  research: { name: "Research Studio", desc: "Multi-step investigations that produce organized, citation-rich reports.", color: "#0E7AE6", icon: "◉" },
  image: { name: "Image Studio", desc: "Visual prompt engineering with variant grids and iterative refinement.", color: "#E5484D", icon: "◧" },
  data: { name: "Data Studio", desc: "Upload tables, apply transformations, and surface statistical insights.", color: "#30A46C", icon: "▤" },
  finance: { name: "Finance Studio", desc: "Autonomous agent research with transparent step-by-step reasoning.", color: "#E55613", icon: "△" },
  compare: { name: "Model Compare", desc: "Same prompt. GPT-4, Claude, Gemini side-by-side.", color: "#8B5CF6", icon: "⧉" },
};

export default function StudioPage() {
  const { studioId } = useParams<{ studioId: string }>();
  const navigate = useNavigate();
  const studio = studioId ? studioMeta[studioId] : null;

  if (studioId === "writing") {
    return <WritingStudioPage />;
  }

  if (!studio) {
    return (
      <div style={{ padding: "3rem", fontFamily: body }}>
        <p style={{ color: c.muted }}>Studio not found.</p>
        <button onClick={() => navigate("/dashboard")} style={{ color: c.primary, background: "none", border: "none", cursor: "pointer", fontFamily: body, fontSize: "0.9rem", padding: 0 }}>
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: body, height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Studio header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          padding: "1.25rem 2rem",
          borderBottom: `1px solid ${c.border}`,
          background: c.surface,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${studio.color}12`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.95rem",
            color: studio.color,
          }}
        >
          {studio.icon}
        </div>
        <div>
          <h2
            style={{
              fontFamily: heading,
              fontSize: "1.1rem",
              fontWeight: 700,
              color: c.ink,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {studio.name}
          </h2>
          <p style={{ color: c.muted, fontSize: "0.78rem", margin: 0 }}>{studio.desc}</p>
        </div>
      </motion.div>

      {/* Workspace area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{ textAlign: "center", maxWidth: 400 }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `${studio.color}10`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              color: studio.color,
              margin: "0 auto 1.25rem",
              border: `1px dashed ${studio.color}40`,
            }}
          >
            {studio.icon}
          </div>
          <h3
            style={{
              fontFamily: heading,
              fontSize: "1.25rem",
              fontWeight: 700,
              color: c.ink,
              margin: "0 0 0.5rem 0",
              letterSpacing: "-0.02em",
            }}
          >
            {studio.name} is coming soon
          </h3>
          <p style={{ color: c.muted, fontSize: "0.88rem", lineHeight: 1.6, margin: "0 0 1.5rem 0" }}>
            This workspace is being built. You'll be able to {studio.desc.toLowerCase().replace(/\.$/, "")} right here.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: 8,
              background: c.ink,
              color: "#fff",
              fontFamily: body,
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            ← Back to studios
          </button>
        </motion.div>
      </div>
    </div>
  );
}
