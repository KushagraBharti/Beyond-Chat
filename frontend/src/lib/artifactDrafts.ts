import type { ChatMessage, CompareResult, CreateArtifactInput, DataAnalysisResult, RunRecord } from "./api";

function uniqueTags(tags: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      tags
        .map((tag) => tag?.trim().toLowerCase())
        .filter((tag): tag is string => Boolean(tag)),
    ),
  ];
}

function summarize(text: string, fallback: string) {
  const source = text.trim() || fallback.trim();
  return source.slice(0, 180);
}

function stringifyOutput(output: Record<string, unknown>) {
  return JSON.stringify(output, null, 2);
}

function textOutput(output: Record<string, unknown>) {
  return typeof output.content === "string" ? output.content.trim() : "";
}

function dataAnalysisToMarkdown(result: DataAnalysisResult) {
  const chart = result.chart_data;
  const firstDataset = chart.datasets[0];
  const chartRows = firstDataset
    ? chart.labels.map((label, index) => `| ${label} | ${firstDataset.data[index] ?? ""} |`).join("\n")
    : "";
  const resultRows = result.table.rows
    .map((row) => `| ${row.map((cell) => String(cell).replace(/\|/g, "\\|")).join(" | ")} |`)
    .join("\n");

  return [
    "## Insight",
    result.insight,
    "",
    "## Metrics",
    result.metrics?.length
      ? [
          "| Metric | Value | Note |",
          "| --- | --- | --- |",
          ...result.metrics.map((metric) => (
            `| ${String(metric.label).replace(/\|/g, "\\|")} | ${String(metric.value).replace(/\|/g, "\\|")} | ${String(metric.note ?? "").replace(/\|/g, "\\|")} |`
          )),
        ].join("\n")
      : "No decision metrics returned.",
    "",
    "## Risks",
    result.risks?.length
      ? [
          "| Risk | Severity | Evidence |",
          "| --- | --- | --- |",
          ...result.risks.map((risk) => (
            `| ${String(risk.risk).replace(/\|/g, "\\|")} | ${String(risk.severity).replace(/\|/g, "\\|")} | ${String(risk.evidence ?? "").replace(/\|/g, "\\|")} |`
          )),
        ].join("\n")
      : "No risks returned.",
    "",
    "## Recommendations",
    result.recommendations?.length
      ? result.recommendations.map((recommendation) => `- ${recommendation}`).join("\n")
      : "No recommendations returned.",
    "",
    "## Chart",
    `Type: ${result.chart_type}`,
    firstDataset
      ? [
          "",
          `Series: ${firstDataset.label}`,
          "",
          "| Label | Value |",
          "| --- | ---: |",
          chartRows,
        ].join("\n")
      : "No chart data returned.",
    "",
    "## Table",
    result.table.headers.length
      ? [
          `| ${result.table.headers.map((header) => String(header).replace(/\|/g, "\\|")).join(" | ")} |`,
          `| ${result.table.headers.map(() => "---").join(" | ")} |`,
          resultRows,
        ].join("\n")
      : "No table returned.",
  ].join("\n");
}

export function buildRunArtifactInput({
  studio,
  title,
  prompt,
  run,
  type = "report",
  tags = [],
}: {
  studio: string;
  title: string;
  prompt: string;
  run: RunRecord | null;
  type?: string;
  tags?: string[];
}): CreateArtifactInput | null {
  if (!run?.output) {
    return null;
  }

  const content = textOutput(run.output) || stringifyOutput(run.output);
  const contentFormat = textOutput(run.output) ? "markdown" : "json";

  return {
    title,
    type,
    studio,
    content,
    summary: summarize(prompt, title),
    content_format: contentFormat,
    metadata: {
      runId: run.id,
      model: run.model,
      status: run.status,
      prompt,
      options: run.options,
      output: run.output,
    },
    tags: uniqueTags([studio, type, "saved-output", ...tags]),
  };
}

export function buildDataArtifactInput({
  fileName,
  prompt,
  analysisResult,
  runId,
}: {
  fileName: string;
  prompt: string;
  analysisResult: DataAnalysisResult | null;
  runId?: string | null;
}): CreateArtifactInput | null {
  if (!analysisResult) return null;

  const title = `Data insight: ${fileName || "uploaded dataset"}`;
  return {
    title,
    type: "report",
    studio: "data",
    content: dataAnalysisToMarkdown(analysisResult),
    content_format: "markdown",
    summary: summarize(analysisResult.insight, title),
    content_json: analysisResult as unknown as Record<string, unknown>,
    source_run_id: runId ?? null,
    metadata: { prompt: prompt || title, fileName },
    tags: uniqueTags(["data", "insights", "chart", "table", "saved-output"]),
  };
}

export function buildChatMessageArtifactInput({
  threadTitle,
  message,
}: {
  threadTitle: string;
  message: ChatMessage;
}): CreateArtifactInput | null {
  if (message.role !== "assistant" || !message.content.trim()) {
    return null;
  }

  const titleSource = message.content.replace(/\s+/g, " ").trim();
  const title = `Chat output: ${titleSource.slice(0, 56) || threadTitle || "assistant response"}`;

  return {
    title,
    type: "chat_response",
    studio: "chat",
    content: message.content,
    content_format: "markdown",
    summary: summarize(message.content, threadTitle || title),
    metadata: {
      threadTitle,
      messageId: message.id,
      contextIds: Array.isArray(message.metadata?.contextIds) ? message.metadata.contextIds : [],
    },
    tags: uniqueTags(["chat", "assistant-output", "saved-output"]),
  };
}

