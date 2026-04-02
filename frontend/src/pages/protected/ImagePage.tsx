import { useEffect, useState } from "react";
import ArtifactSaveButton from "../../components/ArtifactSaveButton";
import { createRun, listArtifacts, type ArtifactRecord } from "../../lib/api";
import { buildImageArtifactInput } from "../../lib/artifactDrafts";
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

interface FreshImage {
  id: string;
  url: string;
  prompt: string;
  storagePath: string;
  model: string;
  ratio: string;
  style: string;
  quality: string;
}

export default function ImagePage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(imageModels[0].value);
  const [ratio, setRatio] = useState("1:1");
  const [style, setStyle] = useState("Editorial");
  const [quality, setQuality] = useState("High");
  const [gallery, setGallery] = useState<ArtifactRecord[]>([]);
  const [freshImages, setFreshImages] = useState<FreshImage[]>([]);
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
    setFreshImages([]);
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
      const enhancedPrompt = (run.output?.enhanced_prompt as string | undefined) ?? prompt;
      const paths = (run.output?.paths as string[] | undefined) ?? [];
      setFreshImages(
        urls.map((url, index) => ({
          id: `${run.id}-${index}`,
          url,
          prompt: enhancedPrompt,
          storagePath: paths[index] ?? "",
          model,
          ratio,
          style,
          quality,
        })),
      );
      setStatus(urls.length ? `Done — ${urls.length} image(s) ready to save` : "No images returned.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Image generation failed.");
    } finally {
      setLoading(false);
    }
  };

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
              <p>Fresh results stay separate until you explicitly save them as artifacts.</p>
            </div>
            <StatusBadge
              status={freshImages.length || gallery.length ? "connected" : "disconnected"}
              label={`${freshImages.length + gallery.length} image${freshImages.length + gallery.length === 1 ? "" : "s"}`}
            />
          </div>

          {freshImages.length || gallery.length ? (
            <div className="stack-sm">
              {freshImages.length ? (
                <>
                  <strong>Fresh outputs</strong>
                  <div className="image-gallery-grid">
                    {freshImages.map((item) => (
                      <div key={item.id} className="image-gallery-card">
                        <div className="image-gallery-preview">
                          <img
                            src={item.url}
                            alt={item.prompt}
                            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                          />
                        </div>
                        <strong>{item.prompt.slice(0, 60) || "Generated image"}</strong>
                        <p>Not saved yet</p>
                        <ArtifactSaveButton
                          buildPayload={() =>
                            buildImageArtifactInput({
                              prompt: item.prompt,
                              model: item.model,
                              ratio: item.ratio,
                              style: item.style,
                              quality: item.quality,
                              url: item.url,
                              storagePath: item.storagePath,
                            })
                          }
                          variant="primary"
                          saveKey={item.id}
                          onSaved={(artifact) => {
                            setGallery((prev) => [artifact, ...prev]);
                            setFreshImages((prev) => prev.filter((entry) => entry.id !== item.id));
                            setStatus("Saved as artifact");
                          }}
                          onError={setStatus}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {gallery.length ? (
                <>
                  <strong>Saved gallery</strong>
                  <div className="image-gallery-grid">
                    {gallery.map((item) => (
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
                </>
              ) : null}
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
