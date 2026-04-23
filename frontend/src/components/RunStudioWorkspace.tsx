import { useEffect, useState } from "react";
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
  PageSection,
  PrimaryButton,
  SecondaryButton,
  Select,
  StatusBadge,
  TextArea,
} from "./protectedUi";
import { useComparePanel } from "../features/compare/ComparePanelProvider";

const models = activeModelCatalog;

export default function RunStudioWorkspace({
  studio,
  title,
  eyebrow,
  description,
  promptPlaceholder,
}: {
  studio: "research" | "finance";
  title: string;
  eyebrow: string;
  description: string;
  promptPlaceholder: string;
}) {
  const { openComparePanel } = useComparePanel();
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

  return (
    <div className="page-wrap">
      <PageSection
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <div className="inline-actions">
            <SecondaryButton
              type="button"
              onClick={() =>
                openComparePanel({
                  prompt,
                  contextIds,
                  studio,
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
        }
      />

      <div className="studio-layout">
        <div className="studio-primary-column">
          <MotionCard>
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
              <TextArea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={promptPlaceholder} />
            </div>
          </MotionCard>

          <ContextBuilder selectedIds={contextIds} onChange={setContextIds} />

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
          <MotionCard>
            <div className="context-builder-head">
              <div>
                <h3>{isFinance ? "Dexter Answer" : "Structured Output"}</h3>
                <p>{isFinance ? "Final markdown answer returned by Dexter." : "Stable report sections, citations, and save flow."}</p>
              </div>
            </div>
            {runError ? (
              <div className="error-copy run-error">
                <strong>{isFinance ? "Dexter run failed" : "Run failed"}</strong>
                <pre>{runError}</pre>
                {runTraceback ? <pre>{runTraceback}</pre> : null}
              </div>
            ) : run?.output.content ? (
              <article className="report-output">{String(run.output.content)}</article>
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

          <MotionCard>
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
