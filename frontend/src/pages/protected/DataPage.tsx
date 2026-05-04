import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ArtifactSaveButton from "../../components/ArtifactSaveButton";
import StepTimeline from "../../components/StepTimeline";
import {
  analyzeData,
  getRun,
  previewData,
  uploadArtifactFile,
  type DataAnalysisResult,
  type DataPreviewResult,
  type RunStep,
} from "../../lib/api";
import {
  buildDataArtifactInput,
  buildDataChartArtifactInput,
  buildDataTableArtifactInput,
} from "../../lib/artifactDrafts";
import { useComparePanel } from "../../features/compare/ComparePanelProvider";
import {
  EmptyState,
  FieldLabel,
  MotionCard,
  PageSection,
  PrimaryButton,
  SecondaryButton,
  TextArea,
} from "../../components/protectedUi";

const chartPalette = ["#4F3FE8", "#0E8F68", "#D9730D", "#C83E7C", "#2563EB", "#7C3AED"];

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle - 90) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function piePath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarPoint(cx, cy, radius, endAngle);
  const end = polarPoint(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [`M ${cx} ${cy}`, `L ${start.x} ${start.y}`, `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`, "Z"].join(" ");
}

// Inline SVG chart renderer keeps Data Studio dependency-free while honoring model-selected chart types.
function DataChart({ type, data }: { type: DataAnalysisResult["chart_type"]; data: DataAnalysisResult["chart_data"] }) {
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
  const points = values.map((v, i) => {
    const x = padL + i * slotW + slotW / 2;
    const y = padT + innerH - Math.max(0, (v / max) * innerH);
    return { x, y, value: v, label: labels[i] };
  });

  if (type === "pie") {
    const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
    let cursor = 0;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} aria-label="Pie chart">
        {values.map((value, index) => {
          const size = total > 0 ? (Math.max(0, value) / total) * 360 : 360 / values.length;
          const path = piePath(120, 96, 72, cursor, cursor + size);
          cursor += size;
          return <path key={labels[index]} d={path} fill={chartPalette[index % chartPalette.length]} opacity="0.88" />;
        })}
        {labels.slice(0, 6).map((label, index) => (
          <g key={label} transform={`translate(230 ${34 + index * 22})`}>
            <rect width="10" height="10" rx="2" fill={chartPalette[index % chartPalette.length]} />
            <text x="16" y="9" fontSize="10" fill="#3A3836">
              {String(label).slice(0, 24)}
            </text>
          </g>
        ))}
      </svg>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} aria-label={`${type} chart`}>
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
      {type === "line" ? (
        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="#4F3FE8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {points.map((point, i) => {
        if (type === "scatter" || type === "line") {
          return (
            <g key={i}>
              <circle cx={point.x} cy={point.y} r={type === "scatter" ? 4 : 3} fill={chartPalette[i % chartPalette.length]} opacity="0.9" />
              <text x={point.x} y={H - padB + 14} textAnchor="middle" fontSize="9" fill="#6B6B70">
                {String(point.label).slice(0, 10)}
              </text>
            </g>
          );
        }
        const bh = Math.max(2, (point.value / max) * innerH);
        const x = padL + i * slotW + (slotW - barW) / 2;
        const y = padT + innerH - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill="#4F3FE8" rx="2" opacity="0.85" />
            <text x={point.x} y={H - padB + 14} textAnchor="middle" fontSize="9" fill="#6B6B70">
              {String(point.label).slice(0, 10)}
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
  const navigate = useNavigate();
  const location = useLocation();
  const { openComparePanel } = useComparePanel();
  const [fileName, setFileName] = useState("No file selected");
  const [preview, setPreview] = useState<DataPreviewResult | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [prompt, setPrompt] = useState("");
  const [analysisResult, setAnalysisResult] = useState<DataAnalysisResult | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [runSteps, setRunSteps] = useState<RunStep[]>([]);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);

  const rows = useMemo(() => preview?.rows ?? [], [preview]);
  const dataArtifactPayload = useMemo(
    () => buildDataArtifactInput({ fileName, prompt, analysisResult, runId }),
    [analysisResult, fileName, prompt, runId],
  );
  const dataHandoffPrompt = dataArtifactPayload
    ? [
        "Use this Data Studio analysis as source context.",
        "",
        dataArtifactPayload.content,
        "",
        "Produce a concrete next-step output that preserves the key assumptions, risks, and recommendations.",
      ].join("\n")
    : "";

  useEffect(() => {
    const state = location.state as { prompt?: string } | null;
    if (!state?.prompt) return;
    setPrompt(state.prompt);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const ingestFile = async (file: File | undefined) => {
    if (!file) return;

    setFileName(file.name);
    setPreview(null);
    setStoragePath(null);
    setRunSteps([]);
    setAnalysisResult(null);
    setUploadStatus("uploading");
    setStatus("Uploading...");

    try {
      const upload = await uploadArtifactFile(file);
      setStoragePath(upload.path);
      setStatus("Building preview...");
      const dataPreview = await previewData({ storage_path: upload.path });
      setPreview(dataPreview);
      setUploadStatus("done");
      setStatus("File uploaded and previewed. Ready to analyze.");
    } catch (err) {
      setUploadStatus("error");
      setStatus(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    void ingestFile(event.target.files?.[0]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void ingestFile(event.dataTransfer.files?.[0]);
  };

  const handleRun = async () => {
    if (!storagePath) {
      setStatus("Upload a CSV or Excel file first.");
      return;
    }
    setLoading(true);
    setAnalysisResult(null);
    setRunSteps([]);
    setStatus("Analyzing...");
    try {
      const { result, run_id } = await analyzeData({
        storage_path: storagePath,
        prompt: prompt || "Summarize the uploaded data and identify useful insights.",
      });
      setAnalysisResult(result);
      setRunId(run_id);
      const { run } = await getRun(run_id);
      setRunSteps(run.steps);
      setStatus("Analysis complete.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const uploadIndicator =
    uploadStatus === "uploading" ? "Uploading..." :
    uploadStatus === "done" ? "Uploaded" :
    uploadStatus === "error" ? "Upload failed" :
    fileName;

  return (
    <div className="page-wrap">
      <PageSection
        eyebrow="Data Studio"
        title="Upload, analyze, and surface insights"
        description="Upload a CSV or Excel workbook and ask a question. The model sees the parsed dataset profile, preview rows, and summary statistics."
        actions={
          <div className="inline-actions">
            <PrimaryButton type="button" onClick={handleRun} disabled={loading || !storagePath}>
              {loading ? "Analyzing…" : "Analyze Data"}
            </PrimaryButton>
            <ArtifactSaveButton
              buildPayload={() => dataArtifactPayload}
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
                <p>Select or drop a CSV, XLSX, or XLS file. It is uploaded to secure storage before preview and analysis.</p>
              </div>
            </div>

            <div className="stack-sm">
              <FieldLabel>Data file</FieldLabel>
              <div
                className="meta-placeholder"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                style={{ borderStyle: "dashed" }}
              >
                Drop a CSV or Excel file here, or choose one below.
              </div>
              <input className="field" type="file" accept=".csv,.xlsx,.xls" onChange={handleUpload} />
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
              {preview && (
                <div className="artifact-tag-row">
                  <span>{preview.fileType === "excel" ? "Excel workbook" : "CSV"}</span>
                  <span>{preview.profile.rowCount} rows</span>
                  <span>{preview.profile.columnCount} columns</span>
                </div>
              )}
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
                  <thead>
                    <tr>
                      {preview?.headers.map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
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
              <EmptyState title="No file uploaded yet" body="Upload a CSV or Excel file to see a row preview." />
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
              <div className="stack-sm">
                <p style={{ fontSize: "0.9rem", lineHeight: 1.65, margin: 0 }}>
                  {analysisResult.insight}
                </p>
                {analysisResult.metrics?.length ? (
                  <div className="artifact-tag-row">
                    {analysisResult.metrics.slice(0, 5).map((metric) => (
                      <span key={metric.label}>
                        {metric.label}: {metric.value}
                      </span>
                    ))}
                  </div>
                ) : null}
                {analysisResult.risks?.length ? (
                  <div className="stack-sm">
                    <FieldLabel>Risks and anomalies</FieldLabel>
                    {analysisResult.risks.slice(0, 4).map((risk) => (
                      <div key={risk.risk} className="list-row">
                        <div>
                          <strong>{risk.risk}</strong>
                          <p>{risk.evidence ?? "Dataset-backed caveat"}</p>
                        </div>
                        <span className="status-badge status-disconnected">{risk.severity}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {analysisResult.recommendations?.length ? (
                  <div className="stack-sm">
                    <FieldLabel>Recommendations</FieldLabel>
                    {analysisResult.recommendations.slice(0, 5).map((recommendation) => (
                      <div key={recommendation} className="meta-placeholder">
                        {recommendation}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="inline-actions">
                  <SecondaryButton
                    type="button"
                    onClick={() => navigate("/finance", { state: { prompt: dataHandoffPrompt } })}
                    disabled={!dataHandoffPrompt}
                  >
                    Finance
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() =>
                      navigate("/writing/new", {
                        state: {
                          prompt: "Turn this data analysis into an executive-ready launch note.",
                          template: {
                            title: `Data brief: ${fileName}`,
                            content: dataArtifactPayload?.content ?? analysisResult.insight,
                          },
                        },
                      })
                    }
                    disabled={!dataHandoffPrompt}
                  >
                    Writing
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() =>
                      openComparePanel({
                        prompt: dataHandoffPrompt,
                        studio: "data",
                        useResultLabel: "Use as Prompt",
                        onUseResult: (result) => {
                          setPrompt(result.content);
                          setStatus("Compare result copied into the Data prompt.");
                        },
                      })
                    }
                    disabled={!dataHandoffPrompt}
                  >
                    Compare
                  </SecondaryButton>
                </div>
              </div>
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
                <ArtifactSaveButton
                  buildPayload={() =>
                    buildDataChartArtifactInput({ fileName, prompt, analysisResult, runId })
                  }
                  label="Save Chart"
                  saveKey={runId ? `${runId}:chart` : undefined}
                  onSaved={() => setStatus("Chart saved as artifact")}
                  onError={setStatus}
                />
              </div>
              <DataChart type={analysisResult.chart_type} data={analysisResult.chart_data} />
            </MotionCard>
          )}

          {analysisResult?.table && (
            <MotionCard>
              <div className="context-builder-head">
                <div>
                  <h3>Table</h3>
                </div>
                <ArtifactSaveButton
                  buildPayload={() =>
                    buildDataTableArtifactInput({ fileName, prompt, analysisResult, runId })
                  }
                  label="Save Table"
                  saveKey={runId ? `${runId}:table` : undefined}
                  onSaved={() => setStatus("Table saved as artifact")}
                  onError={setStatus}
                />
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
          {runId && <StepTimeline steps={runSteps} />}
        </div>
      </div>
    </div>
  );
}
