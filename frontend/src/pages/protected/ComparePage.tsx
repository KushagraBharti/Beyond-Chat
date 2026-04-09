import { useState } from "react";
import { motion } from "framer-motion";
import { comparePrompt, type CompareResult } from "../../lib/api";
import { bodyFont, headingFont, theme } from "../../lib/theme";
import { MotionCard, PageSection, PrimaryButton, TextArea } from "../../components/protectedUi";

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
    console.log("Starting run with prompt:", prompt, "models:", Array.from(selected));
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const res = await comparePrompt({ prompt: prompt.trim(), models: Array.from(selected) });
      console.log("Got res from comparePrompt:", res);
      setResults(res.results);
      console.log("Set results!", res.results);
    } catch (e: unknown) {
      console.error("Caught error in compare:", e);
      setError(e instanceof Error ? e.message : "Compare request failed");
    } finally {
      console.log("Finished run");
      setLoading(false);
    }
  };

  return (
    <motion.div className="page-wrap" initial="hidden" animate="visible">
      <PageSection
        eyebrow="Model Comparison"
        title="Compare Studio"
        description="Same prompt, multiple models, side-by-side."
      />

      <MotionCard className="chat-main-card">
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a prompt to compare across models…"
          rows={4}
          maxLength={4000}
        />

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
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
        </div>
        
        <div style={{ marginTop: "1rem" }}>
          <PrimaryButton
            onClick={run}
            disabled={loading || selected.size < 2 || !prompt.trim()}
          >
            {loading ? "Comparing…" : "Compare"}
          </PrimaryButton>
        </div>

        {error && (
          <p style={{ color: "#E5484D", fontSize: "0.85rem", marginTop: "1rem" }}>{error}</p>
        )}
      </MotionCard>

      {(results.length > 0 || loading) && (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${loading ? selected.size : results.length}, 1fr)`,
          gap: "1rem",
        }}>
          {loading
            ? Array.from(selected).map((id) => {
                const m = MODELS.find((x) => x.id === id);
                return (
                  <MotionCard key={id} style={{ minHeight: 200 }}>
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
                  </MotionCard>
                );
              })
            : results.map((r) => {
                const m = MODELS.find((x) => x.id === r.model);
                return (
                  <MotionCard key={r.model} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
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
                          maxHeight: 600,
                        }}
                      >
                        {r.content}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: "auto",
                        paddingTop: "1rem",
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
                  </MotionCard>
                );
              })}
        </div>
      )}
    </motion.div>
  );
}
