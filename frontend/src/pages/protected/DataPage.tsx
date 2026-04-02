import { useMemo, useState } from "react";
import ArtifactSaveButton from "../../components/ArtifactSaveButton";
import StepTimeline from "../../components/StepTimeline";
import { createRun, type RunRecord } from "../../lib/api";
import { buildDataArtifactInput } from "../../lib/artifactDrafts";
import {
  EmptyState,
  FieldLabel,
  MotionCard,
  PageSection,
  PrimaryButton,
  TextArea,
} from "../../components/protectedUi";

function parseCsv(content: string) {
  const rows = content
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(","));
  return rows;
}

export default function DataPage() {
  const [fileName, setFileName] = useState("No file selected");
  const [csvContent, setCsvContent] = useState("");
  const [prompt, setPrompt] = useState("");
  const [run, setRun] = useState<RunRecord | null>(null);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);

  const rows = useMemo(() => parseCsv(csvContent), [csvContent]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    setCsvContent(text);
  };

  const handleRun = async () => {
    setLoading(true);
    try {
      const response = await createRun({
        studio: "data",
        title: "Data analysis",
        prompt: prompt || "Summarize the uploaded data and identify useful transformations.",
        options: {
          data_summary: `${fileName}: ${rows.length} rows x ${rows[0]?.length ?? 0} columns`,
        },
      });
      setRun(response.run);
      setStatus(response.run.status);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Data run failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrap">
      <PageSection
        eyebrow="Data Studio"
        title="Upload, preview, transform, and summarize"
        description="Data Studio uses the same run lifecycle as research and finance, but starts with local-first CSV preview and deterministic starter insights."
        actions={
          <div className="inline-actions">
            <PrimaryButton type="button" onClick={handleRun} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze Data"}
            </PrimaryButton>
            <ArtifactSaveButton
              buildPayload={() =>
                buildDataArtifactInput({
                  fileName,
                  prompt,
                  run,
                })
              }
              disabled={!run?.output}
              label="Save Insight"
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
                <h3>Upload</h3>
                <p>CSV-first scaffold with space for future transformations.</p>
              </div>
            </div>

            <div className="stack-sm">
              <FieldLabel>Data file</FieldLabel>
              <input className="field" type="file" accept=".csv" onChange={handleUpload} />
              <div className="meta-placeholder">{fileName}</div>
            </div>

            <div className="stack-sm">
              <FieldLabel>Analysis prompt</FieldLabel>
              <TextArea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask for transforms, insights, or anomaly checks..."
              />
            </div>
          </MotionCard>

          <MotionCard>
            <div className="context-builder-head">
              <div>
                <h3>Preview table</h3>
                <p>Local preview of uploaded rows before any backend execution.</p>
              </div>
            </div>
            {rows.length ? (
              <div className="table-shell">
                <table>
                  <tbody>
                    {rows.slice(0, 5).map((row, rowIndex) => (
                      <tr key={`${rowIndex}-${row.join("-")}`}>
                        {row.map((cell, cellIndex) => (
                          <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No file uploaded yet" body="Upload a CSV to populate the preview and analysis options." />
            )}
          </MotionCard>

          <StepTimeline steps={run?.steps ?? []} />
        </div>

        <div className="studio-secondary-column">
          <MotionCard>
            <div className="context-builder-head">
              <div>
                <h3>Insights</h3>
                <p>Starter output keeps the page useful before richer transforms are added.</p>
              </div>
            </div>
            {run?.output ? (
              <pre className="timeline-output">{JSON.stringify(run.output, null, 2)}</pre>
            ) : (
              <EmptyState title="No data insights yet" body="Run an analysis to generate transform notes and starter findings." />
            )}
          </MotionCard>

          <MotionCard>
            <div className="context-builder-head">
              <div>
                <h3>Status</h3>
                <p>Every run uses the same shared lifecycle contract.</p>
              </div>
            </div>
            <div className="meta-placeholder">{status}</div>
          </MotionCard>
        </div>
      </div>
    </div>
  );
}
