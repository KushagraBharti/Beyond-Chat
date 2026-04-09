import { useState } from "react";
import { motion } from "framer-motion";
import { comparePrompt, type CompareResult } from "../../lib/api";
import { headingFont, bodyFont, theme, fadeUp } from "../../lib/theme";

const MODELS = [
  { id: "openai/gpt-4o", label: "GPT-4o", color: "#10A37F" },
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet", color: "#D97706" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini Flash", color: "#4285F4" },
];

const COMPARE_COLOR = "#8B5CF6";

export default function ComparePage() {
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(MODELS.map((m) => m.id)));
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const run = async () => {
    if (selected.size < 2 || !prompt.trim()) return;
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const res = await comparePrompt({ prompt: prompt.trim(), models: Array.from(selected) });
      setResults(res.results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Compare request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: bodyFont, padding: "2rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `${COMPARE_COLOR}14`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.95rem",
              color: COMPARE_COLOR,
            }}
          >
            ⧉
          </div>
          <h1 style={{ fontFamily: headingFont, fontSize: "1.35rem", fontWeight: 700, color: theme.ink, margin: 0 }}>
            Model Compare
          </h1>
        </div>
        <p style={{ color: theme.muted, fontSize: "0.85rem", margin: 0 }}>
          Same prompt, multiple models, side-by-side.
        </p>
      </motion.div>

      {/* Prompt */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" style={{ marginBottom: "1.25rem" }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a prompt to compare across models…"
          rows={4}
          maxLength={4000}
          style={{
            width: "100%",
            padding: "0.85rem 1rem",
            borderRadius: 10,
            border: `1px solid ${theme.border}`,
            fontFamily: bodyFont,
            fontSize: "0.9rem",
            resize: "vertical",
            outline: "none",
            background: theme.surface,
            color: theme.ink,
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = COMPARE_COLOR)}
          onBlur={(e) => (e.currentTarget.style.borderColor = theme.border)}
        />
      </motion.div>

      {/* Model selector */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}
      >
        {MODELS.map((m) => {
          const active = selected.has(m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: 8,
                border: `1.5px solid ${active ? m.color : theme.border}`,
                background: active ? `${m.color}12` : theme.surface,
                color: active ? m.color : theme.muted,
                fontFamily: bodyFont,
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </motion.div>

      {/* Compare button */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" style={{ marginBottom: "2rem" }}>
        <button
          onClick={run}
          disabled={loading || selected.size < 2 || !prompt.trim()}
          style={{
            padding: "0.65rem 1.6rem",
            borderRadius: 8,
            background: loading || selected.size < 2 || !prompt.trim() ? theme.border : COMPARE_COLOR,
            color: loading || selected.size < 2 || !prompt.trim() ? theme.muted : "#fff",
            fontFamily: bodyFont,
            fontSize: "0.88rem",
            fontWeight: 600,
            border: "none",
            cursor: loading || selected.size < 2 || !prompt.trim() ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Comparing…" : "Compare"}
        </button>
      </motion.div>

      {error && (
        <p style={{ color: "#E5484D", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>
      )}

      {/* Results */}
      {(results.length > 0 || loading) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${loading ? selected.size : results.length}, 1fr)`,
            gap: "1rem",
          }}
        >
          {loading
            ? Array.from(selected).map((id) => {
                const m = MODELS.find((x) => x.id === id);
                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: theme.surface,
                      borderRadius: 12,
                      border: `1px solid ${theme.border}`,
                      padding: "1.25rem",
                      minHeight: 200,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: m?.color ?? theme.muted }} />
                      <span style={{ fontFamily: headingFont, fontWeight: 600, fontSize: "0.9rem", color: theme.ink }}>
                        {m?.label ?? id}
                      </span>
                    </div>
                    <motion.div
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      style={{ height: 16, width: "60%", borderRadius: 6, background: theme.border }}
                    />
                  </motion.div>
                );
              })
            : results.map((r) => {
                const m = MODELS.find((x) => x.id === r.model);
                return (
                  <motion.div
                    key={r.model}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: theme.surface,
                      borderRadius: 12,
                      border: `1px solid ${theme.border}`,
                      padding: "1.25rem",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: m?.color ?? theme.muted }} />
                      <span style={{ fontFamily: headingFont, fontWeight: 600, fontSize: "0.9rem", color: theme.ink }}>
                        {m?.label ?? r.model}
                      </span>
                    </div>

                    {r.error ? (
                      <p style={{ color: "#E5484D", fontSize: "0.82rem" }}>{r.error}</p>
                    ) : (
                      <div
                        style={{
                          flex: 1,
                          fontSize: "0.85rem",
                          lineHeight: 1.7,
                          color: theme.ink,
                          whiteSpace: "pre-wrap",
                          overflowY: "auto",
                          maxHeight: 400,
                        }}
                      >
                        {r.content}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: "0.75rem",
                        paddingTop: "0.5rem",
                        borderTop: `1px solid ${theme.subtle}`,
                        fontSize: "0.75rem",
                        color: theme.muted,
                        display: "flex",
                        gap: "1rem",
                      }}
                    >
                      <span>{(r.latencyMs / 1000).toFixed(1)}s</span>
                      <span>{r.status}</span>
                    </div>
                  </motion.div>
                );
              })}
        </div>
      )}
    </div>
  );
}
