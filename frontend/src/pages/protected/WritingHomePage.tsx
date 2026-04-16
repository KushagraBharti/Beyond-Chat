import { motion } from "framer-motion";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteArtifact, listArtifacts, renameArtifact, type ArtifactRecord } from "../../lib/api";
import { fadeUp, studioColors } from "../../lib/theme";
import {
  EmptyState,
  MotionCard,
  PageSection,
  PrimaryButton,
  SecondaryButton,
  TextInput,
} from "../../components/protectedUi";

let writingDocumentsCache: ArtifactRecord[] | null = null;

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
  const [docMenu, setDocMenu] = useState<{ documentId: string; x: number; y: number } | null>(null);
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

  const syncDocuments = (updater: (current: ArtifactRecord[]) => ArtifactRecord[]) => {
    setDocuments((current) => {
      const next = updater(current);
      writingDocumentsCache = next;
      return next;
    });
  };

  const handleDocumentContextMenu = (event: React.MouseEvent, documentId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setDocMenu({ documentId, x: event.clientX, y: event.clientY });
  };

  const handleRenameDocument = async (document: ArtifactRecord) => {
    const nextTitle = window.prompt("Rename document", document.title)?.trim();
    setDocMenu(null);
    if (!nextTitle || nextTitle === document.title) return;

    const previous = documents;
    syncDocuments((current) => current.map((item) => (item.id === document.id ? { ...item, title: nextTitle } : item)));

    try {
      const response = await renameArtifact(document.id, { title: nextTitle });
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
    const confirmed = window.confirm(`Delete "${document.title}"? This document will be lost forever.`);
    setDocMenu(null);
    if (!confirmed) return;

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

            <button className="writing-template-card" onClick={() => navigate("/writing/new")} type="button">
              <div className="writing-template-page is-muted">
                <div className="writing-template-line w-70" />
                <div className="writing-template-line w-90" />
                <div className="writing-template-line w-80" />
                <div className="writing-template-line w-85" />
              </div>
              <strong>Brainstorm</strong>
            </button>

            <button className="writing-template-card" onClick={() => navigate("/writing/new")} type="button">
              <div className="writing-template-page is-muted">
                <div className="writing-template-line w-55" />
                <div className="writing-template-line w-92" />
                <div className="writing-template-line w-88" />
                <div className="writing-template-line w-76" />
              </div>
              <strong>Outline</strong>
            </button>

            <button className="writing-template-card" onClick={() => navigate("/writing/new")} type="button">
              <div className="writing-template-page is-muted">
                <div className="writing-template-line w-66" />
                <div className="writing-template-line w-84" />
                <div className="writing-template-line w-74" />
                <div className="writing-template-line w-90" />
              </div>
              <strong>Memo</strong>
            </button>
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

      {docMenu ? (
        <div
          className="bc-context-menu"
          style={{ left: docMenu.x, top: docMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {(() => {
            const document = documents.find((item) => item.id === docMenu.documentId);
            if (!document) return null;
            return (
              <>
                <button className="bc-context-menu-item" type="button" onClick={() => navigate(`/writing/${document.id}`)}>
                  Edit
                </button>
                <button className="bc-context-menu-item" type="button" onClick={() => void handleRenameDocument(document)}>
                  Rename
                </button>
                <button className="bc-context-menu-item is-danger" type="button" onClick={() => void handleDeleteDocument(document)}>
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
