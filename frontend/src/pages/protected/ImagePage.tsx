import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ArtifactSaveButton from "../../components/ArtifactSaveButton";
import { createRun, listArtifacts, type ArtifactRecord } from "../../lib/api";
import { buildImageArtifactInput } from "../../lib/artifactDrafts";
import { useAuth } from "../../context/AuthContext";
import { setStoredWorkspaceId } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";
import { AppBrand } from "../../components/protectedUi";

const imageModels = [
  { value: "google/gemini-2.5-flash-image", label: "Nano Banana", desc: "Fast contextual image generation" },
  { value: "google/gemini-3.1-flash-image-preview", label: "Nano Banana 2", desc: "Pro-level quality at Flash speed" },
  { value: "google/gemini-3-pro-image-preview", label: "Nano Banana Pro", desc: "Most advanced Google image model" },
  { value: "openai/gpt-5-image", label: "GPT-5 Image", desc: "OpenAI flagship image generation" },
  { value: "openai/gpt-5-image-mini", label: "GPT-5 Image Mini", desc: "Efficient OpenAI image model" },
  { value: "sourceful/riverflow-v2-pro", label: "Riverflow V2 Pro", desc: "Top-tier control, perfect text" },
  { value: "sourceful/riverflow-v2-fast", label: "Riverflow V2 Fast", desc: "Production speed, low latency" },
  { value: "black-forest-labs/flux.2-max", label: "FLUX.2 Max", desc: "Top-tier Black Forest Labs model" },
  { value: "black-forest-labs/flux.2-klein-4b", label: "FLUX.2 Klein 4B", desc: "Fast and cost-effective" },
  { value: "bytedance-seed/seedream-4.5", label: "Seedream 4.5", desc: "ByteDance aesthetic generation" },
];

const aspectRatios = [
  { value: "1:1", label: "1:1", w: 1, h: 1 },
  { value: "16:9", label: "16:9", w: 16, h: 9 },
  { value: "9:16", label: "9:16", w: 9, h: 16 },
  { value: "4:3", label: "4:3", w: 4, h: 3 },
  { value: "3:4", label: "3:4", w: 3, h: 4 },
  { value: "3:2", label: "3:2", w: 3, h: 2 },
  { value: "2:3", label: "2:3", w: 2, h: 3 },
  { value: "21:9", label: "21:9", w: 21, h: 9 },
];

const resolutionOptions = [
  { value: "Draft", label: "Standard", desc: "1K" },
  { value: "High", label: "High", desc: "2K" },
  { value: "Ultra", label: "Ultra", desc: "4K" },
];

interface FreshImage {
  id: string;
  url: string;
  prompt: string;
  storagePath: string;
  model: string;
  modelLabel: string;
  ratio: string;
  quality: string;
  createdAt: string;
}

type GalleryItem =
  | { kind: "fresh"; data: FreshImage }
  | { kind: "saved"; data: ArtifactRecord };

interface DetailTarget {
  url: string;
  title: string;
  model: string;
  ratio: string;
  quality: string;
  prompt: string;
  createdAt: string;
  fresh?: FreshImage;
  artifact?: ArtifactRecord;
}

