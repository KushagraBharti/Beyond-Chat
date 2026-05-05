import { useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { comparePrompt, openrouterChat, type CompareResult } from "../../lib/api";
import { fadeUp } from "../../lib/theme";
import { EmptyState, MotionCard, PageSection, PrimaryButton, TextArea } from "../../components/protectedUi";

const MODELS = [
  { id: "openai/gpt-4o", label: "GPT-4o", color: "#10A37F" },
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet", color: "#D97706" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini Flash", color: "#4285F4" },
];

const COMPARE_COLOR = "#8B5CF6";

function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="my-1.5 leading-[1.7] text-stone-800">{children}</p>,
        h1: ({ children }) => <h1 className="mb-1 mt-3 text-[1.05rem] font-bold text-stone-950">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-1 mt-3 text-[0.97rem] font-bold text-stone-950">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 mt-2 text-[0.92rem] font-bold text-stone-950">{children}</h3>,
        ul: ({ children }) => <ul className="my-1.5 ml-5 list-disc space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="my-1.5 ml-5 list-decimal space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="leading-[1.65] text-stone-800">{children}</li>,
        code: ({ children, className }) => {
          const isBlock = className?.startsWith("language-");
          return isBlock ? (
            <pre className="my-2 overflow-x-auto rounded-xl bg-stone-100 px-4 py-3 text-[0.8rem] text-stone-800">
              <code>{children}</code>
            </pre>
          ) : (
            <code className="rounded bg-black/[0.06] px-1 py-0.5 text-[0.85em] text-stone-800">{children}</code>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-stone-300 pl-3 text-stone-500">{children}</blockquote>
        ),
        strong: ({ children }) => <strong className="font-semibold text-stone-950">{children}</strong>,
        hr: () => <hr className="my-3 border-stone-200" />,
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full border-collapse text-[0.82rem]">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-stone-200 bg-stone-50 px-3 py-1.5 text-left font-semibold text-stone-950">{children}</th>,
        td: ({ children }) => <td className="border border-stone-200 px-3 py-1.5 text-stone-700">{children}</td>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
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

  const canCompare = !loading && selected.size >= 2 && !!prompt.trim();
  const hasResults = results.length > 0;

  return (
    <div className="page-wrap">
      <PageSection
        eyebrow="Compare Studio"
        title="Model Compare"
        description="Same prompt, multiple models, side-by-side."
        actions={
          <PrimaryButton type="button" onClick={() => void run()} disabled={!canCompare}>
            {loading ? "Comparing…" : "Compare"}
          </PrimaryButton>
        }
      />

      <div className="space-y-4">
        <MotionCard>
          <div className="context-builder-head">
            <div>
              <h3>Prompt</h3>
              <p>What would you like to compare across models?</p>
            </div>
          </div>

          <TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt to compare across models…"
            rows={5}
            maxLength={4000}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {MODELS.map((m) => {
              const active = selected.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className="rounded-xl border px-3.5 py-1.5 text-[0.82rem] font-semibold transition"
                  style={{
                    borderColor: active ? m.color : undefined,
                    background: active ? `${m.color}12` : undefined,
                    color: active ? m.color : undefined,
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </MotionCard>

        {(hasResults || loading) && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${loading ? selected.size : results.length}, minmax(0, 1fr))` }}
          >
            {loading
              ? Array.from(selected).map((id) => {
                  const m = MODELS.find((x) => x.id === id);
                  return (
                    <MotionCard key={id}>
                      <div className="mb-4 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ background: m?.color ?? "#aaa" }} />
                        <span className="text-[0.9rem] font-semibold text-stone-950">{m?.label ?? id}</span>
                      </div>
                      <motion.div
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="h-4 w-3/5 rounded-md bg-stone-200"
                      />
                    </MotionCard>
                  );
                })
              : results.map((r) => {
                  const m = MODELS.find((x) => x.id === r.model);
                  return (
                    <MotionCard key={r.model} className="flex flex-col">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ background: m?.color ?? "#aaa" }} />
                        <span className="text-[0.9rem] font-semibold text-stone-950">{m?.label ?? r.model}</span>
                      </div>

                      {r.error ? (
                        <p className="text-[0.82rem] text-rose-600">{r.error}</p>
                      ) : (
                        <div className="flex-1 overflow-y-auto text-[0.85rem] text-stone-800" style={{ maxHeight: 400 }}>
                          <Markdown text={r.content} />
                        </div>
                      )}

                      <div className="mt-3 flex gap-4 border-t border-stone-100 pt-2 text-xs text-stone-400">
                        <span>{(r.latencyMs / 1000).toFixed(1)}s</span>
                        <span>{r.status}</span>
                      </div>
                    </MotionCard>
                  );
                })}
          </motion.div>
        )}

        {!hasResults && !loading && (
          <MotionCard>
            <EmptyState title="No results yet" body="Enter a prompt and click Compare to see responses side by side." />
          </MotionCard>
        )}

        {hasResults && !loading && (
          <MotionCard>
            <div className="context-builder-head">
              <div>
                <h3>Synthesis</h3>
                <p>One best answer distilled from all responses.</p>
              </div>
              {!synthesis && !synthLoading && (
                <PrimaryButton
                  type="button"
                  onClick={() => void synthesize()}
                  disabled={results.filter((r) => !r.error).length < 2}
                >
                  Synthesize
                </PrimaryButton>
              )}
            </div>

            {synthError && <p className="text-sm text-rose-600">{synthError}</p>}

            {synthLoading && (
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="mt-2 h-4 w-1/2 rounded-md bg-stone-200"
              />
            )}

            {synthesis ? (
              <div
                className="mt-2 rounded-2xl border p-5 text-[0.9rem] text-stone-800"
                style={{ borderColor: `${COMPARE_COLOR}50`, boxShadow: `0 0 0 3px ${COMPARE_COLOR}10` }}
              >
                <Markdown text={synthesis} />
              </div>
            ) : !synthLoading ? (
              <EmptyState title="No synthesis yet" body="Click Synthesize to combine the best insights from all responses." />
            ) : null}
          </MotionCard>
        )}
      </div>
    </div>
  );
}