export function buildDataChartArtifactInput({
  fileName,
  prompt,
  analysisResult,
  runId,
}: {
  fileName: string;
  prompt: string;
  analysisResult: DataAnalysisResult | null;
  runId?: string | null;
}): CreateArtifactInput | null {
  if (!analysisResult?.chart_data) return null;

  const chart = analysisResult.chart_data;
  const firstDataset = chart.datasets[0];
  const rows = firstDataset
    ? chart.labels.map((label, index) => `| ${label} | ${firstDataset.data[index] ?? ""} |`).join("\n")
    : "";
  const title = `Data chart: ${fileName || "uploaded dataset"}`;

  return {
    title,
    type: "chart",
    studio: "data",
    content: [
      `# ${title}`,
      "",
      `Type: ${analysisResult.chart_type}`,
      firstDataset ? `Series: ${firstDataset.label}` : "No series returned.",
      "",
      "| Label | Value |",
      "| --- | ---: |",
      rows,
    ].join("\n"),
    content_format: "markdown",
    summary: summarize(prompt, title),
    content_json: {
      chartType: analysisResult.chart_type,
      chartData: analysisResult.chart_data,
    },
    source_run_id: runId ?? null,
    metadata: { prompt: prompt || title, fileName },
    tags: uniqueTags(["data", "chart", analysisResult.chart_type, "saved-output"]),
  };
}

export function buildDataTableArtifactInput({
  fileName,
  prompt,
  analysisResult,
  runId,
}: {
  fileName: string;
  prompt: string;
  analysisResult: DataAnalysisResult | null;
  runId?: string | null;
}): CreateArtifactInput | null {
  if (!analysisResult?.table?.headers.length) return null;

  const table = analysisResult.table;
  const rows = table.rows
    .map((row) => `| ${row.map((cell) => String(cell).replace(/\|/g, "\\|")).join(" | ")} |`)
    .join("\n");
  const title = `Data table: ${fileName || "uploaded dataset"}`;

  return {
    title,
    type: "table",
    studio: "data",
    content: [
      `# ${title}`,
      "",
      `| ${table.headers.map((header) => String(header).replace(/\|/g, "\\|")).join(" | ")} |`,
      `| ${table.headers.map(() => "---").join(" | ")} |`,
      rows,
    ].join("\n"),
    content_format: "markdown",
    summary: summarize(prompt, title),
    content_json: table as unknown as Record<string, unknown>,
    source_run_id: runId ?? null,
    metadata: { prompt: prompt || title, fileName },
    tags: uniqueTags(["data", "table", "saved-output"]),
  };
}

export function buildWritingArtifactInput({
  title,
  content,
  summary,
  runId,
  contextIds = [],
}: {
  title: string;
  content: string;
  summary: string;
  runId?: string | null;
  contextIds?: string[];
}): CreateArtifactInput | null {
  if (!content.trim()) {
    return null;
  }

  return {
    title: title.trim() || "Untitled Document",
    type: "document",
    studio: "writing",
    content,
    content_format: "markdown",
    summary: summarize(summary, content),
    metadata: {
      runId: runId ?? null,
      contextIds,
    },
    tags: uniqueTags(["writing", "document", "saved-output"]),
  };
}

export function buildCompareArtifactInput({
  prompt,
  result,
  contextIds,
}: {
  prompt: string;
  result: CompareResult;
  contextIds: string[];
}): CreateArtifactInput | null {
  if (!result.content.trim()) {
    return null;
  }

  return {
    title: `Compare result: ${result.model}`,
    type: "compare_result",
    studio: "chat",
    content: result.content,
    content_format: "plain",
    summary: summarize(prompt, result.model),
    metadata: {
      comparePrompt: prompt,
      model: result.model,
      latencyMs: result.latencyMs,
      status: result.status,
      finishReason: result.finishReason ?? null,
      toolCalls: result.toolCalls ?? [],
      contextIds,
    },
    tags: uniqueTags(["chat", "compare", result.model]),
  };
}

export function buildImageArtifactInput({
  prompt,
  model,
  ratio,
  quality,
  url,
  storagePath,
  contextIds = [],
}: {
  prompt: string;
  model: string;
  ratio: string;
  quality: string;
  url: string;
  storagePath?: string;
  contextIds?: string[];
}): CreateArtifactInput | null {
  if (!url.trim()) {
    return null;
  }

  return {
    title: prompt.trim().slice(0, 60) || "Generated image",
    type: "image",
    studio: "image",
    content: prompt.trim(),
    summary: `Generated with ${model}`,
    content_format: "plain",
    preview_image: url,
    metadata: {
      model,
      ratio,
      quality,
      storage_path: storagePath ?? "",
      contextIds,
    },
    tags: uniqueTags(["image", "generated"]),
  };
}
