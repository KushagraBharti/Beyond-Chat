import { motion } from "framer-motion";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ContextBuilder from "../../components/ContextBuilder";
import { createArtifact, createRun, deleteArtifact, listArtifacts, renameArtifact, type ArtifactRecord, type RunRecord } from "../../lib/api";
import { buildWritingArtifactInput } from "../../lib/artifactDrafts";
import { fadeUp, studioColors } from "../../lib/theme";
import {
  EmptyState,
  FieldLabel,
  MotionCard,
  PageSection,
  PrimaryButton,
  SecondaryButton,
  TextArea,
  TextInput,
} from "../../components/protectedUi";

let writingDocumentsCache: ArtifactRecord[] | null = null;

const writingTemplates = [
  {
    title: "Executive Launch Brief",
    label: "Launch brief",
    content: [
      "# Executive Launch Brief",
      "",
      "## Decision",
      "",
      "## Customer Insight",
      "",
      "## Market Evidence",
      "",
      "## Data Signal",
      "",
      "## Financial Read",
      "",
      "## Recommendation",
      "",
      "## Open Risks",
      "",
      "## Next Actions",
    ].join("\n"),
  },
  {
    title: "Retail Pilot Summary",
    label: "Retail pilot",
    content: [
      "# Retail Pilot Summary",
      "",
      "## Pilot Objective",
      "",
      "## Store Profile",
      "",
      "## Product Format",
      "",
      "## Success Metrics",
      "",
      "## Operating Constraints",
      "",
      "## Readout Plan",
    ].join("\n"),
  },
  {
    title: "Landing Page Copy",
    label: "Landing page",
    content: [
      "# Landing Page Copy",
      "",
      "## Hero",
      "",
      "## Product Story",
      "",
      "## Why It Works",
      "",
      "## Proof Points",
      "",
      "## Call To Action",
    ].join("\n"),
  },
  {
    title: "Launch Email",
    label: "Launch email",
    content: [
      "# Launch Email",
      "",
      "Subject:",
      "",
      "Preview text:",
      "",
      "## Opening",
      "",
      "## Product Detail",
      "",
      "## Reason To Believe",
      "",
      "## Action",
    ].join("\n"),
  },
];

const launchKitDocuments = [
  { title: "Executive Launch Brief", brief: "Summarize the decision, evidence, recommendation, and executive risks." },
  { title: "Retail Pilot Summary", brief: "Describe pilot objective, target store profile, operating constraints, and success metrics." },
  { title: "Landing Page Copy", brief: "Write concise product page copy with proof points and a clear call to action." },
  { title: "Launch Email", brief: "Draft an internal or partner-facing launch email with subject, preview text, and body." },
];

function getKitDocuments(run: RunRecord | null) {
  const documents = run?.output?.documents;
  if (!Array.isArray(documents)) return [];
  return documents
    .map((document) => {
      if (!document || typeof document !== "object") return null;
      const record = document as { title?: unknown; content?: unknown; summary?: unknown };
      const title = typeof record.title === "string" ? record.title : "Untitled Document";
      const content = typeof record.content === "string" ? record.content : "";
      const summary = typeof record.summary === "string" ? record.summary : content.slice(0, 180);
      return content.trim() ? { title, content, summary } : null;
    })
    .filter((document): document is { title: string; content: string; summary: string } => Boolean(document));
}

function DocumentGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3.5h6.5L20 9v11.5A2.5 2.5 0 0 1 17.5 23h-9A2.5 2.5 0 0 1 6 20.5V6A2.5 2.5 0 0 1 8.5 3.5Z" />
      <path d="M14 3.5V9h5.5" />
      <path d="M9 13h6" />
      <path d="M9 16.5h6" />
    </svg>
  );
}

