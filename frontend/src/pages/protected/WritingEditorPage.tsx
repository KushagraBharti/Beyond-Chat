import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ArtifactSaveButton from "../../components/ArtifactSaveButton";
import ContextBuilder from "../../components/ContextBuilder";
import { createRun, getArtifact } from "../../lib/api";
import { buildWritingArtifactInput } from "../../lib/artifactDrafts";
import { markdownToHtml } from "../../lib/editor";
import { activeModelCatalog, defaultChatModel } from "../../lib/modelCatalog";
import { useComparePanel } from "../../features/compare/ComparePanelProvider";
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
  TextInput,
} from "../../components/protectedUi";

const modelOptions = activeModelCatalog;

const colorOptions = ["#0D0D0D", "#4F3FE8", "#E55613", "#0E7AE6", "#30A46C"];
const TARGET_CONTEXT_CHARS = 1200;

interface AssistantSelection {
  from: number;
  to: number;
  text: string;
  before: string;
  after: string;
}

export default function WritingEditorPage() {
  const { documentId = "new" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { openComparePanel } = useComparePanel();
  const [title, setTitle] = useState("Untitled Document");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantScope, setAssistantScope] = useState<"selection" | "document" | "insert">("selection");
  const [assistantModel, setAssistantModel] = useState(defaultChatModel);
  const [assistantDraft, setAssistantDraft] = useState("");
  const [assistantRunId, setAssistantRunId] = useState<string | null>(null);
  const [assistantSelection, setAssistantSelection] = useState<AssistantSelection | null>(null);
  const [contextIds, setContextIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [loading, setLoading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "<p>Start writing here.</p>",
    editorProps: {
      attributes: {
        class: "writing-editor-surface",
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const state = location.state as {
      template?: { title?: string; content?: string };
      prompt?: string;
      contextIds?: string[];
    } | null;
    if (!state) {
      return;
    }

    const template = state.template;
    if (documentId === "new" && template) {
      setTitle(template.title?.trim() || "Untitled Document");
      editor.commands.setContent(markdownToHtml(template.content?.trim() || ""));
    }
    if (state.prompt) {
      setAssistantPrompt(state.prompt);
    }
    if (state.contextIds?.length) {
      setContextIds(state.contextIds);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [documentId, editor, location.pathname, location.state, navigate]);

  useEffect(() => {
    let active = true;
    if (documentId === "new") {
      return;
    }

    void (async () => {
      try {
        const response = await getArtifact(documentId);
        if (!active) {
          return;
        }
        setTitle(response.artifact.title);
        if (editor) {
          editor.commands.setContent(
            response.artifact.contentJson && typeof response.artifact.contentJson === "object"
              ? response.artifact.contentJson
              : markdownToHtml(response.artifact.content),
          );
        }
      } catch {
        setStatusMessage("Could not load document. You can still create a new draft.");
      }
    })();

    return () => {
      active = false;
    };
  }, [documentId, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateAssistantSelection = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setAssistantSelection(null);
        return;
      }

      const text = editor.state.doc.textBetween(from, to, "\n").trim();
      if (!text) {
        setAssistantSelection(null);
        return;
      }

      setAssistantSelection({
        from,
        to,
        text,
        before: editor.state.doc.textBetween(Math.max(0, from - TARGET_CONTEXT_CHARS), from, "\n"),
        after: editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + TARGET_CONTEXT_CHARS), "\n"),
      });
    };

    updateAssistantSelection();
    editor.on("selectionUpdate", updateAssistantSelection);
    editor.on("transaction", updateAssistantSelection);
    return () => {
      editor.off("selectionUpdate", updateAssistantSelection);
      editor.off("transaction", updateAssistantSelection);
    };
  }, [editor]);

  const handleAssistantRun = async () => {
    if (!editor || !assistantPrompt.trim()) {
      return;
    }
    if (assistantScope === "selection" && !assistantSelection) {
      setStatusMessage("Select a document range before running a targeted edit.");
      return;
    }
    setLoading(true);
    try {
      const sourceText =
        assistantScope === "selection" && assistantSelection
          ? assistantSelection.text
          : editor.getText();
      const options =
        assistantScope === "selection" && assistantSelection
          ? {
              mode: "targeted_edit",
              selected_text: assistantSelection.text,
              before_context: assistantSelection.before,
              after_context: assistantSelection.after,
              selection_from: assistantSelection.from,
              selection_to: assistantSelection.to,
            }
          : {};
      const response = await createRun({
        studio: "writing",
        title: `${title} assistant draft`,
        prompt:
          assistantScope === "selection" && assistantSelection
            ? assistantPrompt
            : `Instruction: ${assistantPrompt}\n\nScope: ${assistantScope}\n\nDocument content:\n${sourceText}`,
        model: assistantModel,
        context_ids: contextIds,
        options,
      });
      const content = String(response.run.output.content ?? "");
      setAssistantRunId(response.run.id);
      setAssistantDraft(content);
      setStatusMessage("Assistant suggestion generated. Review it before applying.");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Assistant run failed.");
    } finally {
      setLoading(false);
    }
  };

  const applyAssistantDraft = () => {
    if (!editor || !assistantDraft) {
      return;
    }

    const html = markdownToHtml(assistantDraft);
    if (assistantScope === "document") {
      editor.commands.setContent(html);
    } else if (assistantScope === "selection" && assistantSelection) {
      editor.chain().focus().setTextSelection({ from: assistantSelection.from, to: assistantSelection.to }).deleteSelection().insertContent(html).run();
    } else {
      editor.chain().focus().insertContent(html).run();
    }
    setStatusMessage("Assistant draft applied to the editor.");
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="page-wrap writing-editor-page">
      <PageSection
        eyebrow="Writing Editor"
        title={title}
        description="Rich-text drafting with a Google Docs-inspired toolbar and inline assistant workflows."
        actions={
          <div className="inline-actions">
            <SecondaryButton type="button" onClick={() => navigate("/writing")}>
              Back to Library
            </SecondaryButton>
            <ArtifactSaveButton
              buildPayload={() => {
                if (!editor) {
                  return null;
                }

                const payload = buildWritingArtifactInput({
                  title,
                  content: editor.getText(),
                  summary: editor.getText().slice(0, 180),
                  contextIds,
                });
                if (!payload) {
                  return null;
                }

                return {
                  ...payload,
                  artifact_id: documentId !== "new" ? documentId : undefined,
                  content_format: "rich_text",
                  content_json: editor.getJSON(),
                  metadata: {
                    ...(payload.metadata ?? {}),
                    tiptap: editor.getJSON(),
                    html: editor.getHTML(),
                    assistantDraft,
                    contextIds,
                  },
                };
              }}
              variant="primary"
              disabled={loading || !editor.getText().trim()}
              label="Save Document"
              savingLabel="Saving..."
              saveKey={`${documentId}:${title}:${editor.getText()}`}
              onSaved={(artifact) => {
                setStatusMessage("Document saved to the writing library.");
                if (documentId === "new") {
                  navigate(`/writing/${artifact.id}`, { replace: true });
                }
              }}
              onError={setStatusMessage}
            />
          </div>
        }
      />

      <div className="writing-editor-layout">
        <MotionCard className="writing-editor-card">
          <div className="writing-toolbar">
            <TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Document title" />
            <div className="inline-actions">
              <button className="toolbar-chip" onClick={() => editor.chain().focus().toggleBold().run()} type="button">
                Bold
              </button>
              <button className="toolbar-chip" onClick={() => editor.chain().focus().toggleItalic().run()} type="button">
                Italic
              </button>
              <button className="toolbar-chip" onClick={() => editor.chain().focus().toggleUnderline().run()} type="button">
                Underline
              </button>
              <button className="toolbar-chip" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} type="button">
                H1
              </button>
              <button className="toolbar-chip" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} type="button">
                H2
              </button>
              <button className="toolbar-chip" onClick={() => editor.chain().focus().toggleBulletList().run()} type="button">
                List
              </button>
              <button className="toolbar-chip" onClick={() => editor.chain().focus().setTextAlign("left").run()} type="button">
                Left
              </button>
              <button className="toolbar-chip" onClick={() => editor.chain().focus().setTextAlign("center").run()} type="button">
                Center
              </button>
              {colorOptions.map((color) => (
                <button
                  key={color}
                  className="toolbar-color"
                  onClick={() => editor.chain().focus().setColor(color).run()}
                  style={{ background: color }}
                  type="button"
                />
              ))}
            </div>
          </div>
          <EditorContent editor={editor} />
        </MotionCard>

        <div className="writing-side-panel">
          <ContextBuilder selectedIds={contextIds} onChange={setContextIds} title="Writing Context" />

          <MotionCard className="writing-assistant-card">
          <div className="context-builder-head">
            <div>
              <h3>@assistant</h3>
              <p>Targeted selection edits, document-wide rewrites, and insertion workflows using the writing run API.</p>
            </div>
            <StatusBadge status={assistantDraft ? "completed" : "disconnected"} label={statusMessage} />
          </div>

          <div className="stack-sm">
            <FieldLabel>Scope</FieldLabel>
            <Select value={assistantScope} onChange={(event) => setAssistantScope(event.target.value as typeof assistantScope)}>
              <option value="selection">Selected text</option>
              <option value="document">Whole document</option>
              <option value="insert">Insert after cursor</option>
            </Select>
          </div>

          <div className="stack-sm">
            <FieldLabel>Model</FieldLabel>
            <Select value={assistantModel} onChange={(event) => setAssistantModel(event.target.value)}>
              {modelOptions.map((option) => (
                <option key={option.id} value={option.openRouterId}>
                  {option.name} ({option.openRouterId})
                </option>
              ))}
            </Select>
          </div>

          <div className="stack-sm">
            <FieldLabel>Instruction</FieldLabel>
            <TextArea
              value={assistantPrompt}
              onChange={(event) => setAssistantPrompt(event.target.value)}
              placeholder="Rewrite this section to feel more executive. Or: insert a stronger closing paragraph."
            />
          </div>

          <div className="inline-actions">
            <SecondaryButton
              type="button"
              onClick={() =>
                openComparePanel({
                  prompt: assistantPrompt || editor.getText().slice(0, 2000),
                  contextIds: [...new Set([...(documentId !== "new" ? [documentId] : []), ...contextIds])],
                  studio: "writing",
                  onUseResult: (result) => {
                    setAssistantDraft(result.content);
                    setStatusMessage("Compare result loaded as the assistant draft.");
                  },
                  useResultLabel: "Use as Draft",
                })
              }
            >
              Compare Drafts
            </SecondaryButton>
            <PrimaryButton
              type="button"
              disabled={loading || !assistantPrompt.trim() || (assistantScope === "selection" && !assistantSelection)}
              onClick={handleAssistantRun}
            >
              {loading ? "Generating..." : "Generate Suggestion"}
            </PrimaryButton>
            <SecondaryButton type="button" disabled={!assistantDraft} onClick={applyAssistantDraft}>
              Apply Suggestion
            </SecondaryButton>
          </div>

          {assistantScope === "selection" && !assistantSelection ? (
            <div className="meta-placeholder">Select a document range before running a targeted edit.</div>
          ) : null}

          {assistantSelection ? (
            <div className="assistant-selection-preview">
              <strong>Selected text</strong>
              <p>{assistantSelection.text}</p>
            </div>
          ) : null}

          {assistantDraft ? (
            <div className="assistant-output">
              <div className="assistant-output-head">
                <strong>Assistant output</strong>
                <ArtifactSaveButton
                  buildPayload={() =>
                    buildWritingArtifactInput({
                      title: `${title} assistant suggestion`,
                      content: assistantDraft,
                      summary: assistantPrompt || assistantDraft,
                      runId: assistantRunId,
                      contextIds,
                    })
                  }
                  label="Save Suggestion"
                  savedLabel="Saved"
                  saveKey={assistantRunId ?? assistantDraft}
                  onSaved={() => setStatusMessage("Assistant suggestion saved to artifacts.")}
                  onError={setStatusMessage}
                />
              </div>
              <pre>{assistantDraft}</pre>
            </div>
          ) : (
            <EmptyState
              title="No assistant output yet"
              body="Run an instruction to preview the generated draft before you apply it to the document."
            />
          )}
          </MotionCard>
        </div>
      </div>
    </div>
  );
}
