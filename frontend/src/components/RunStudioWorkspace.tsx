import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ArtifactSaveButton from "./ArtifactSaveButton";
import ContextBuilder from "./ContextBuilder";
import StepTimeline from "./StepTimeline";
import { createRun, getRun, type RunRecord } from "../lib/api";
import { buildRunArtifactInput } from "../lib/artifactDrafts";
import { activeModelCatalog, defaultChatModel } from "../lib/modelCatalog";
import {
  EmptyState,
  FieldLabel,
  MotionCard,
  PrimaryButton,
  SecondaryButton,
  Select,
  StatusBadge,
  TextArea,
} from "./protectedUi";
import { useComparePanel } from "../features/compare/ComparePanelProvider";

const models = activeModelCatalog;

const researchWorkflow = [
  { label: "Scope", detail: "Frame the investigation" },
  { label: "Search", detail: "Gather live evidence" },
  { label: "Synthesize", detail: "Rank patterns and risks" },
  { label: "Export", detail: "Save the cited brief" },
];

const financeWorkflow = [
  { label: "Mandate", detail: "Set the company, case, and decision rule" },
  { label: "Evidence", detail: "Pull filings, peers, and market data" },
  { label: "Model", detail: "Stress assumptions and sensitivities" },
  { label: "Memo", detail: "Return the investment-grade brief" },
];

