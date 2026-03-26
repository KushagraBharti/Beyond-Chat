import { useState } from "react";
import { motion } from "framer-motion";
import { compareModels } from "../../lib/api";
import type { ModelResponse } from "../../types/compare";

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

const STUDIO_COLOR = "#8B5CF6";

const AVAILABLE_MODELS = [
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", color: "#10A37F", icon: "◆" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet", provider: "Anthropic", color: "#D97706", icon: "◈" },
  { id: "google/gemini-2.0-flash-001", name: "Gemini Flash", provider: "Google", color: "#4285F4", icon: "◇" },
] as const;

export default function ComparePage() {
  const [prompt, setPrompt] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [results, setResults] = useState<ModelResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleModel = (id: string) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : prev.length < 3 ? [...prev, id] : prev,
    );
  };

  const canCompare = selectedModels.length >= 2 && prompt.trim() !== "" && !loading;

  const handleCompare = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const data = await compareModels(prompt.trim(), selectedModels);
      setResults(data.results);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: body, height: "100vh", display: "flex", flexDirection: "column", background: c.canvas }}>
      {/* Header */}
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
            background: `${STUDIO_COLOR}12`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.95rem",
            color: STUDIO_COLOR,
          }}
        >
          ⧉
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
            Model Compare
          </h2>
          <p style={{ color: c.muted, fontSize: "0.78rem", margin: 0 }}>
            Same prompt. GPT-4o, Claude, Gemini side-by-side.
          </p>
        </div>
      </motion.div>

      {/* Workspace */}
      <div style={{ flex: 1, overflow: "auto", padding: "2rem" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          {/* Prompt */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: c.ink,
                marginBottom: "0.5rem",
              }}
            >
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt to compare across models..."
              style={{
                width: "100%",
                minHeight: 120,
                padding: "1rem",
                borderRadius: 12,
                border: `1px solid ${c.border}`,
                background: c.surface,
                fontFamily: body,
                fontSize: "0.92rem",
                color: c.ink,
                outline: "none",
                resize: "vertical",
                transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = STUDIO_COLOR;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = c.border;
              }}
            />
          </motion.div>

          {/* Model Selector */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06 }}
            style={{ marginTop: "1.5rem" }}
          >
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: c.ink,
                marginBottom: "0.5rem",
              }}
            >
              Select models (pick 2–3)
            </label>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {AVAILABLE_MODELS.map((model) => {
                const selected = selectedModels.includes(model.id);
                return (
                  <button
                    key={model.id}
                    onClick={() => toggleModel(model.id)}
                    style={{
                      flex: 1,
                      padding: "1rem",
                      borderRadius: 12,
                      border: `2px solid ${selected ? model.color : c.border}`,
                      background: selected ? `${model.color}10` : c.surface,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: `${model.color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1rem",
                        color: model.color,
                        flexShrink: 0,
                      }}
                    >
                      {model.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: heading,
                          fontSize: "0.92rem",
                          fontWeight: 700,
                          color: c.ink,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {model.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: c.muted }}>{model.provider}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Compare Button */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            style={{ marginTop: "1.5rem" }}
          >
            <button
              onClick={handleCompare}
              disabled={!canCompare}
              style={{
                padding: "0.85rem 2rem",
                borderRadius: 10,
                background: canCompare ? c.ink : c.border,
                color: canCompare ? "#fff" : c.muted,
                fontFamily: body,
                fontSize: "0.92rem",
                fontWeight: 700,
                border: "none",
                cursor: canCompare ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                boxShadow: canCompare ? "0 4px 14px rgba(0,0,0,0.1)" : "none",
              }}
              onMouseEnter={(e) => {
                if (canCompare) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = canCompare ? "0 4px 14px rgba(0,0,0,0.1)" : "none";
              }}
            >
              {loading ? "Comparing..." : "Compare"}
            </button>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                color: "#DC2626",
                fontSize: "0.85rem",
                margin: "1rem 0 0",
                padding: "0.5rem 0.75rem",
                background: "#FEF2F2",
                borderRadius: 8,
                border: "1px solid #FECACA",
              }}
            >
              {error}
            </motion.p>
          )}

          {/* Loading Placeholders */}
          {loading && (
            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              {selectedModels.map((modelId, i) => {
                const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
                return (
                  <motion.div
                    key={modelId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    style={{
                      flex: 1,
                      background: c.surface,
                      borderRadius: 12,
                      border: `1px solid ${c.border}`,
                      padding: "1.25rem",
                      minHeight: 200,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: model?.color ?? c.muted,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: heading,
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: c.ink,
                        }}
                      >
                        {model?.name ?? modelId}
                      </span>
                    </div>
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      style={{ color: c.muted, fontSize: "0.85rem" }}
                    >
                      Generating...
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              {results.map((result, i) => {
                const model = AVAILABLE_MODELS.find((m) => m.id === result.model);
                return (
                  <motion.div
                    key={result.model}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    style={{
                      flex: 1,
                      background: c.surface,
                      borderRadius: 12,
                      border: `1px solid ${c.border}`,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Column Header */}
                    <div
                      style={{
                        padding: "1rem 1.25rem",
                        borderBottom: `1px solid ${c.border}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: model?.color ?? c.muted,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: heading,
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: c.ink,
                        }}
                      >
                        {model?.name ?? result.model}
                      </span>
                    </div>

                    {/* Response Body */}
                    <div style={{ padding: "1.25rem", flex: 1 }}>
                      {result.error ? (
                        <p style={{ color: "#E5484D", fontSize: "0.85rem", margin: 0 }}>
                          Error: {result.error}
                        </p>
                      ) : (
                        <p
                          style={{
                            fontSize: "0.88rem",
                            color: c.ink,
                            lineHeight: 1.7,
                            margin: 0,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {result.content}
                        </p>
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div
                      style={{
                        padding: "0.75rem 1.25rem",
                        borderTop: `1px solid ${c.border}`,
                        display: "flex",
                        gap: "1rem",
                        fontSize: "0.75rem",
                        color: c.muted,
                      }}
                    >
                      <span>{(result.duration_ms / 1000).toFixed(1)}s</span>
                      {result.tokens != null && <span>{result.tokens} tokens</span>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
