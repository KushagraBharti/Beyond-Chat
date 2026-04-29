import type { CompareResult, CreateArtifactInput, DataAnalysisResult, RunRecord } from "./api";

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
    content: analysisResult.insight,
    content_format: "plain",
    summary: summarize(analysisResult.insight, title),
    content_json: analysisResult as unknown as Record<string, unknown>,
    source_run_id: runId ?? null,
    metadata: { prompt: prompt || title },
    tags: uniqueTags(["data", "insights", "saved-output"]),
  };
}

export function buildWritingArtifactInput({
  title,
  content,
  summary,
  runId,
}: {
  title: string;
  content: string;
  summary: string;
  runId?: string | null;
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
}: {
  prompt: string;
  model: string;
  ratio: string;
  quality: string;
  url: string;
  storagePath?: string;
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
    },
    tags: uniqueTags(["image", "generated"]),
  };
}
