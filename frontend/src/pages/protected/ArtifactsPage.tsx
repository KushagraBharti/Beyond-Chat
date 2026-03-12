import { useEffect, useState } from "react";
import { exportArtifact, listArtifacts, type ArtifactRecord } from "../../lib/api";
import {
  EmptyState,
  MotionCard,
  PageSection,
  PrimaryButton,
  SecondaryButton,
  Select,
  TextInput,
} from "../../components/protectedUi";

export default function ArtifactsPage() {
  const [items, setItems] = useState<ArtifactRecord[]>([]);
  const [activeItem, setActiveItem] = useState<ArtifactRecord | null>(null);
  const [query, setQuery] = useState("");
  const [studio, setStudio] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await listArtifacts({
          q: query || undefined,
          studio: studio === "all" ? undefined : studio,
          type: type === "all" ? undefined : type,
          limit: 60,
        });
        if (!active) {
          return;
        }
        setItems(response.items);
        setActiveItem((current) => response.items.find((item) => item.id === current?.id) ?? response.items[0] ?? null);
      } catch (err) {
        if (active) {
          setStatus(err instanceof Error ? err.message : "Failed to load artifacts.");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [query, studio, type]);

  const handleExport = async (format: "markdown" | "pdf") => {
    if (!activeItem) {
      return;
    }

    try {
      const blob = await exportArtifact(activeItem.id, format);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setStatus(`Opened ${format.toUpperCase()} export.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Export failed.");
    }
  };

  return (
    <div className="page-wrap">
      <PageSection
        eyebrow="Artifact Library"
        title="Search, filter, preview, and export"
        description="A document-style library for drafts, reports, prompts, images, and structured outputs across every studio."
        actions={
          <div className="inline-actions">
            <PrimaryButton type="button" onClick={() => handleExport("markdown")} disabled={!activeItem}>
              Export Markdown
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => handleExport("pdf")} disabled={!activeItem}>
              Export PDF
            </SecondaryButton>
          </div>
        }
      />

      <MotionCard>
        <div className="filters-row">
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search artifacts..." />
          <Select value={studio} onChange={(event) => setStudio(event.target.value)}>
            <option value="all">All studios</option>
            <option value="writing">Writing</option>
            <option value="research">Research</option>
            <option value="image">Image</option>
            <option value="data">Data</option>
            <option value="finance">Finance</option>
          </Select>
          <Select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All types</option>
            <option value="document">Document</option>
            <option value="report">Report</option>
            <option value="image">Image</option>
          </Select>
        </div>
      </MotionCard>

      <div className="artifact-layout">
        <MotionCard>
          {items.length ? (
            <div className="artifact-list">
              {items.map((item) => (
                <button
                  key={item.id}
                  className={`artifact-row ${activeItem?.id === item.id ? "is-active" : ""}`}
                  onClick={() => setActiveItem(item)}
                  type="button"
                >
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.summary ?? item.content.slice(0, 140)}</p>
                  </div>
                  <span>{item.studio}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No artifacts found" body="Adjust the search or create new outputs in the studios first." />
          )}
        </MotionCard>

        <MotionCard>
          {activeItem ? (
            <div className="artifact-detail">
              <div className="context-builder-head">
                <div>
                  <h3>{activeItem.title}</h3>
                  <p>{activeItem.studio} · {activeItem.type}</p>
                </div>
              </div>
              <div className="artifact-tag-row">
                {activeItem.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
              <article className="report-output">{activeItem.content}</article>
            </div>
          ) : (
            <EmptyState title="Select an artifact" body="The detail panel opens the currently highlighted artifact." />
          )}
          <div className="meta-placeholder">{status}</div>
        </MotionCard>
      </div>
    </div>
  );
}
