import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createArtifact, createRun, getArtifact } from "../../lib/api";
import { markdownToHtml } from "../../lib/editor";
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

const modelOptions = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-2.0-flash-001",
];

const colorOptions = ["#0D0D0D", "#4F3FE8", "#E55613", "#0E7AE6", "#30A46C"];

export default function WritingEditorPage() {
  const { documentId = "new" } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("Untitled Document");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantScope, setAssistantScope] = useState<"selection" | "document" | "insert">("selection");
  const [assistantModel, setAssistantModel] = useState(modelOptions[0]);
  const [assistantDraft, setAssistantDraft] = useState("");
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

  const activeSelection = (() => {
    const { from, to } = editor.state.selection;
    if (from === to) {
      return "";
    }
    return editor.state.doc.textBetween(from, to, "\n");
  })();

  const handleSave = async () => {
    if (!editor) {
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title,
        type: "document",
        studio: "writing",
        content: editor.getText(),
        summary: editor.getText().slice(0, 180),
        content_format: "rich_text",
        metadata: {
          tiptap: editor.getJSON(),
          html: editor.getHTML(),
          assistantDraft,
        },
        tags: ["writing", "document"],
      };
      const response = await createArtifact(payload);
      setStatusMessage("Document saved to the writing library.");
      if (documentId === "new") {
        navigate(`/writing/${response.artifact.id}`, { replace: true });
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssistantRun = async () => {
    if (!editor || !assistantPrompt.trim()) {
      return;
    }
    setLoading(true);
    try {
      const sourceText =
        assistantScope === "selection" && activeSelection
          ? activeSelection
          : editor.getText();
      const response = await createRun({
        studio: "writing",
        title: `${title} assistant draft`,
        prompt: `Instruction: ${assistantPrompt}\n\nScope: ${assistantScope}\n\nDocument content:\n${sourceText}`,
        model: assistantModel,
      });
      const content = String(response.run.output.content ?? "");
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
    } else if (assistantScope === "selection" && activeSelection) {
      editor.chain().focus().deleteSelection().insertContent(html).run();
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
            <PrimaryButton disabled={loading} type="button" onClick={handleSave}>
              {loading ? "Saving..." : "Save Document"}
            </PrimaryButton>
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

        <MotionCard className="writing-assistant-card">
          <div className="context-builder-head">
            <div>
              <h3>@assistant</h3>
              <p>Selection, document-wide rewrite, and insertion workflows using the writing run API.</p>
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
                <option key={option} value={option}>
                  {option}
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
            <PrimaryButton type="button" disabled={loading} onClick={handleAssistantRun}>
              {loading ? "Generating..." : "Generate Suggestion"}
            </PrimaryButton>
            <SecondaryButton type="button" disabled={!assistantDraft} onClick={applyAssistantDraft}>
              Apply Suggestion
            </SecondaryButton>
          </div>

          {activeSelection ? (
            <div className="assistant-selection-preview">
              <strong>Selected text</strong>
              <p>{activeSelection}</p>
            </div>
          ) : null}

          {assistantDraft ? (
            <div className="assistant-output">
              <strong>Assistant output</strong>
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
  );
}
