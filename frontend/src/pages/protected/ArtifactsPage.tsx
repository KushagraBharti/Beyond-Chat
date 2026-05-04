import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { exportArtifact, exportArtifactBundle, listArtifacts, type ArtifactRecord } from "../../lib/api";
import { useComparePanel } from "../../features/compare/ComparePanelProvider";
import {
  EmptyState,
  MotionCard,
  PageSection,
  PrimaryButton,
  SecondaryButton,
  Select,
  TextInput,
} from "../../components/protectedUi";

const launchKitSlots = [
  { label: "Launch Plan", terms: ["launch plan", "plan"] },
  { label: "Category Research", terms: ["research", "category", "competitor", "market"] },
  { label: "Data Analysis", terms: ["data", "analysis", "chart", "table"] },
  { label: "Finance Memo", terms: ["finance", "memo", "dexter", "sensitivity"] },
  { label: "Executive Brief", terms: ["executive", "brief"] },
  { label: "Retail Pilot Summary", terms: ["retail", "pilot"] },
  { label: "Landing Page Copy", terms: ["landing", "page"] },
  { label: "Launch Email", terms: ["email"] },
  { label: "Creative", terms: ["image", "mockup", "creative", "ad", "social"] },
  { label: "Model Compare", terms: ["compare"] },
];

function artifactSearchText(item: ArtifactRecord) {
  return [
    item.title,
    item.summary ?? "",
    item.content,
    item.studio,
    item.type,
    ...item.tags,
  ].join(" ").toLowerCase();
}

function matchesSlot(item: ArtifactRecord, terms: string[]) {
  const text = artifactSearchText(item);
  return terms.some((term) => text.includes(term));
}

export default function ArtifactsPage() {
  const navigate = useNavigate();
  const { openComparePanel } = useComparePanel();
  const [items, setItems] = useState<ArtifactRecord[]>([]);
  const [activeItem, setActiveItem] = useState<ArtifactRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  const launchKitMatches = launchKitSlots.map((slot) => ({
    ...slot,
    item: items.find((item) => matchesSlot(item, slot.terms)),
  }));
  const launchKitIds = launchKitMatches
    .map((slot) => slot.item?.id)
    .filter((id): id is string => Boolean(id));

  const toggleSelected = (artifactId: string) => {
    setSelectedIds((current) =>
      current.includes(artifactId)
        ? current.filter((id) => id !== artifactId)
        : [...current, artifactId],
    );
  };

  const handleBundleExport = async () => {
    const artifactIds = selectedIds.length ? selectedIds : launchKitIds;
    if (!artifactIds.length) {
      setStatus("Select artifacts before exporting a bundle.");
      return;
    }

    try {
      const blob = await exportArtifactBundle({
        title: selectedIds.length ? "Beyond Chat Artifact Bundle" : "Cinder Orange Launch Kit",
        artifact_ids: artifactIds,
      });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setStatus(`Opened bundle export with ${artifactIds.length} artifact${artifactIds.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Bundle export failed.");
    }
  };

  const artifactHandoffPrompt = (artifact: ArtifactRecord) =>
    `Use the attached artifact "${artifact.title}" as context. Summarize the next best action and produce a concrete artifact-ready output.`;

  const continueWithArtifact = (path: string, artifact: ArtifactRecord) => {
    if (path === "/writing/new") {
      navigate(path, {
        state: {
          prompt: artifactHandoffPrompt(artifact),
          contextIds: [artifact.id],
          template: {
            title: artifact.title,
            content: artifact.content,
          },
        },
      });
      return;
    }

    navigate(path, {
      state: {
        prompt: artifactHandoffPrompt(artifact),
        contextIds: [artifact.id],
      },
    });
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
            <SecondaryButton type="button" onClick={handleBundleExport} disabled={!selectedIds.length && !launchKitIds.length}>
              Export Bundle
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

      <MotionCard>
        <div className="artifact-bundle-head">
          <div>
            <div className="page-eyebrow">Launch Kit</div>
            <h3>Cinder Orange Launch Kit</h3>
            <p>Matched from your saved artifacts. Missing slots stay empty until live studio outputs are saved.</p>
          </div>
          <div className="inline-actions">
            <SecondaryButton type="button" onClick={() => setSelectedIds(launchKitIds)} disabled={!launchKitIds.length}>
              Select Matched
            </SecondaryButton>
            <SecondaryButton type="button" onClick={() => setSelectedIds([])} disabled={!selectedIds.length}>
              Clear Selection
            </SecondaryButton>
          </div>
        </div>
        <div className="artifact-bundle-grid">
          {launchKitMatches.map((slot) => (
            <button
              key={slot.label}
              type="button"
              className={`artifact-bundle-slot ${slot.item ? "has-artifact" : ""} ${slot.item && selectedIds.includes(slot.item.id) ? "is-selected" : ""}`}
              disabled={!slot.item}
              onClick={() => slot.item && toggleSelected(slot.item.id)}
            >
              <strong>{slot.label}</strong>
              <span>{slot.item ? slot.item.title : "Waiting for saved artifact"}</span>
            </button>
          ))}
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
                  <span
                    className={`artifact-select-box ${selectedIds.includes(item.id) ? "is-selected" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleSelected(item.id);
                    }}
                    role="checkbox"
                    aria-checked={selectedIds.includes(item.id)}
                    tabIndex={0}
                  />
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
              <div className="artifact-handoff-row">
                <SecondaryButton type="button" onClick={() => continueWithArtifact("/chat", activeItem)}>
                  Continue in Chat
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => continueWithArtifact("/research", activeItem)}>
                  Research
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => continueWithArtifact("/finance", activeItem)}>
                  Finance
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => continueWithArtifact("/writing/new", activeItem)}>
                  Writing
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => continueWithArtifact("/image", activeItem)}>
                  Image
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() =>
                    openComparePanel({
                      prompt: artifactHandoffPrompt(activeItem),
                      contextIds: [activeItem.id],
                      studio: activeItem.studio,
                    })
                  }
                >
                  Compare
                </SecondaryButton>
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