function matchesDocumentQuery(document: ArtifactRecord, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    document.title,
    document.summary ?? "",
    document.content,
    document.contentFormat,
    ...document.tags,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

export default function WritingHomePage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ArtifactRecord[]>(() => writingDocumentsCache ?? []);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [loading, setLoading] = useState(() => writingDocumentsCache === null);
  const [docMenu, setDocMenu] = useState<{
    documentId: string;
    x: number;
    y: number;
    phase: "default" | "rename" | "confirm";
    renameValue: string;
  } | null>(null);
  const [kitPrompt, setKitPrompt] = useState(
    "Using the attached artifacts and current launch context, create a launch kit with an executive brief, retail pilot summary, landing page copy, and launch email. Keep each document concise, evidence-backed, and ready to save.",
  );
  const [kitContextIds, setKitContextIds] = useState<string[]>([]);
  const [kitRun, setKitRun] = useState<RunRecord | null>(null);
  const [kitStatus, setKitStatus] = useState("Ready");
  const [kitLoading, setKitLoading] = useState(false);
  const [savingKit, setSavingKit] = useState(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(writingDocumentsCache === null);
        const response = await listArtifacts({ studio: "writing", limit: 100 });
        if (active) {
          writingDocumentsCache = response.items;
          setDocuments(response.items);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load writing library.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!docMenu) return;

    const closeMenu = () => setDocMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeMenu);
    };
  }, [docMenu]);

  const filteredDocuments = useMemo(
    () => documents.filter((document) => matchesDocumentQuery(document, deferredQuery)),
    [documents, deferredQuery],
  );
  const kitDocuments = useMemo(() => getKitDocuments(kitRun), [kitRun]);

  const syncDocuments = (updater: (current: ArtifactRecord[]) => ArtifactRecord[]) => {
    setDocuments((current) => {
      const next = updater(current);
      writingDocumentsCache = next;
      return next;
    });
  };

  const openTemplate = (template: (typeof writingTemplates)[number]) => {
    navigate("/writing/new", { state: { template: { title: template.title, content: template.content } } });
  };

  const runLaunchKit = async () => {
    if (!kitPrompt.trim()) return;
    setKitLoading(true);
    setKitStatus("Generating launch kit...");
    setKitRun(null);
    try {
      const response = await createRun({
        studio: "writing",
        title: "Writing launch kit",
        prompt: kitPrompt,
        context_ids: kitContextIds,
        options: {
          mode: "multi_output",
          documents: launchKitDocuments,
        },
      });
      setKitRun(response.run);
      setKitStatus(response.run.status === "completed" ? "Launch kit generated." : response.run.error_message ?? response.run.status);
    } catch (err) {
      setKitStatus(err instanceof Error ? err.message : "Launch kit generation failed.");
    } finally {
      setKitLoading(false);
    }
  };

  const saveLaunchKitDocuments = async () => {
    if (!kitRun || !kitDocuments.length) return;
    setSavingKit(true);
    setKitStatus("Saving launch kit documents...");
    try {
      const saved: ArtifactRecord[] = [];
      for (const document of kitDocuments) {
        const payload = buildWritingArtifactInput({
          title: document.title,
          content: document.content,
          summary: document.summary,
          runId: kitRun.id,
          contextIds: kitContextIds,
        });
        if (!payload) continue;
        const response = await createArtifact({
          ...payload,
          source_run_id: kitRun.id,
          content_json: {
            multiOutputDocument: document,
            sourceRunId: kitRun.id,
            contextIds: kitContextIds,
          },
        });
        saved.push(response.artifact);
      }
      if (saved.length) {
        syncDocuments((current) => [...saved, ...current]);
      }
      setKitStatus(`Saved ${saved.length} document${saved.length === 1 ? "" : "s"} as artifacts.`);
    } catch (err) {
      setKitStatus(err instanceof Error ? err.message : "Could not save launch kit documents.");
    } finally {
      setSavingKit(false);
    }
  };

  const handleDocumentContextMenu = (event: React.MouseEvent, documentId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const doc = documents.find((d) => d.id === documentId);
    setDocMenu({ documentId, x: event.clientX, y: event.clientY, phase: "default", renameValue: doc?.title ?? "" });
  };

  const handleRenameDocument = async (document: ArtifactRecord, nextTitle: string) => {
    setDocMenu(null);
    const trimmed = nextTitle.trim();
    if (!trimmed || trimmed === document.title) return;

    const previous = documents;
    syncDocuments((current) => current.map((item) => (item.id === document.id ? { ...item, title: trimmed } : item)));

    try {
      const response = await renameArtifact(document.id, { title: trimmed });
      syncDocuments((current) =>
        current.map((item) => (item.id === document.id ? { ...item, title: response.artifact.title } : item)),
      );
    } catch (err) {
      writingDocumentsCache = previous;
      setDocuments(previous);
      setError(err instanceof Error ? err.message : "Failed to rename document.");
    }
  };

  const handleDeleteDocument = async (document: ArtifactRecord) => {
    setDocMenu(null);
    const previous = documents;
    syncDocuments((current) => current.filter((item) => item.id !== document.id));

    try {
      await deleteArtifact(document.id);
    } catch (err) {
      writingDocumentsCache = previous;
      setDocuments(previous);
      setError(err instanceof Error ? err.message : "Failed to delete document.");
    }
  };

  return (
    <div className="page-wrap writing-home-page">
      <PageSection
        eyebrow="Writing Studio"
        title="Documents"
        description="Create a new draft or reopen recent documents."
        actions={
          <div className="inline-actions">
            <PrimaryButton type="button" onClick={() => navigate("/writing/new")}>
              New document
            </PrimaryButton>
            <SecondaryButton type="button">Import</SecondaryButton>
          </div>
        }
      />

      {error ? <div className="error-copy">{error}</div> : null}

      <motion.div variants={fadeUp}>
        <MotionCard accent={studioColors.writing} className="writing-docs-shell">
          <div className="writing-docs-topbar">
            <div>
              <div className="page-eyebrow">Start a new document</div>
              <h2 className="writing-docs-heading">Templates</h2>
            </div>
            <div className="writing-docs-search">
              <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents" />
            </div>
          </div>

          <div className="writing-template-strip">
            <button className="writing-template-card is-primary" onClick={() => navigate("/writing/new")} type="button">
              <div className="writing-template-page">
                <div className="writing-template-plus">+</div>
              </div>
              <strong>Blank document</strong>
            </button>

            {writingTemplates.map((template, index) => (
              <button className="writing-template-card" onClick={() => openTemplate(template)} type="button" key={template.title}>
                <div className="writing-template-page is-muted">
                  <div className={index % 2 === 0 ? "writing-template-line w-70" : "writing-template-line w-55"} />
                  <div className="writing-template-line w-90" />
                  <div className={index % 3 === 0 ? "writing-template-line w-80" : "writing-template-line w-88"} />
                  <div className="writing-template-line w-76" />
                </div>
                <strong>{template.label}</strong>
              </button>
            ))}
          </div>

          <div className="writing-recents-head">
            <div>
              <div className="page-eyebrow">Recent documents</div>
              <h3>{loading && !documents.length ? "Loading your documents..." : "Open where you left off."}</h3>
            </div>
            <div className="writing-recents-controls">
              <span className="writing-recents-count">{filteredDocuments.length} docs</span>
              <div className="writing-view-toggle" role="tablist" aria-label="Document view mode">
                <button
                  type="button"
                  className={`writing-view-toggle-btn ${viewMode === "list" ? "is-active" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  List
                </button>
                <button
                  type="button"
                  className={`writing-view-toggle-btn ${viewMode === "grid" ? "is-active" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  Grid
                </button>
              </div>
            </div>
          </div>

          {filteredDocuments.length ? (
            viewMode === "list" ? (
              <div className="writing-recents-table">
                <div className="writing-recents-header">
                  <span>Name</span>
                  <span>Summary</span>
                  <span>Last opened</span>
                </div>

                {filteredDocuments.map((document) => (
                  <button
                    key={document.id}
                    className="writing-recents-row"
                    onClick={() => navigate(`/writing/${document.id}`)}
                    onContextMenu={(event) => handleDocumentContextMenu(event, document.id)}
                    type="button"
                  >
                    <div className="writing-recents-title">
                      <span className="writing-recents-icon">
                        <DocumentGlyph />
                      </span>
                      <div>
                        <strong>{document.title}</strong>
                        <div className="writing-recents-meta">
                          {document.contentFormat.replaceAll("_", " ")}
                          {document.tags.length ? ` · ${document.tags.slice(0, 2).map((tag) => `#${tag}`).join(" ")}` : ""}
                        </div>
                      </div>
                    </div>
                    <p>{document.summary ?? document.content.slice(0, 140)}</p>
                    <span>{new Date(document.updated_at).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="writing-doc-grid">
                {filteredDocuments.map((document) => (
                  <button
                    key={document.id}
                    className="writing-doc-card"
                    onClick={() => navigate(`/writing/${document.id}`)}
                    onContextMenu={(event) => handleDocumentContextMenu(event, document.id)}
                    type="button"
                  >
                    <div className="writing-doc-card-top">
                      <span className="writing-recents-icon">
                        <DocumentGlyph />
                      </span>
                      <span>{new Date(document.updated_at).toLocaleDateString()}</span>
                    </div>
                    <strong>{document.title}</strong>
                    <p>{document.summary ?? document.content.slice(0, 140)}</p>
                    <div className="writing-recents-meta">{document.contentFormat.replaceAll("_", " ")}</div>
                  </button>
                ))}
              </div>
            )
          ) : (
            <EmptyState
              title={query.trim() ? "No matching documents" : "No documents yet"}
              body={query.trim() ? "Try a different title, tag, or keyword." : "Create a new document to start your writing library."}
              action={
                <PrimaryButton type="button" onClick={() => navigate("/writing/new")}>
                  Create first document
                </PrimaryButton>
              }
            />
          )}
        </MotionCard>
      </motion.div>

      <motion.div variants={fadeUp} className="writing-kit-layout">
        <MotionCard accent={studioColors.writing} className="writing-kit-card">
          <div className="context-builder-head">
            <div>
              <div className="page-eyebrow">Launch kit generator</div>
              <h3>Generate multiple documents from one writing run.</h3>
              <p>Create the core writing artifacts together, then save each output into the library.</p>
            </div>
            <span className="writing-recents-count">{kitStatus}</span>
          </div>

          <div className="stack-sm">
            <FieldLabel>Instruction</FieldLabel>
            <TextArea value={kitPrompt} onChange={(event) => setKitPrompt(event.target.value)} />
          </div>

          <div className="writing-kit-docs">
            {launchKitDocuments.map((document) => (
              <div key={document.title} className="writing-kit-doc-chip">
                <strong>{document.title}</strong>
                <span>{document.brief}</span>
              </div>
            ))}
          </div>

          <div className="inline-actions">
            <PrimaryButton type="button" onClick={() => void runLaunchKit()} disabled={kitLoading || !kitPrompt.trim()}>
              {kitLoading ? "Generating..." : "Generate Kit"}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => void saveLaunchKitDocuments()} disabled={savingKit || !kitDocuments.length}>
              {savingKit ? "Saving..." : "Save All Outputs"}
            </SecondaryButton>
          </div>

          {kitDocuments.length ? (
            <div className="writing-kit-output-grid">
              {kitDocuments.map((document) => (
                <button
                  key={document.title}
                  type="button"
                  className="writing-doc-card"
                  onClick={() =>
                    navigate("/writing/new", {
                      state: {
                        contextIds: kitContextIds,
                        template: {
                          title: document.title,
                          content: document.content,
                        },
                      },
                    })
                  }
                >
                  <div className="writing-doc-card-top">
                    <span className="writing-recents-icon">
                      <DocumentGlyph />
                    </span>
                    <span>Generated</span>
                  </div>
                  <strong>{document.title}</strong>
                  <p>{document.summary}</p>
                </button>
              ))}
            </div>
          ) : null}
        </MotionCard>

        <ContextBuilder selectedIds={kitContextIds} onChange={setKitContextIds} title="Launch Kit Context" />
      </motion.div>

      {docMenu ? (
        <div
          className="bc-context-menu"
          style={{ left: docMenu.x, top: docMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {(() => {
            const document = documents.find((item) => item.id === docMenu.documentId);
            if (!document) return null;

            if (docMenu.phase === "rename") {
              return (
                <>
                  <input
                    className="bc-context-menu-input"
                    value={docMenu.renameValue}
                    onChange={(e) => setDocMenu((m) => m ? { ...m, renameValue: e.target.value } : null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRenameDocument(document, docMenu.renameValue);
                      if (e.key === "Escape") setDocMenu((m) => m ? { ...m, phase: "default" } : null);
                    }}
                    autoFocus
                  />
                  <button className="bc-context-menu-item" type="button" onClick={() => void handleRenameDocument(document, docMenu.renameValue)}>
                    Save
                  </button>
                  <button className="bc-context-menu-item" type="button" onClick={() => setDocMenu((m) => m ? { ...m, phase: "default" } : null)}>
                    Cancel
                  </button>
                </>
              );
            }

            if (docMenu.phase === "confirm") {
              return (
                <>
                  <div className="bc-context-menu-label">Delete this document?</div>
                  <button className="bc-context-menu-item is-danger" type="button" onClick={() => void handleDeleteDocument(document)}>
                    Yes, delete
                  </button>
                  <button className="bc-context-menu-item" type="button" onClick={() => setDocMenu((m) => m ? { ...m, phase: "default" } : null)}>
                    Cancel
                  </button>
                </>
              );
            }

            return (
              <>
                <button className="bc-context-menu-item" type="button" onClick={() => navigate(`/writing/${document.id}`)}>
                  Edit
                </button>
                <button className="bc-context-menu-item" type="button" onClick={() => setDocMenu((m) => m ? { ...m, phase: "rename" } : null)}>
                  Rename
                </button>
                <button className="bc-context-menu-item is-danger" type="button" onClick={() => setDocMenu((m) => m ? { ...m, phase: "confirm" } : null)}>
                  Delete
                </button>
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
