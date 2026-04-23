import { useMemo, useState } from "react";
import ArtifactSaveButton from "../../components/ArtifactSaveButton";
import StepTimeline from "../../components/StepTimeline";
import { analyzeData, uploadArtifactFile, type DataAnalysisResult } from "../../lib/api";
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
  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(","));
}

// Simple inline SVG bar chart — no library required
function DataChart({ data }: { data: DataAnalysisResult["chart_data"] }) {
  const { labels, datasets } = data;
  const first = datasets[0];
  if (!first || !labels.length) return null;

  const values = first.data.map(Number);
  const max = Math.max(...values, 1);
  const W = 400;
  const H = 200;
  const padL = 44;
  const padB = 36;
  const padT = 12;
  const padR = 16;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const slotW = innerW / labels.length;
  const barW = Math.max(4, slotW * 0.6);
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} aria-label="Bar chart">
      {yTicks.map((frac) => {
        const y = padT + (1 - frac) * innerH;
        const label = Math.round(frac * max);
        return (
          <g key={frac}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e2e2e0" strokeWidth="1" />
            <text x={padL - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#6B6B70">
              {label}
            </text>
          </g>
        );
      })}
      {values.map((v, i) => {
        const bh = Math.max(2, (v / max) * innerH);
        const x = padL + i * slotW + (slotW - barW) / 2;
        const y = padT + innerH - bh;
        const lx = padL + i * slotW + slotW / 2;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill="#4F3FE8" rx="2" opacity="0.85" />
            <text x={lx} y={H - padB + 14} textAnchor="middle" fontSize="9" fill="#6B6B70">
              {String(labels[i]).slice(0, 10)}
            </text>
          </g>
        );
      })}
      <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke="#e2e2e0" strokeWidth="1" />
      <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="#e2e2e0" strokeWidth="1" />
      <text x={padL + innerW / 2} y={H - 2} textAnchor="middle" fontSize="10" fill="#6B6B70">
        {first.label}
      </text>
    </svg>
  );
}

export default function DataPage() {
  const [fileName, setFileName] = useState("No file selected");
  const [csvContent, setCsvContent] = useState("");
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [prompt, setPrompt] = useState("");
  const [analysisResult, setAnalysisResult] = useState<DataAnalysisResult | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);

  const rows = useMemo(() => parseCsv(csvContent), [csvContent]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const text = await file.text();
    setCsvContent(text);
    setStoragePath(null);
    setUploadStatus("uploading");
    setStatus("Uploading…");

    try {
      const upload = await uploadArtifactFile(file);
      setStoragePath(upload.path);
      setUploadStatus("done");
      setStatus("File uploaded — ready to analyze.");
    } catch (err) {
      setUploadStatus("error");
      setStatus(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  const handleRun = async () => {
    if (!storagePath) {
      setStatus("Upload a CSV file first.");
      return;
    }
    setLoading(true);
    setAnalysisResult(null);
    setStatus("Analyzing…");
    try {
      const { result, run_id } = await analyzeData({
        storage_path: storagePath,
        prompt: prompt || "Summarize the uploaded data and identify useful insights.",
      });
      setAnalysisResult(result);
      setRunId(run_id);
      setStatus("Analysis complete.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const uploadIndicator =
    uploadStatus === "uploading" ? "⏳ Uploading…" :
    uploadStatus === "done" ? "✓ Uploaded" :
    uploadStatus === "error" ? "✗ Upload failed" :
    fileName;

  return (
    <div className="page-wrap">
      <PageSection
        eyebrow="Data Studio"
        title="Upload, analyze, and surface insights"
        description="Upload a CSV and ask a question — the model sees your real data, not a summary."
        actions={
          <div className="inline-actions">
            <PrimaryButton type="button" onClick={handleRun} disabled={loading || !storagePath}>
              {loading ? "Analyzing…" : "Analyze Data"}
            </PrimaryButton>
            <ArtifactSaveButton
              buildPayload={() =>
                buildDataArtifactInput({ fileName, prompt, analysisResult, runId })
              }
              disabled={!analysisResult}
              label="Save Insight"
              saveKey={runId ?? undefined}
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
                <p>Select a CSV file — it will be uploaded to secure storage before analysis.</p>
              </div>
            </div>

            <div className="stack-sm">
              <FieldLabel>Data file</FieldLabel>
              <input className="field" type="file" accept=".csv" onChange={handleUpload} />
              <div
                className="meta-placeholder"
                style={{
                  color:
                    uploadStatus === "done" ? "#30A46C" :
                    uploadStatus === "error" ? "#E5484D" :
                    undefined,
                }}
              >
                {uploadIndicator}
              </div>
            </div>

            <div className="stack-sm">
              <FieldLabel>Analysis prompt</FieldLabel>
              <TextArea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What patterns or insights are you looking for?"
              />
            </div>
          </MotionCard>

          <MotionCard>
            <div className="context-builder-head">
              <div>
                <h3>Preview</h3>
                <p>First 5 rows of the uploaded file.</p>
              </div>
            </div>
            {rows.length ? (
              <div className="table-shell">
                <table>
                  <tbody>
                    {rows.slice(0, 5).map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No file uploaded yet" body="Upload a CSV to see a row preview." />
            )}
          </MotionCard>

          <MotionCard>
            <div className="context-builder-head">
              <div>
                <h3>Status</h3>
              </div>
            </div>
            <div className="meta-placeholder">{status}</div>
          </MotionCard>
        </div>

        <div className="studio-secondary-column">
          <MotionCard>
            <div className="context-builder-head">
              <div>
                <h3>Insight</h3>
                <p>Plain English finding from the model.</p>
              </div>
            </div>
            {analysisResult ? (
              <p style={{ fontSize: "0.9rem", lineHeight: 1.65, margin: 0 }}>
                {analysisResult.insight}
              </p>
            ) : (
              <EmptyState title="No insight yet" body="Run an analysis to generate findings." />
            )}
          </MotionCard>

          {analysisResult?.chart_data && (
            <MotionCard>
              <div className="context-builder-head">
                <div>
                  <h3>Chart</h3>
                  <p style={{ textTransform: "capitalize" }}>{analysisResult.chart_type} chart</p>
                </div>
              </div>
              <DataChart data={analysisResult.chart_data} />
            </MotionCard>
          )}

          {analysisResult?.table && (
            <MotionCard>
              <div className="context-builder-head">
                <div>
                  <h3>Table</h3>
                </div>
              </div>
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      {analysisResult.table.headers.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.table.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MotionCard>
          )}

          {/* Step timeline is rendered once we have a run_id */}
          {runId && <StepTimeline steps={[]} />}
        </div>
      </div>
    </div>
  );
}
