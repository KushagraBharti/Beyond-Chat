import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import ArtifactSaveButton from "../../components/ArtifactSaveButton";
import ContextBuilder from "../../components/ContextBuilder";
import { comparePrompt, type CompareResult } from "../../lib/api";
import { buildCompareArtifactInput } from "../../lib/artifactDrafts";

const availableModels = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-2.0-flash-001",
];

type ComparePanelLaunch = {
  prompt?: string;
  contextIds?: string[];
  studio?: string;
};

type ComparePanelContextValue = {
  openComparePanel: (launch?: ComparePanelLaunch) => void;
  closeComparePanel: () => void;
};

const ComparePanelContext = createContext<ComparePanelContextValue>({
  openComparePanel: () => undefined,
  closeComparePanel: () => undefined,
});

export function ComparePanelProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [contextIds, setContextIds] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>(availableModels);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studio, setStudio] = useState("chat");

  const value = useMemo<ComparePanelContextValue>(
    () => ({
      openComparePanel: (launch) => {
        setPrompt(launch?.prompt ?? "");
        setContextIds(launch?.contextIds ?? []);
        setStudio(launch?.studio ?? "chat");
        setResults([]);
        setError(null);
        setSelectedModels(availableModels);
        setIsOpen(true);
      },
      closeComparePanel: () => setIsOpen(false),
    }),
    [],
  );

  const toggleModel = (model: string) => {
    setSelectedModels((current) =>
      current.includes(model) ? current.filter((item) => item !== model) : [...current, model],
    );
  };

  const runCompare = async () => {
    if (!prompt.trim() || selectedModels.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await comparePrompt({
        prompt,
        models: selectedModels,
        context_ids: contextIds,
      });
      setResults(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compare failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComparePanelContext.Provider value={value}>
      {children}

      {isOpen ? (
        <div className="fixed inset-0 z-[999] flex justify-end bg-stone-950/45 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-[680px] flex-col border-l border-white/60 bg-stone-50 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-stone-500">Shared Compare Panel</p>
                <h2 className="font-[Bricolage_Grotesque] text-3xl font-extrabold tracking-[-0.05em] text-stone-950">
                  Compare model outputs without leaving the current studio
                </h2>
                <p className="mt-2 text-sm text-stone-600">
                  Active source: <span className="font-semibold text-stone-900 capitalize">{studio}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-6">
                <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-[Bricolage_Grotesque] text-2xl font-bold tracking-[-0.04em]">Prompt</h3>
                      <p className="text-sm text-stone-600">Use the same prompt and attached context across multiple models.</p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
                      {contextIds.length} context items
                    </span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Ask all selected models the same question..."
                    className="min-h-36 w-full rounded-[1.25rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </section>

                <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
                  <div className="mb-4">
                    <h3 className="font-[Bricolage_Grotesque] text-2xl font-bold tracking-[-0.04em]">Models</h3>
                    <p className="text-sm text-stone-600">Choose one or more providers for a side-by-side result set.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {availableModels.map((model) => {
                      const active = selectedModels.includes(model);
                      return (
                        <button
                          key={model}
                          type="button"
                          onClick={() => toggleModel(model)}
                          className={`rounded-[1.25rem] border px-4 py-4 text-left text-sm transition ${
                            active
                              ? "border-stone-950 bg-stone-950 text-white shadow-lg"
                              : "border-stone-200 bg-stone-50 text-stone-800 hover:border-stone-300 hover:bg-white"
                          }`}
                        >
                          <div className="font-semibold">{model}</div>
                          <div className={`mt-1 text-xs ${active ? "text-stone-300" : "text-stone-500"}`}>
                            {active ? "Included in this compare run" : "Click to include"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <ContextBuilder selectedIds={contextIds} onChange={setContextIds} title="Attached Context" />

                {error ? <div className="error-copy">{error}</div> : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-stone-600">
                    {results.length ? `${results.length} result(s) ready to review.` : "No results yet."}
                  </div>
                  <button
                    type="button"
                    onClick={() => void runCompare()}
                    disabled={loading || !prompt.trim() || selectedModels.length === 0}
                    className="rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                  >
                    {loading ? "Running compare..." : "Run Compare"}
                  </button>
                </div>

                <section className="grid gap-4">
                  {results.length ? (
                    results.map((result) => (
                      <article key={result.model} className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-[Bricolage_Grotesque] text-xl font-bold tracking-[-0.04em] text-stone-950">
                              {result.model}
                            </h4>
                            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                              {result.latencyMs ? `${result.latencyMs}ms` : "No provider latency"}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                              result.status === "completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : result.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : result.status === "not_configured"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {result.status}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap rounded-[1.25rem] bg-stone-50 p-4 text-sm leading-7 text-stone-700">
                          {result.content || result.error || "No response returned."}
                        </p>
                        <div className="mt-4 flex justify-end">
                          <ArtifactSaveButton
                            buildPayload={() =>
                              buildCompareArtifactInput({
                                prompt,
                                result,
                                contextIds,
                              })
                            }
                            disabled={!result.content || result.status === "failed"}
                            label="Save Result"
                            savedLabel="Saved"
                            saveKey={`${prompt}:${result.model}:${result.content}`}
                            onSaved={() => setError(null)}
                            onError={setError}
                          />
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[1.75rem] border border-dashed border-stone-300 bg-white/70 p-8 text-center text-sm text-stone-600">
                      Run a compare to populate the side-by-side result stack.
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ComparePanelContext.Provider>
  );
}

export function useComparePanel() {
  return useContext(ComparePanelContext);
}
