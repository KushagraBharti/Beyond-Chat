import React, { useState } from "react";
import { motion } from "framer-motion";
import { comparePrompt, openrouterChat, type CompareResult } from "../../lib/api";
import { headingFont, bodyFont, theme, fadeUp } from "../../lib/theme";

const MODELS = [
  { id: "openai/gpt-4o", label: "GPT-4o", color: "#10A37F" },
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet", color: "#D97706" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini Flash", color: "#4285F4" },
];

const COMPARE_COLOR = "#8B5CF6";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith("`") && p.endsWith("`")) {
      return (
        <code key={i} style={{ background: "#00000010", padding: "0 4px", borderRadius: 3 }}>
          {p.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;
  const flushList = () => {
    if (!listBuffer) return;
    const Tag = listBuffer.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} style={{ margin: "0.4rem 0 0.6rem 1.25rem", paddingLeft: 0 }}>
        {listBuffer.items.map((item, i) => (
          <li key={i} style={{ marginBottom: "0.3rem" }}>{renderInline(item)}</li>
        ))}
      </Tag>
    );
    listBuffer = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushList(); continue; }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushList();
      const level = h[1].length;
      const size = level === 1 ? "1.1rem" : level === 2 ? "1rem" : "0.95rem";
      blocks.push(
        <div key={blocks.length} style={{ fontWeight: 700, fontSize: size, margin: "0.8rem 0 0.4rem", color: theme.ink }}>
          {renderInline(h[2])}
        </div>
      );
      continue;
    }
    const ol = line.match(/^\s*(\d+)\.\s+(.*)$/);
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ol) {
      if (!listBuffer || !listBuffer.ordered) { flushList(); listBuffer = { ordered: true, items: [] }; }
      listBuffer.items.push(ol[2]);
      continue;
    }
    if (ul) {
      if (!listBuffer || listBuffer.ordered) { flushList(); listBuffer = { ordered: false, items: [] }; }
      listBuffer.items.push(ul[1]);
      continue;
    }
    flushList();
    blocks.push(
      <p key={blocks.length} style={{ margin: "0.4rem 0", lineHeight: 1.7 }}>
        {renderInline(line)}
      </p>
    );
  }
  flushList();
  return <>{blocks}</>;
}

export default function ComparePage() {
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(MODELS.map((m) => m.id)));
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [synthesis, setSynthesis] = useState("");
  const [synthLoading, setSynthLoading] = useState(false);
  const [synthError, setSynthError] = useState("");

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
    setSynthesis("");
    setSynthError("");
    try {
      const res = await comparePrompt({ prompt: prompt.trim(), models: Array.from(selected) });
      setResults(res.results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Compare request failed");
    } finally {
      setLoading(false);
    }
  };

  const synthesize = async () => {
    const usable = results.filter((r) => !r.error && r.content.trim());
    if (usable.length < 2) return;
    setSynthLoading(true);
    setSynthError("");
    setSynthesis("");
    try {
      const responses = usable
        .map((r, i) => {
          const label = MODELS.find((m) => m.id === r.model)?.label ?? r.model;
          return `### Response ${i + 1} — ${label}\n${r.content.trim()}`;
        })
        .join("\n\n");
      const synthPrompt = `You are a rigorous expert editor. Below are ${usable.length} different AI responses to the same user prompt. Produce a single best answer with these rules:

1. Combine the strongest, most accurate insights from all responses.
2. Correct any factual errors you can identify, even if multiple responses repeat the same mistake — do not inherit errors just because they appear in the majority.
3. When responses disagree on a fact, pick the more accurate one and briefly note the disagreement if it matters.
4. Flag genuinely uncertain or contested claims with a brief hedge (e.g. "some scholars argue…", "this is disputed") rather than presenting them as settled.
5. Do not smooth over gaps — if an important aspect of the question is missing from all responses, acknowledge it briefly rather than fabricating.
6. Do not mention the source models or that you are combining answers. Write as a single authoritative voice.
7. Prioritize precision over confident-sounding prose.

Original prompt:
"""
${prompt.trim()}
"""

${responses}

### Best Synthesized Answer`;
      const res = await openrouterChat({
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: synthPrompt }],
        temperature: 0.3,
      });
      setSynthesis(res.content);
    } catch (e: unknown) {
      setSynthError(e instanceof Error ? e.message : "Synthesis failed");
    } finally {
      setSynthLoading(false);
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
                          color: theme.ink,
                          overflowY: "auto",
                          maxHeight: 400,
                        }}
                      >
                        <Markdown text={r.content} />
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

      {/* Synthesize */}
      {results.length >= 2 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: "1.5rem" }}
        >
          {!synthesis && !synthLoading && (
            <button
              onClick={synthesize}
              style={{
                padding: "0.65rem 1.6rem",
                borderRadius: 8,
                background: COMPARE_COLOR,
                color: "#fff",
                fontFamily: bodyFont,
                fontSize: "0.88rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              ✨ Synthesize Best Answer
            </button>
          )}
          {synthError && (
            <p style={{ color: "#E5484D", fontSize: "0.85rem", marginTop: "0.75rem" }}>{synthError}</p>
          )}
          {(synthesis || synthLoading) && (
            <div
              style={{
                background: theme.surface,
                borderRadius: 12,
                border: `1.5px solid ${COMPARE_COLOR}`,
                padding: "1.5rem",
                boxShadow: `0 0 0 4px ${COMPARE_COLOR}14`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.1rem" }}>✨</span>
                <span
                  style={{
                    fontFamily: headingFont,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: COMPARE_COLOR,
                  }}
                >
                  Synthesized Best Answer
                </span>
              </div>
              {synthLoading ? (
                <motion.div
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ height: 16, width: "50%", borderRadius: 6, background: theme.border }}
                />
              ) : (
                <div style={{ fontSize: "0.9rem", color: theme.ink }}>
                  <Markdown text={synthesis} />
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
