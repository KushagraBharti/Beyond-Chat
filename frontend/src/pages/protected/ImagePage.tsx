import { useEffect, useState } from "react";
import { createRun, listArtifacts, type ArtifactRecord } from "../../lib/api";
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
  { value: "openrouter-images/default", label: "OpenRouter Image Adapter", available: false },
  { value: "gpt-image-1", label: "GPT Image", available: false },
  { value: "nano-banana-pro", label: "Nano Banana Pro", available: false },
  { value: "seedance-v1", label: "Seedance v1", available: false },
];

export default function ImagePage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(imageModels[0].value);
  const [ratio, setRatio] = useState("16:9");
  const [style, setStyle] = useState("Editorial");
  const [quality, setQuality] = useState("High");
  const [gallery, setGallery] = useState<ArtifactRecord[]>([]);
  const [status, setStatus] = useState("Disconnected-safe shell");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await listArtifacts({ studio: "image", limit: 24 });
        if (active) {
          setGallery(response.items);
        }
      } catch {
        if (active) {
          setStatus("Could not load image history.");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await createRun({
        studio: "image",
        title: "Image generation",
        prompt,
        model,
        options: {
          ratio,
          style,
          quality,
        },
      });
      setStatus(response.run.error_message ?? response.run.status);
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
            <PrimaryButton type="button" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating..." : "Generate"}
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
            <StatusBadge status="disconnected" label={status} />
          </div>

          <div className="stack-sm">
            <FieldLabel>Prompt</FieldLabel>
            <TextArea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the image you want to generate..." />
          </div>

          <div className="stack-sm">
            <FieldLabel>Model</FieldLabel>
            <Select value={model} onChange={(event) => setModel(event.target.value)}>
              {imageModels.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label} {entry.available ? "" : "(Coming soon)"}
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
              <p>History stays visible even when the provider is not configured yet.</p>
            </div>
            <StatusBadge status={gallery.length ? "connected" : "disconnected"} label={`${gallery.length} saved`} />
          </div>

          {gallery.length ? (
            <div className="image-gallery-grid">
              {gallery.map((item) => (
                <div key={item.id} className="image-gallery-card">
                  <div className="image-gallery-preview" />
                  <strong>{item.title}</strong>
                  <p>{item.summary ?? item.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No generated images yet"
              body="The studio still renders all controls and history surfaces before the provider is configured."
            />
          )}
        </MotionCard>
      </div>
    </div>
  );
}
