import { useState } from "react";
import ArtifactSaveButton from "./ArtifactSaveButton";
import ContextBuilder from "./ContextBuilder";
import StepTimeline from "./StepTimeline";
import { createRun, type RunRecord } from "../lib/api";
import { buildRunArtifactInput } from "../lib/artifactDrafts";
import {
  EmptyState,
  FieldLabel,
  MotionCard,
  PageSection,
  PrimaryButton,
  Select,
  StatusBadge,
  TextArea,
} from "./protectedUi";

const models = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-2.0-flash-001",
];

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
  const [prompt, setPrompt] = useState(promptPlaceholder);
  const [model, setModel] = useState(models[0]);
  const [contextIds, setContextIds] = useState<string[]>([]);
  const [run, setRun] = useState<RunRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready");

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
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Run failed.");
    } finally {
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
                <p>Structured input and clear long-running status.</p>
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
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </Select>
            </div>
            <div className="stack-sm">
              <FieldLabel>Research brief</FieldLabel>
              <TextArea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={promptPlaceholder} />
            </div>
          </MotionCard>

          <ContextBuilder selectedIds={contextIds} onChange={setContextIds} />

          <StepTimeline steps={run?.steps ?? []} />
        </div>

        <div className="studio-secondary-column">
          <MotionCard>
            <div className="context-builder-head">
              <div>
                <h3>Structured Output</h3>
                <p>Stable report sections, citations, and save flow.</p>
              </div>
            </div>
            {run?.output.content ? (
              <article className="report-output">{String(run.output.content)}</article>
            ) : (
              <EmptyState
                title="No report generated yet"
                body="Run a research or finance task to populate the report, citations, and save action."
              />
            )}
          </MotionCard>

          <MotionCard>
            <div className="context-builder-head">
              <div>
                <h3>Sources</h3>
                <p>Search results and synthesis inputs stay visible next to the report.</p>
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
