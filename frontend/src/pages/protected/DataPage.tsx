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
  PrimaryButton,
  SecondaryButton,
  TextArea,
} from "../../components/protectedUi";

const chartPalette = ["#0B8F63", "#0F5D54", "#D97706", "#2563EB", "#C2410C", "#7C3AED"];

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
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

function DataIcon({ type }: { type: "upload" | "chart" | "table" | "spark" | "route" | "file" }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (type === "upload") {
    return (
      <svg {...common}>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
    );
  }

  if (type === "chart") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 4-4 3 3 5-7" />
      </svg>
    );
  }

  if (type === "table") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M9 4v16" />
        <path d="M15 4v16" />
      </svg>
    );
  }

  if (type === "route") {
    return (
      <svg {...common}>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="M8.5 6h3.5a4 4 0 0 1 0 8H10a4 4 0 0 0 0 8h8" />
      </svg>
    );
  }

  if (type === "file") {
    return (
      <svg {...common}>
        <path d="M7 3h6l4 4v14H7z" />
        <path d="M13 3v5h5" />
        <path d="M9.5 13h5" />
        <path d="M9.5 17h3.5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m12 3-1.8 5.4a2 2 0 0 1-1.3 1.3L3.5 11.5l5.4 1.8a2 2 0 0 1 1.3 1.3L12 20l1.8-5.4a2 2 0 0 1 1.3-1.3l5.4-1.8-5.4-1.8a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

function StatusPill({ status }: { status: "idle" | "uploading" | "done" | "error" }) {
  const label =
    status === "uploading" ? "Uploading" :
    status === "done" ? "Preview ready" :
    status === "error" ? "Needs attention" :
    "Waiting for file";

  return <span className={`data-status-pill data-status-${status}`}>{label}</span>;
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
    const slices = values.map((value, index) => {
      const start = values
        .slice(0, index)
        .reduce((sum, previous) => sum + (total > 0 ? (Math.max(0, previous) / total) * 360 : 360 / values.length), 0);
      const size = total > 0 ? (Math.max(0, value) / total) * 360 : 360 / values.length;
      return { start, end: start + size };
    });
    return (
      <svg className="data-chart-svg" viewBox={`0 0 ${W} ${H}`} aria-label="Pie chart">
        {values.map((value, index) => {
          const slice = slices[index];
          const path = piePath(120, 96, 72, slice.start, slice.end);
          return <path key={labels[index]} d={path} fill={chartPalette[index % chartPalette.length]} opacity="0.9" />;
        })}
        {labels.slice(0, 6).map((label, index) => (
          <g key={label} transform={`translate(230 ${34 + index * 22})`}>
            <rect width="10" height="10" rx="2" fill={chartPalette[index % chartPalette.length]} />
            <text x="16" y="9" fontSize="10" fill="#1f2925">
              {String(label).slice(0, 24)}
            </text>
          </g>
        ))}
      </svg>
    );
  }

  return (
    <svg className="data-chart-svg" viewBox={`0 0 ${W} ${H}`} aria-label={`${type} chart`}>
      {yTicks.map((frac) => {
        const y = padT + (1 - frac) * innerH;
        const label = Math.round(frac * max);
        return (
          <g key={frac}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="rgba(15, 93, 84, 0.12)" strokeWidth="1" />
            <text x={padL - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#66736f">
              {label}
            </text>
          </g>
        );
      })}
      {type === "line" ? (
        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="#0B8F63"
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
              <text x={point.x} y={H - padB + 14} textAnchor="middle" fontSize="9" fill="#66736f">
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
            <rect x={x} y={y} width={barW} height={bh} fill={chartPalette[i % chartPalette.length]} rx="2" opacity="0.9" />
            <text x={point.x} y={H - padB + 14} textAnchor="middle" fontSize="9" fill="#66736f">
              {String(point.label).slice(0, 10)}
            </text>
          </g>
        );
      })}
      <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke="rgba(15, 93, 84, 0.18)" strokeWidth="1" />
      <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="rgba(15, 93, 84, 0.18)" strokeWidth="1" />
      <text x={padL + innerW / 2} y={H - 2} textAnchor="middle" fontSize="10" fill="#66736f">
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
  const previewRows = preview?.profile.rowCount ?? 0;
  const previewColumns = preview?.profile.columnCount ?? 0;
  const fileTypeLabel = preview ? (preview.fileType === "excel" ? "Excel workbook" : "CSV") : "CSV / XLSX / XLS";
  const hasAnalysis = Boolean(analysisResult);

  return (
    <div className="page-wrap data-studio-page">
      <section className="data-studio-hero" aria-labelledby="data-studio-title">
        <div className="data-hero-copy">
          <div className="data-eyebrow">
            <DataIcon type="spark" />
            Data Studio
          </div>
          <h1 id="data-studio-title">Structured data, sharper decisions.</h1>
          <p>
            Upload a workbook, inspect the parse, then produce grounded metrics, risks, and next actions
            without leaving the studio.
          </p>
          <div className="data-hero-actions">
            <PrimaryButton type="button" onClick={handleRun} disabled={loading || !storagePath}>
              {loading ? "Analyzing..." : "Analyze Data"}
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
        </div>

        <div className="data-hero-board" aria-label="Data Studio run summary">
          <div className="data-board-topline">
            <div>
              <span>Current file</span>
              <strong>{fileName}</strong>
            </div>
            <StatusPill status={uploadStatus} />
          </div>
          <div className="data-stat-grid">
            <div>
              <span>Format</span>
              <strong>{fileTypeLabel}</strong>
            </div>
            <div>
              <span>Rows</span>
              <strong>{previewRows ? previewRows.toLocaleString() : "-"}</strong>
            </div>
            <div>
              <span>Columns</span>
              <strong>{previewColumns || "-"}</strong>
            </div>
          </div>
          <div className="data-pipeline">
            {["Upload", "Preview", "Analyze", "Save"].map((step, index) => {
              const active =
                (index === 0 && uploadStatus !== "idle") ||
                (index === 1 && Boolean(preview)) ||
                (index === 2 && (loading || hasAnalysis)) ||
                (index === 3 && hasAnalysis);
              return (
                <div key={step} className={`data-pipeline-step ${active ? "is-active" : ""}`}>
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                </div>
              );
            })}
          </div>
          <div className="data-board-ledger" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <div className="data-workbench-grid">
        <aside className="data-input-rail">
          <MotionCard className="data-card data-upload-card" accent="#30A46C">
            <div className="data-card-header">
              <div className="data-card-icon">
                <DataIcon type="upload" />
              </div>
              <div>
                <h2>Ingest</h2>
                <p>Drop a structured file and build a preview before analysis.</p>
              </div>
            </div>

            <div
              className={`data-dropzone data-dropzone-${uploadStatus}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="data-dropzone-icon">
                <DataIcon type="file" />
              </div>
              <strong>{uploadStatus === "done" ? fileName : "Drop CSV or Excel here"}</strong>
              <span>{uploadStatus === "done" ? uploadIndicator : "CSV, XLSX, and XLS files are supported."}</span>
              <label className="data-file-button" htmlFor="data-file-upload">
                Choose file
              </label>
              <input id="data-file-upload" type="file" accept=".csv,.xlsx,.xls" onChange={handleUpload} />
            </div>

            {preview ? (
              <div className="data-file-summary">
                <span>{preview.fileType === "excel" ? "Excel workbook" : "CSV"}</span>
                <span>{preview.profile.rowCount.toLocaleString()} rows</span>
                <span>{preview.profile.columnCount} columns</span>
              </div>
            ) : null}
          </MotionCard>

          <MotionCard className="data-card data-prompt-card">
            <div className="data-card-header">
              <div className="data-card-icon">
                <DataIcon type="route" />
              </div>
              <div>
                <h2>Question</h2>
                <p>Tell the model what kind of decision this dataset should support.</p>
              </div>
            </div>
            <FieldLabel>Analysis prompt</FieldLabel>
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Find the strongest trends, outliers, and recommended actions in this dataset."
            />
            <div className="data-status-note">
              <span>Status</span>
              <p>{status}</p>
            </div>
          </MotionCard>
        </aside>

        <main className="data-output-stack">
          <MotionCard className="data-card data-preview-card">
            <div className="data-card-header data-card-header-row">
              <div className="data-card-heading">
                <div className="data-card-icon">
                  <DataIcon type="table" />
                </div>
                <div>
                  <h2>Preview</h2>
                  <p>First 5 rows from the uploaded file.</p>
                </div>
              </div>
              <StatusPill status={uploadStatus} />
            </div>
            {rows.length ? (
              <div className="table-shell data-table-shell">
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

          <MotionCard className="data-card data-insight-card" accent="#0F5D54">
            <div className="data-card-header data-card-header-row">
              <div className="data-card-heading">
                <div className="data-card-icon">
                  <DataIcon type="spark" />
                </div>
                <div>
                  <h2>Insight brief</h2>
                  <p>Findings, metrics, risks, and handoffs from the model run.</p>
                </div>
              </div>
              <ArtifactSaveButton
                buildPayload={() => dataArtifactPayload}
                disabled={!analysisResult}
                label="Save Insight"
                saveKey={runId ?? undefined}
                onSaved={() => setStatus("Saved as artifact")}
                onError={setStatus}
              />
            </div>

            {analysisResult ? (
              <div className="data-insight-layout">
                <section className="data-insight-copy">
                  <p>{analysisResult.insight}</p>
                  {analysisResult.metrics?.length ? (
                    <div className="data-metric-strip">
                      {analysisResult.metrics.slice(0, 5).map((metric) => (
                        <div key={metric.label}>
                          <span>{metric.label}</span>
                          <strong>{metric.value}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className="data-action-panel">
                  <span>Send insight to</span>
                  <div className="data-action-grid">
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
                </section>

                {analysisResult.risks?.length ? (
                  <section className="data-result-section">
                    <FieldLabel>Risks and anomalies</FieldLabel>
                    <div className="data-risk-grid">
                      {analysisResult.risks.slice(0, 4).map((risk) => (
                        <div key={risk.risk} className="data-risk-item">
                          <div>
                            <strong>{risk.risk}</strong>
                            <p>{risk.evidence ?? "Dataset-backed caveat"}</p>
                          </div>
                          <span>{risk.severity}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {analysisResult.recommendations?.length ? (
                  <section className="data-result-section">
                    <FieldLabel>Recommendations</FieldLabel>
                    <div className="data-recommendation-list">
                      {analysisResult.recommendations.slice(0, 5).map((recommendation) => (
                        <div key={recommendation}>{recommendation}</div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <EmptyState title="No insight yet" body="Run an analysis to generate findings." />
            )}
          </MotionCard>

          {(analysisResult?.chart_data || analysisResult?.table || runId) && (
            <div className="data-artifact-grid">
              {analysisResult?.chart_data && (
                <MotionCard className="data-card data-chart-card">
                  <div className="data-card-header data-card-header-row">
                    <div className="data-card-heading">
                      <div className="data-card-icon">
                        <DataIcon type="chart" />
                      </div>
                      <div>
                        <h2>Chart</h2>
                        <p className="capitalize">{analysisResult.chart_type} chart</p>
                      </div>
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
                <MotionCard className="data-card data-table-card">
                  <div className="data-card-header data-card-header-row">
                    <div className="data-card-heading">
                      <div className="data-card-icon">
                        <DataIcon type="table" />
                      </div>
                      <div>
                        <h2>Result table</h2>
                        <p>Model-selected rows for the analysis.</p>
                      </div>
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
                  <div className="table-shell data-table-shell">
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

              {runId && <StepTimeline steps={runSteps} />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
