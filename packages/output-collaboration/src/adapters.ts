import type { OutputKind, OutputRender, OutputVersion, RenderAdapterPort, ValidationAdapterPort, OutputValidation } from "./contracts.ts";

const SUPPORTED: Readonly<Record<OutputKind, "supported" | "preview_only">> = { document: "supported", spreadsheet: "supported", presentation: "preview_only", data_chart: "supported", image: "supported" };
export class DeterministicRenderAdapter implements RenderAdapterPort {
  capability(kind: OutputKind) { return SUPPORTED[kind]; }
  async render(version: OutputVersion, now: string): Promise<OutputRender> {
    const capability = this.capability(version.payload.kind);
    return { id: `render_${version.id}`, version_id: version.id, capability, media_type: capability === "supported" ? "application/vnd.beyond.preview+json" : null, storage_key: capability === "supported" ? `renders/${version.output_id}/${version.id}.json` : null, message: capability === "supported" ? "Deterministic preview available." : "Presentation editing is preview-only until the production renderer is connected.", created_at: now };
  }
}
export class StructuralValidationAdapter implements ValidationAdapterPort {
  async validate(version: OutputVersion, now: string): Promise<OutputValidation> {
    const checks: Array<OutputValidation["checks"][number]> = [];
    const payload = version.payload;
    if (payload.kind === "document") checks.push({ code: "document.blocks", status: payload.blocks.length ? "passed" : "failed", message: payload.blocks.length ? "Document has content." : "Document is empty." });
    if (payload.kind === "spreadsheet") checks.push({ code: "spreadsheet.sheets", status: payload.sheets.length ? "passed" : "failed", message: payload.sheets.length ? "Workbook has at least one sheet." : "Workbook has no sheets." });
    if (payload.kind === "presentation") checks.push({ code: "presentation.slides", status: payload.slides.length ? "warning" : "failed", message: payload.slides.length ? "Slides are structurally valid; overflow rendering is not connected." : "Presentation has no slides." });
    if (payload.kind === "data_chart") { const valid = payload.rows.every((row) => payload.columns.every((column) => column.name in row)); checks.push({ code: "dataset.schema", status: valid ? "passed" : "failed", message: valid ? "Rows conform to declared columns." : "Rows do not conform to declared columns." }); }
    if (payload.kind === "image") { const valid = payload.asset.width > 0 && payload.asset.height > 0 && Boolean(payload.asset.alt_text.trim()); checks.push({ code: "image.metadata", status: valid ? "passed" : "failed", message: valid ? "Dimensions and alt text are present." : "Image dimensions or alt text are missing." }); }
    const status = checks.some((check) => check.status === "failed") ? "failed" : checks.some((check) => check.status === "warning") ? "warning" : "passed";
    return { id: `validation_${version.id}`, version_id: version.id, status, checks, created_at: now };
  }
}