export default function ImagePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([imageModels[0].value]);
  const [ratio, setRatio] = useState("4:3");
  const [quality, setQuality] = useState("High");
  const [gallery, setGallery] = useState<ArtifactRecord[]>([]);
  const [freshImages, setFreshImages] = useState<FreshImage[]>([]);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  const markBroken = useCallback((id: string) => {
    setBrokenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await listArtifacts({ studio: "image", limit: 60 });
        if (active) {
          // Filter out artifacts with no preview image at all
          const valid = response.items.filter((a) => a.previewImage);
          setGallery(valid);
        }
      } catch {
        if (active) setStatus("Could not load image history.");
      }
    })();
    return () => { active = false; };
  }, []);

  const allItems: GalleryItem[] = [
    ...freshImages.map((f) => ({ kind: "fresh" as const, data: f })),
    ...gallery
      .filter((a) => !brokenIds.has(a.id))
      .map((a) => ({ kind: "saved" as const, data: a })),
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!selectedModels.length) {
      setStatus("Pick at least one model.");
      return;
    }
    setLoading(true);
    setStatus("Generating...");
    setFreshImages([]);
    try {
      const response = await createRun({
        studio: "image",
        title: prompt.slice(0, 60) || "Image generation",
        prompt,
        model: selectedModels[0],
        options: { ratio, quality, models: selectedModels },
      });

      const run = response.run;
      if (run.status === "failed") {
        setStatus(run.error_message ?? "Generation failed.");
        return;
      }

      const urls = (run.output?.urls as string[] | undefined) ?? [];
      const enhancedPrompt = (run.output?.enhanced_prompt as string | undefined) ?? prompt;
      const paths = (run.output?.paths as string[] | undefined) ?? [];
      const variants =
        (run.output?.variants as Array<{
          model: string;
          urls: string[];
          paths: string[];
          count: number;
          error?: string;
        }> | undefined) ?? [];

      if (variants.length) {
        const generated = variants.flatMap((variant, variantIndex) => {
          const modelLabel = imageModels.find((m) => m.value === variant.model)?.label ?? variant.model;
          return (variant.urls ?? []).map((url, imageIndex) => ({
            id: `${run.id}-${variantIndex}-${imageIndex}`,
            url,
            prompt: enhancedPrompt,
            storagePath: variant.paths?.[imageIndex] ?? "",
            model: variant.model,
            modelLabel,
            ratio,
            quality,
            createdAt: new Date().toISOString(),
          }));
        });

        const failedModels = variants.filter((variant) => variant.error).map((variant) => variant.model);
        setFreshImages(generated);
        if (generated.length && failedModels.length) {
          setStatus(`${generated.length} image(s) generated. ${failedModels.length} model(s) failed.`);
        } else if (generated.length) {
          setStatus(`${generated.length} image(s) generated across ${selectedModels.length} model(s).`);
        } else if (failedModels.length) {
          setStatus(`Generation failed for all selected models (${failedModels.join(", ")}).`);
        } else {
          setStatus("No images returned.");
        }
        return;
      }

      const firstModel = selectedModels[0] ?? imageModels[0].value;
      const modelLabel = imageModels.find((m) => m.value === firstModel)?.label ?? firstModel;

      setFreshImages(
        urls.map((url, index) => ({
          id: `${run.id}-${index}`,
          url,
          prompt: enhancedPrompt,
          storagePath: paths[index] ?? "",
          model: firstModel,
          modelLabel,
          ratio,
          quality,
          createdAt: new Date().toISOString(),
        })),
      );
      setStatus(urls.length ? `${urls.length} image(s) generated` : "No images returned.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (item: GalleryItem) => {
    if (item.kind === "fresh") {
      const f = item.data;
      setDetail({
        url: f.url,
        title: f.prompt.slice(0, 60),
        model: f.modelLabel,
        ratio: f.ratio,
        quality: f.quality,
        prompt: f.prompt,
        createdAt: f.createdAt,
        fresh: f,
      });
    } else {
      const a = item.data;
      setDetail({
        url: a.previewImage ?? "",
        title: a.title,
        model: (a.metadata?.model as string) ?? a.studio,
        ratio: (a.metadata?.ratio as string) ?? "",
        quality: (a.metadata?.quality as string) ?? "",
        prompt: a.content,
        createdAt: a.created_at,
        artifact: a,
      });
    }
  };

  const handleSignOut = async () => {
    setStoredWorkspaceId(null);
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login");
  };

  const detailIndex = detail
    ? allItems.findIndex((item) => {
        if (item.kind === "fresh") return item.data.url === detail.url;
        return item.data.previewImage === detail.url;
      })
    : -1;

  const navigateDetail = (direction: -1 | 1) => {
    const nextIndex = detailIndex + direction;
    if (nextIndex >= 0 && nextIndex < allItems.length) {
      openDetail(allItems[nextIndex]);
    }
  };

  const toggleModel = (modelValue: string) => {
    setSelectedModels((current) => {
      if (current.includes(modelValue)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((entry) => entry !== modelValue);
      }
      return [...current, modelValue];
    });
  };

  return (
    <div className="is">
      {/* Sidebar */}
      <aside className={`is-sidebar ${sidebarOpen ? "" : "is-sidebar-hidden"}`}>
        <div className="is-sidebar-top">
          <Link to="/dashboard" className="is-brand-link">
            <AppBrand compact={false} />
          </Link>
          <button
            className="is-sidebar-toggle"
            onClick={() => setSidebarOpen(false)}
            type="button"
            title="Close sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></svg>
          </button>
        </div>

        <div className="is-sidebar-scroll">
          {/* Prompt */}
          <div className="is-section">
            <div className="is-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" /></svg>
              Prompt
            </div>
            <textarea
              className="is-prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your image..."
              rows={4}
            />
          </div>

          {/* Models */}
          <div className="is-section">
            <div className="is-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></svg>
              Models ({selectedModels.length} selected)
            </div>
            <div className="is-model-list">
              {imageModels.map((m) => (
                <button
                  key={m.value}
                  className={`is-model-card ${selectedModels.includes(m.value) ? "is-active" : ""}`}
                  onClick={() => toggleModel(m.value)}
                  type="button"
                >
                  <div className="is-model-card-top">
                    <strong>{m.label}</strong>
                    <div
                      className={`is-model-radio ${selectedModels.includes(m.value) ? "is-checked" : ""}`}
                    />
                  </div>
                  <span>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="is-section">
            <div className="is-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2" /></svg>
              Aspect Ratio
            </div>
            <div className="is-ratio-grid">
              {aspectRatios.map((r) => (
                <button
                  key={r.value}
                  className={`is-ratio-btn ${ratio === r.value ? "is-active" : ""}`}
                  onClick={() => setRatio(r.value)}
                  type="button"
                  title={r.label}
                >
                  <div
                    className="is-ratio-shape"
                    style={{
                      aspectRatio: `${r.w}/${r.h}`,
                    }}
                  />
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div className="is-section">
            <div className="is-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>
              Resolution
            </div>
            <div className="is-resolution-bar">
              {resolutionOptions.map((r) => (
                <button
                  key={r.value}
                  className={`is-resolution-btn ${quality === r.value ? "is-active" : ""}`}
                  onClick={() => setQuality(r.value)}
                  type="button"
                >
                  <strong>{r.label}</strong>
                  <span>{r.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate button */}
        <div className="is-sidebar-bottom">
          <button
            className="is-generate-btn"
            onClick={() => void handleGenerate()}
            disabled={loading || !prompt.trim()}
            type="button"
          >
            {loading ? (
              <>
                <span className="is-generate-spinner" />
                Generating...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" /></svg>
                Generate
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main gallery area */}
      <main className="is-main">
        <div className="is-topbar">
          {!sidebarOpen && (
            <button
              className="is-sidebar-open"
              onClick={() => setSidebarOpen(true)}
              type="button"
              title="Open sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></svg>
            </button>
          )}
          {status !== "Ready" && (
            <div className="is-status">{status}</div>
          )}
        </div>

        {allItems.length > 0 ? (
          <div className="is-gallery">
            {allItems.map((item, index) => {
              const isFresh = item.kind === "fresh";
              const imgUrl = isFresh ? item.data.url : item.data.previewImage;
              const title = isFresh
                ? item.data.prompt.slice(0, 60)
                : item.data.title;
              const modelLabel = isFresh
                ? item.data.modelLabel
                : ((item.data.metadata?.model as string) ?? "");

              return (
                <div
                  key={isFresh ? item.data.id : item.data.id}
                  className="is-gallery-item"
                >
                  <div
                    className="is-gallery-thumb"
                    onClick={() => openDetail(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && openDetail(item)}
                  >
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={title}
                        loading="lazy"
                        onError={() => {
                          if (!isFresh) markBroken(item.data.id);
                        }}
                      />
                    ) : (
                      <div className="is-gallery-placeholder" />
                    )}
                    {isFresh && (
                      <div className="is-gallery-fresh-badge">New</div>
                    )}
                  </div>
                  <div className="is-gallery-meta">
                    <span className="is-gallery-model">{modelLabel}</span>
                    {isFresh && (
                      <ArtifactSaveButton
                        buildPayload={() =>
                          buildImageArtifactInput({
                            prompt: item.data.prompt,
                            model: item.data.model,
                            ratio: item.data.ratio,
                            quality: item.data.quality,
                            url: item.data.url,
                            storagePath: item.data.storagePath,
                          })
                        }
                        variant="secondary"
                        saveKey={item.data.id}
                        label="Save"
                        savedLabel="Saved"
                        onSaved={(artifact) => {
                          setGallery((prev) => [artifact, ...prev]);
                          setFreshImages((prev) =>
                            prev.filter((f) => f.id !== item.data.id),
                          );
                          setStatus("Saved to artifacts");
                        }}
                        onError={setStatus}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="is-empty">
            <div className="is-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
            </div>
            <h2>No images yet</h2>
            <p>Enter a prompt and generate your first image.</p>
          </div>
        )}
      </main>

      {/* Detail modal */}
      {detail && detail.url && (
        <div
          className="is-detail-overlay"
          onClick={() => setDetail(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="is-detail-close"
            onClick={() => setDetail(null)}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>

          {detailIndex > 0 && (
            <button
              className="is-detail-nav is-detail-prev"
              onClick={(e) => { e.stopPropagation(); navigateDetail(-1); }}
              type="button"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
          )}
          {detailIndex < allItems.length - 1 && (
            <button
              className="is-detail-nav is-detail-next"
              onClick={(e) => { e.stopPropagation(); navigateDetail(1); }}
              type="button"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          )}

          <div
            className="is-detail-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="is-detail-image">
              <img
                src={detail.url}
                alt={detail.title}
                onError={() => {
                  if (detail.artifact) markBroken(detail.artifact.id);
                  setDetail(null);
                }}
              />
            </div>
            <div className="is-detail-panel">
              <h3>{detail.model}</h3>

              <div className="is-detail-badges">
                {detail.ratio && <span className="is-detail-badge">{detail.ratio}</span>}
                {detail.quality && <span className="is-detail-badge">{detail.quality}</span>}
              </div>

              <div className="is-detail-prompt-card">
                <p>{detail.prompt}</p>
              </div>

              <div className="is-detail-date">
                {new Date(detail.createdAt).toLocaleString()}
              </div>

              <div className="is-detail-actions">
                <a
                  href={detail.url}
                  download
                  className="is-detail-action-btn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Download
                </a>
                {detail.fresh && (
                  <ArtifactSaveButton
                    buildPayload={() =>
                      buildImageArtifactInput({
                        prompt: detail.fresh!.prompt,
                        model: detail.fresh!.model,
                        ratio: detail.fresh!.ratio,
                        quality: detail.fresh!.quality,
                        url: detail.fresh!.url,
                        storagePath: detail.fresh!.storagePath,
                      })
                    }
                    variant="primary"
                    saveKey={detail.fresh.id}
                    label="Save as Artifact"
                    savedLabel="Saved"
                    onSaved={(artifact) => {
                      setGallery((prev) => [artifact, ...prev]);
                      setFreshImages((prev) =>
                        prev.filter((f) => f.id !== detail.fresh!.id),
                      );
                      setStatus("Saved to artifacts");
                    }}
                    onError={setStatus}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
