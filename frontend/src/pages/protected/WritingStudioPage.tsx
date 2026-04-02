import { useMemo, useState } from "react";
import ArtifactSaveButton from "../../components/ArtifactSaveButton";
import StepTimeline from "../../components/StepTimeline";
import { createRun, type RunRecord } from "../../lib/api";
import { buildWritingArtifactInput } from "../../lib/artifactDrafts";

const heading = "'Bricolage Grotesque', sans-serif";
const body = "'Plus Jakarta Sans', sans-serif";

const c = {
  canvas: "#F2F2F0",
  surface: "#FFFFFF",
  ink: "#0D0D0D",
  muted: "#6B6B70",
  border: "#E2E2E0",
  success: "#117A37",
  danger: "#B42318",
};

const DEFAULT_TEXT = [
  "# Research Draft",
  "",
  "This is a plain-text MVP editor.",
  "",
  "Use @assistant inline or in the panel to edit this document.",
].join("\n");

function extractLatestAssistantInstruction(text: string): string {
  const marker = "@assistant";
  const index = text.toLowerCase().lastIndexOf(marker);
  if (index < 0) return "";
  const afterMarker = text.slice(index + marker.length).trim();
  return afterMarker.split("\n")[0].trim();
}

export default function WritingStudioPage() {
  const [docText, setDocText] = useState(DEFAULT_TEXT);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [run, setRun] = useState<RunRecord | null>(null);

  const words = useMemo(() => {
    const trimmed = docText.trim();
    return trimmed.length > 0 ? trimmed.split(/\s+/).length : 0;
  }, [docText]);

  const runAssistant = async (instructionOverride?: string) => {
    setError("");
    setStatus("");
    setLoading(true);
    setRun(null);

    try {
      const instruction =
        instructionOverride?.trim() ||
        assistantPrompt.trim() ||
        extractLatestAssistantInstruction(docText);

      if (!instruction) {
        throw new Error("No assistant instruction found. Add @assistant ... or type a prompt.");
      }

      const fullPrompt = `Document:\n\n${docText}\n\nInstruction:\n${instruction}`;

      const response = await createRun({
        studio: "writing",
        title: `Writing: ${instruction.slice(0, 60)}`,
        prompt: fullPrompt,
        model,
      });

      setRun(response.run);

      const content = response.run.output?.content;
      if (typeof content === "string" && content.trim()) {
        setDocText(content.trim());
        setStatus("Assistant update applied.");
      } else if (response.run.status === "failed") {
        setError(response.run.error_message ?? "Run failed.");
      } else {
        setStatus(response.run.status);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected assistant error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "1.4rem 2rem 2rem", fontFamily: body }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2
          style={{
            fontFamily: heading,
            fontSize: "1.2rem",
            margin: 0,
            letterSpacing: "-0.02em",
            color: c.ink,
          }}
        >
          Writing Studio
        </h2>
        <p style={{ margin: "0.35rem 0 0", color: c.muted, fontSize: "0.85rem" }}>
          Plain text/markdown editor + `@assistant` command flow.
        </p>
      </div>

      <div
        className="editor-layout"
        style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "0.9rem", alignItems: "start" }}
      >
        {/* Editor */}
        <section
          style={{
            border: `1px solid ${c.border}`,
            borderRadius: 14,
            background: c.surface,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.6rem 0.8rem",
              borderBottom: `1px solid ${c.border}`,
              background: c.canvas,
              color: c.muted,
              fontSize: "0.8rem",
            }}
          >
            <span>Markdown / Plain Text</span>
            <span>{words} words</span>
          </div>

          <textarea
            value={docText}
            onChange={(event) => setDocText(event.target.value)}
            style={{
              width: "100%",
              minHeight: "62vh",
              border: "none",
              outline: "none",
              resize: "vertical",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
              fontSize: "0.92rem",
              lineHeight: 1.6,
              color: c.ink,
              background: c.surface,
              padding: "1rem 1.1rem",
            }}
          />
        </section>

        {/* Controls + Step Timeline */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <div
            style={{
              border: `1px solid ${c.border}`,
              borderRadius: 14,
              background: c.surface,
              padding: "0.8rem",
            }}
          >
            <h3
              style={{ margin: 0, fontFamily: heading, fontSize: "1rem", letterSpacing: "-0.01em" }}
            >
              Assistant Controls
            </h3>
            <p style={{ margin: "0.45rem 0 0.6rem", fontSize: "0.8rem", color: c.muted }}>
              Type `@assistant` in the document, or give instruction here.
            </p>

            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600 }}>
              Model
              <select
                value={model}
                onChange={(event) => setModel(event.target.value)}
                style={{
                  marginTop: "0.35rem",
                  width: "100%",
                  border: `1px solid ${c.border}`,
                  borderRadius: 8,
                  padding: "0.45rem 0.55rem",
                  background: c.canvas,
                }}
              >
                <option value="openai/gpt-4o-mini">openai/gpt-4o-mini</option>
                <option value="anthropic/claude-3.5-sonnet">anthropic/claude-3.5-sonnet</option>
                <option value="google/gemini-2.0-flash-001">google/gemini-2.0-flash-001</option>
              </select>
            </label>

            <label
              style={{ display: "block", marginTop: "0.65rem", fontSize: "0.75rem", fontWeight: 600 }}
            >
              Instruction
              <textarea
                value={assistantPrompt}
                onChange={(event) => setAssistantPrompt(event.target.value)}
                rows={6}
                placeholder="Make the intro more concise and formal."
                style={{
                  marginTop: "0.35rem",
                  width: "100%",
                  border: `1px solid ${c.border}`,
                  borderRadius: 8,
                  padding: "0.5rem 0.55rem",
                  background: c.canvas,
                  resize: "vertical",
                }}
              />
            </label>

            <div style={{ display: "grid", gap: "0.45rem", marginTop: "0.7rem" }}>
              <button
                type="button"
                onClick={() => void runAssistant()}
                disabled={loading}
                style={{
                  border: "none",
                  borderRadius: 8,
                  background: c.ink,
                  color: "#fff",
                  padding: "0.55rem 0.65rem",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.65 : 1,
                }}
              >
                {loading ? "Running..." : "Run Assistant"}
              </button>
              <button
                type="button"
                onClick={() =>
                  void runAssistant(extractLatestAssistantInstruction(docText))
                }
                disabled={loading}
                style={{
                  border: `1px solid ${c.border}`,
                  borderRadius: 8,
                  background: c.canvas,
                  color: c.ink,
                  padding: "0.5rem 0.65rem",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                Run Latest @assistant
              </button>
              <ArtifactSaveButton
                buildPayload={() =>
                  buildWritingArtifactInput({
                    title: `Writing Document – ${new Date().toLocaleDateString()}`,
                    content: docText,
                    summary:
                      assistantPrompt.trim() ||
                      extractLatestAssistantInstruction(docText) ||
                      "Writing Studio document",
                    runId: run?.id ?? null,
                  })
                }
                disabled={loading || !docText.trim()}
                saveKey={`${run?.id ?? "manual"}:${docText}`}
                onSaved={() => setStatus("Saved as artifact.")}
                onError={setError}
              />
            </div>

            {!!status && (
              <p style={{ margin: "0.65rem 0 0", color: c.success, fontSize: "0.8rem" }}>
                {status}
              </p>
            )}
            {!!error && (
              <p style={{ margin: "0.65rem 0 0", color: c.danger, fontSize: "0.8rem" }}>
                {error}
              </p>
            )}
          </div>

          {run && (
            <div
              style={{
                border: `1px solid ${c.border}`,
                borderRadius: 14,
                background: c.surface,
                padding: "0.8rem",
              }}
            >
              <h3
                style={{
                  margin: "0 0 0.5rem",
                  fontFamily: heading,
                  fontSize: "0.95rem",
                  letterSpacing: "-0.01em",
                }}
              >
                Run Steps
              </h3>
              <StepTimeline steps={run.steps ?? []} />
            </div>
          )}
        </aside>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .editor-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
