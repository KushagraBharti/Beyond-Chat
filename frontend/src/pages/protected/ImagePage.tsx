import { useEffect, useState } from "react";
import { createArtifact, createRun, listArtifacts, type ArtifactRecord } from "../../lib/api";
import {
  EmptyState,
  FieldLabel,
  MotionCard,
  PageSection,
  PrimaryButton,
  Select,
  StatusBadge,
  TextArea,
} from "../../components/protectedUi";

const imageModels = [
  { value: "openai/dall-e-3", label: "DALL-E 3" },
  { value: "openai/gpt-image-1", label: "GPT Image 1" },
  { value: "black-forest-labs/flux-1.1-pro", label: "Flux 1.1 Pro" },
  { value: "stability/stable-diffusion-3.5-large", label: "Stable Diffusion 3.5" },
];

export default function ImagePage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(imageModels[0].value);
  const [ratio, setRatio] = useState("1:1");
  const [style, setStyle] = useState("Editorial");
  const [quality, setQuality] = useState("High");
  const [gallery, setGallery] = useState<ArtifactRecord[]>([]);
  const [freshUrls, setFreshUrls] = useState<string[]>([]);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await listArtifacts({ studio: "image", limit: 24 });
        if (active) setGallery(response.items);
      } catch {
        if (active) setStatus("Could not load image history.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setStatus("Running…");
    setFreshUrls([]);
    try {
      const response = await createRun({
        studio: "image",
        title: prompt.slice(0, 60) || "Image generation",
        prompt,
        model,
        options: { ratio, style, quality },
      });

      const run = response.run;
      if (run.status === "failed") {
        setStatus(run.error_message ?? "Generation failed.");
        return;
      }

      const urls = (run.output?.urls as string[] | undefined) ?? [];
      setFreshUrls(urls);
      setStatus(`Done — ${urls.length} image(s) generated`);

      // Persist each image as an artifact so it appears in the gallery
      if (urls.length > 0) {
        const enhancedPrompt = (run.output?.enhanced_prompt as string | undefined) ?? prompt;
        const paths = (run.output?.paths as string[] | undefined) ?? [];
        const saved = await Promise.allSettled(
          urls.map((url, i) =>
            createArtifact({
              title: prompt.slice(0, 60) || "Generated image",
              type: "image",
              studio: "image",
              content: enhancedPrompt,
              summary: `Generated with ${model}`,
              content_format: "plain",
              preview_image: url,
              metadata: { model, ratio, style, quality, storage_path: paths[i] ?? "" },
              tags: ["generated", style.toLowerCase()],
            }),
          ),
        );
        const newArtifacts = saved
          .filter((r): r is PromiseFulfilledResult<{ artifact: ArtifactRecord }> => r.status === "fulfilled")
          .map((r) => r.value.artifact);
        setGallery((prev) => [...newArtifacts, ...prev]);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Image generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const allImages = [
    ...freshUrls.map((url) => ({ id: `fresh-${url}`, previewImage: url, title: prompt, summary: null })),
    ...gallery,
  ];

  return (
    <div className="page-wrap">
      <PageSection
        eyebrow="Image Studio"
        title="Prompt, model selection, and gallery history"
        description="The left rail handles prompt + model options, while the main stage keeps all created images visible as a library-style grid."
        actions={
          <div className="inline-actions">
            <PrimaryButton type="button" onClick={handleGenerate} disabled={loading || !prompt.trim()}>
              {loading ? "Generating…" : "Generate"}
            </PrimaryButton>
          </div>
        }
      />

      <div className="studio-layout image-layout">
        <MotionCard className="image-options-card">
          <div className="context-builder-head">
            <div>
              <h3>Prompt Rail</h3>
              <p>Model selection, aspect ratio, style presets, and quality controls.</p>
            </div>
            <StatusBadge status={loading ? "disconnected" : "connected"} label={status} />
          </div>

          <div className="stack-sm">
            <FieldLabel>Prompt</FieldLabel>
            <TextArea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the image you want to generate…"
            />
          </div>

          <div className="stack-sm">
            <FieldLabel>Model</FieldLabel>
            <Select value={model} onChange={(event) => setModel(event.target.value)}>
              {imageModels.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="stack-sm">
            <FieldLabel>Aspect ratio</FieldLabel>
            <Select value={ratio} onChange={(event) => setRatio(event.target.value)}>
              {["1:1", "4:5", "16:9", "9:16"].map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </div>

          <div className="stack-sm">
            <FieldLabel>Quality</FieldLabel>
            <Select value={quality} onChange={(event) => setQuality(event.target.value)}>
              {["Draft", "High", "Ultra"].map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </div>

          <div className="stack-sm">
            <FieldLabel>Style preset</FieldLabel>
            <Select value={style} onChange={(event) => setStyle(event.target.value)}>
              {["Editorial", "Animated", "Gothic", "Product", "Cinematic"].map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </div>
        </MotionCard>

        <MotionCard>
          <div className="context-builder-head">
            <div>
              <h3>Generated gallery</h3>
              <p>History stays visible even between sessions.</p>
            </div>
            <StatusBadge
              status={allImages.length ? "connected" : "disconnected"}
              label={`${allImages.length} image${allImages.length === 1 ? "" : "s"}`}
            />
          </div>

          {allImages.length ? (
            <div className="image-gallery-grid">
              {allImages.map((item) => (
                <div key={item.id} className="image-gallery-card">
                  <div className="image-gallery-preview">
                    {item.previewImage ? (
                      <img
                        src={item.previewImage}
                        alt={item.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                      />
                    ) : null}
                  </div>
                  <strong>{item.title}</strong>
                  <p>{item.summary ?? ""}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No generated images yet"
              body="Enter a prompt and click Generate to create your first image."
            />
          )}
        </MotionCard>
      </div>
    </div>
  );
}
