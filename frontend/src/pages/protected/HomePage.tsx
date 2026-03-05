import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
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
  const [prompt, setPrompt] = useState("Draft a 5-point MVP shipping plan for this week.");
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [loadingModel, setLoadingModel] = useState(false);
  const [modelOutput, setModelOutput] = useState("");
  const [modelError, setModelError] = useState("");

  const firstName = user?.email?.split("@")[0] ?? "there";

  const runOpenRouterPrompt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoadingModel(true);
    setModelError("");

    try {
      const response = await fetch("/api/openrouter/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const payload = (await response.json()) as { detail?: string; content?: string };
      if (!response.ok) {
        throw new Error(payload.detail ?? "OpenRouter request failed.");
      }

      setModelOutput(payload.content ?? "");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected OpenRouter error.";
      setModelError(message);
      setModelOutput("");
    } finally {
      setLoadingModel(false);
    }
  };

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

      <motion.form
        onSubmit={runOpenRouterPrompt}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, padding: "1rem", marginBottom: "1.5rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem", marginBottom: "0.6rem", flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: heading, fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>
            OpenRouter Quick Prompt (MVP)
          </h2>
          <select
            value={model}
            onChange={(event) => setModel(event.target.value)}
            style={{ border: `1px solid ${c.border}`, borderRadius: 8, background: c.canvas, padding: "0.45rem 0.55rem", fontSize: "0.82rem" }}
          >
            <option value="openai/gpt-4o-mini">openai/gpt-4o-mini</option>
            <option value="anthropic/claude-3.5-sonnet">anthropic/claude-3.5-sonnet</option>
            <option value="google/gemini-2.0-flash-001">google/gemini-2.0-flash-001</option>
          </select>
        </div>

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={3}
          style={{
            width: "100%",
            border: `1px solid ${c.border}`,
            borderRadius: 10,
            background: c.canvas,
            padding: "0.6rem 0.7rem",
            fontSize: "0.88rem",
            resize: "vertical",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem", gap: "0.8rem", flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: "0.78rem", color: c.muted }}>Requires `OPENROUTER_API_KEY` in `backend/.env`.</p>
          <button
            type="submit"
            disabled={loadingModel || prompt.trim().length === 0}
            style={{
              background: c.ink,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0.5rem 0.9rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: loadingModel ? "not-allowed" : "pointer",
              opacity: loadingModel ? 0.65 : 1,
            }}
          >
            {loadingModel ? "Running..." : "Run Prompt"}
          </button>
        </div>

        {modelError && (
          <p style={{ marginTop: "0.6rem", color: "#B42318", fontSize: "0.82rem" }}>{modelError}</p>
        )}
        {modelOutput && (
          <div style={{ marginTop: "0.6rem", padding: "0.7rem", borderRadius: 10, border: `1px solid ${c.border}`, background: c.canvas }}>
            <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.45, fontSize: "0.88rem" }}>{modelOutput}</p>
          </div>
        )}
      </motion.form>

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
