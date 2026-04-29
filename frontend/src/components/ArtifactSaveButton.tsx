import { useEffect, useState } from "react";
import { createArtifact, type ArtifactRecord, type CreateArtifactInput } from "../lib/api";
import { PrimaryButton, SecondaryButton } from "./protectedUi";

export default function ArtifactSaveButton({
  buildPayload,
  disabled = false,
  label = "Save as Artifact",
  savingLabel = "Saving...",
  savedLabel = "Saved",
  variant = "secondary",
  saveKey,
  disableAfterSave = true,
  onSaved,
  onError,
}: {
  buildPayload: () => CreateArtifactInput | null;
  disabled?: boolean;
  label?: string;
  savingLabel?: string;
  savedLabel?: string;
  variant?: "primary" | "secondary";
  saveKey?: string;
  disableAfterSave?: boolean;
  onSaved?: (artifact: ArtifactRecord) => void;
  onError?: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(false);
  }, [saveKey]);

  const ButtonComponent = variant === "primary" ? PrimaryButton : SecondaryButton;

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) {
      return;
    }

    setSaving(true);
    try {
      const response = await createArtifact(payload);
      setSaved(true);
      onSaved?.(response.artifact);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Could not save artifact.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ButtonComponent
      type="button"
      onClick={() => void handleSave()}
      disabled={disabled || saving || (disableAfterSave && saved)}
    >
      {saving ? savingLabel : saved ? savedLabel : label}
    </ButtonComponent>
  );
}