export default function RunStudioWorkspace({
  studio,
  title,
  eyebrow,
  description,
  promptPlaceholder,
  suggestedStudio,
  promptPresets = [],
}: {
  studio: "research" | "finance";
  title: string;
  eyebrow: string;
  description: string;
  promptPlaceholder: string;
  suggestedStudio?: string;
  promptPresets?: Array<{ label: string; prompt: string }>;
}) {
  const { openComparePanel } = useComparePanel();
  const location = useLocation();
  const navigate = useNavigate();
  const isFinance = studio === "finance";
  const [prompt, setPrompt] = useState(promptPlaceholder);
  const [model, setModel] = useState(defaultChatModel);
  const [contextIds, setContextIds] = useState<string[]>([]);
  const [run, setRun] = useState<RunRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready");
  const runOutputDetails =
    run?.output?.details && typeof run.output.details === "object"
      ? (run.output.details as { message?: unknown; type?: unknown; traceback?: unknown })
      : null;
  const runError =
    run?.status === "failed"
      ? run.error_message ||
        (typeof run.output?.error === "string" ? run.output.error : "") ||
        (typeof runOutputDetails?.message === "string" ? runOutputDetails.message : "") ||
        "Run failed without an error message."
      : null;
  const runTraceback = typeof runOutputDetails?.traceback === "string" ? runOutputDetails.traceback : null;
  const runContent = typeof run?.output?.content === "string" ? run.output.content : "";
  const sourceCount = Array.isArray(run?.output.sources) ? run.output.sources.length : 0;
  const completedStepCount = run?.steps.filter((step) => step.status === "completed").length ?? 0;
  const shellClassName = `page-wrap run-studio-page ${isFinance ? "finance-studio-page" : "research-studio-page"}`;
  const financeSignalCards = [
    { label: "Run state", value: status },
    { label: "Context", value: `${contextIds.length} linked` },
    { label: "Tool steps", value: `${completedStepCount}/${run?.steps.length ?? 0}` },
    { label: "Sources", value: String(sourceCount) },
  ];
  const outputHandoffPrompt = runContent
    ? [
        `Use this ${studio === "finance" ? "Finance Studio" : "Research Studio"} output as source context.`,
        "",
        runContent,
        "",
        "Produce a concrete artifact-ready next step that preserves the evidence, assumptions, risks, and recommendations.",
      ].join("\n")
    : "";

  useEffect(() => {
    if (!run?.id || run.status !== "running") {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(() => {
      getRun(run.id)
        .then((response) => {
          if (cancelled) {
            return;
          }
          setRun(response.run);
          setStatus(response.run.status);
          if (response.run.status !== "running") {
            setLoading(false);
          }
        })
        .catch((err) => {
          if (cancelled) {
            return;
          }
          setStatus(err instanceof Error ? err.message : "Could not refresh run.");
          setLoading(false);
        });
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [run?.id, run?.status]);

  useEffect(() => {
    const state = location.state as { prompt?: string; contextIds?: string[] } | null;
    if (!state) return;
    if (state.prompt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrompt(state.prompt);
    }
    if (state.contextIds?.length) {
      setContextIds(state.contextIds);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const handleRun = async () => {
    if (!prompt.trim()) {
      return;
    }

    setLoading(true);
    setStatus("Running");
    try {
      const response = await createRun({
        studio,
        title,
        prompt,
        model,
        context_ids: contextIds,
      });
      setRun(response.run);
      setStatus(response.run.status);
      setLoading(response.run.status === "running");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Run failed.");
      setLoading(false);
    }
  };

  const actions = (
    <div className="inline-actions studio-action-row">
      <SecondaryButton
        type="button"
        onClick={() =>
          openComparePanel({
            prompt,
            contextIds,
            studio,
            onUseResult: (result) => {
              setPrompt(result.content);
              setStatus("Compare result moved into the prompt editor.");
            },
            useResultLabel: "Use as Prompt",
          })
        }
      >
        Compare Prompt
      </SecondaryButton>
      <PrimaryButton type="button" onClick={handleRun} disabled={loading}>
        {loading ? "Running..." : "Run"}
      </PrimaryButton>
      <ArtifactSaveButton
        buildPayload={() =>
          buildRunArtifactInput({
            studio,
            title: `${title} artifact`,
            prompt,
            run,
            type: "report",
            tags: ["report"],
          })
        }
        disabled={!run?.output}
        saveKey={run?.id}
        onSaved={() => setStatus("Saved as artifact")}
        onError={setStatus}
      />
    </div>
  );

  return (
    <div className={shellClassName}>
      {isFinance ? (
        <section className="finance-hero-panel" aria-labelledby="finance-studio-title">
          <div className="finance-hero-copy">
            <div className="finance-eyebrow-row">
              <span className="page-eyebrow">{eyebrow}</span>
              <span className="finance-live-chip">Live sandbox</span>
            </div>
            <h1 id="finance-studio-title" className="finance-title">
              {title}
            </h1>
            <p className="finance-description">{description}</p>
            <div className="finance-workflow-strip" aria-label="Finance workflow">
              {financeWorkflow.map((item, index) => (
                <div key={item.label} className="finance-workflow-step">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="finance-hero-console" aria-label="Dexter run summary">
            <div className="finance-console-header">
              <span>Analyst desk</span>
              <strong>{loading ? "Analysis running" : "Ready for brief"}</strong>
            </div>
            <div className="finance-signal-grid">
              {financeSignalCards.map((item) => (
                <div key={item.label} className="finance-signal-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="finance-tape" aria-hidden="true">
              <span>VALUE</span>
              <span>MARGIN</span>
              <span>FILINGS</span>
              <span>PEERS</span>
              <span>RISK</span>
            </div>
            {actions}
          </div>
        </section>
      ) : (
        <section className="research-hero-panel" aria-labelledby="research-studio-title">
          <div className="research-hero-copy">
            <div className="page-eyebrow">{eyebrow}</div>
            <h1 id="research-studio-title" className="page-title">
              {title}
            </h1>
            <p className="page-description">{description}</p>
          </div>
          <div className="research-hero-ops">
            <div className="research-command-panel">
              <div className="research-command-head">
                <span>Investigation desk</span>
                <strong>{loading ? "Running" : status}</strong>
              </div>
              <div className="research-signal-board" aria-label="Current research run summary">
                <div>
                  <span>Context</span>
                  <strong>{contextIds.length}</strong>
                </div>
                <div>
                  <span>Steps</span>
                  <strong>
                    {completedStepCount}/{run?.steps.length ?? 0}
                  </strong>
                </div>
                <div>
                  <span>Sources</span>
                  <strong>{sourceCount}</strong>
                </div>
              </div>
              {actions}
            </div>
          </div>
          <div className="research-workflow-strip" aria-label="Research workflow">
            {researchWorkflow.map((item, index) => (
              <div key={item.label} className="research-workflow-step">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="studio-layout">
        <div className="studio-primary-column">
          <MotionCard className={isFinance ? "finance-prompt-card" : "research-prompt-card"}>
            <div className="context-builder-head">
              <div>
                <h3>Prompt</h3>
                <p>{isFinance ? "Dexter runs in a sandbox with finance tools." : "Structured input and clear long-running status."}</p>
              </div>
              <StatusBadge
                status={
                  run?.status === "completed" || run?.status === "failed" || run?.status === "running"
                    ? (run.status as "completed" | "failed" | "running")
                    : "disconnected"
                }
                label={status}
              />
            </div>
            <div className="stack-sm">
              <FieldLabel>Model</FieldLabel>
              <Select value={model} onChange={(event) => setModel(event.target.value)}>
                {models.map((entry) => (
                  <option key={entry.id} value={entry.openRouterId}>
                    {entry.name} ({entry.openRouterId})
                  </option>
                ))}
              </Select>
            </div>
            <div className="stack-sm">
              <FieldLabel>{isFinance ? "Dexter finance prompt" : "Research brief"}</FieldLabel>
              {promptPresets.length ? (
                <div className="prompt-preset-row" aria-label={`${title} prompt presets`}>
                  {promptPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="prompt-preset-button"
                      onClick={() => setPrompt(preset.prompt)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <TextArea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={promptPlaceholder} />
            </div>
          </MotionCard>

          <ContextBuilder selectedIds={contextIds} onChange={setContextIds} suggestedStudio={suggestedStudio} />

          <StepTimeline
            steps={run?.steps ?? []}
            title={isFinance ? "Dexter Tools" : "Tool Runner"}
            description={
              isFinance
                ? "Inspect Dexter's sandbox dispatch, tool calls, and finalization."
                : "Track each stage of the run and inspect the produced output."
            }
          />
        </div>

        <div className="studio-secondary-column">
          <MotionCard className={isFinance ? "finance-output-card" : "research-output-card"}>
            <div className="context-builder-head">
              <div>
                <h3>{isFinance ? "Dexter Answer" : "Structured Output"}</h3>
                <p>{isFinance ? "Final markdown answer returned by Dexter." : "Stable report sections, citations, and save flow."}</p>
              </div>
              {runContent ? (
                <div className="inline-actions">
                  {!isFinance ? (
                    <>
                      <SecondaryButton
                        type="button"
                        onClick={() => navigate("/data", { state: { prompt: outputHandoffPrompt } })}
                      >
                        Data
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() => navigate("/finance", { state: { prompt: outputHandoffPrompt, contextIds } })}
                      >
                        Finance
                      </SecondaryButton>
                    </>
                  ) : null}
                  <SecondaryButton
                    type="button"
                    onClick={() =>
                      navigate("/writing/new", {
                        state: {
                          prompt: `Turn this ${studio} output into an executive-ready artifact.`,
                          contextIds,
                          template: {
                            title: `${title} brief`,
                            content: runContent,
                          },
                        },
                      })
                    }
                  >
                    Writing
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() =>
                      openComparePanel({
                        prompt: outputHandoffPrompt,
                        contextIds,
                        studio,
                        useResultLabel: "Use as Prompt",
                        onUseResult: (result) => {
                          setPrompt(result.content);
                          setStatus("Compare result moved into the prompt editor.");
                        },
                      })
                    }
                  >
                    Compare
                  </SecondaryButton>
                </div>
              ) : null}
            </div>
            {runError ? (
              <div className="error-copy run-error">
                <strong>{isFinance ? "Dexter run failed" : "Run failed"}</strong>
                <pre>{runError}</pre>
                {runTraceback ? <pre>{runTraceback}</pre> : null}
              </div>
            ) : runContent ? (
              <article className="report-output">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{runContent}</ReactMarkdown>
              </article>
            ) : (
              <EmptyState
                title={isFinance ? "No Dexter answer yet" : "No report generated yet"}
                body={
                  isFinance
                    ? "Run a finance prompt to populate Dexter's answer, tool trace, and save action."
                    : "Run a research task to populate the report, citations, and save action."
                }
              />
            )}
          </MotionCard>

          <MotionCard className={isFinance ? "finance-sources-card" : "research-sources-card"}>
            <div className="context-builder-head">
              <div>
                <h3>{isFinance ? "Dexter Sources" : "Sources"}</h3>
                <p>{isFinance ? "URLs and citations Dexter surfaced during the run." : "Search results and synthesis inputs stay visible next to the report."}</p>
              </div>
            </div>
            {Array.isArray(run?.output.sources) && run.output.sources.length ? (
              <div className="stack-sm">
                {run.output.sources.map((source) => {
                  const sourceRecord = source as { title?: string; url?: string; snippet?: string };
                  return (
                    <div key={sourceRecord.url} className="source-card">
                      <strong>{sourceRecord.title ?? "Untitled source"}</strong>
                      <p>{sourceRecord.snippet ?? "No snippet available."}</p>
                      <a href={sourceRecord.url} rel="noreferrer" target="_blank">
                        {sourceRecord.url}
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No sources yet" body="Once a run completes, the supporting source list will appear here." />
            )}
          </MotionCard>
        </div>
      </div>
    </div>
  );
}
