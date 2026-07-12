import { describe, expect, it } from "vitest";
import { capabilityLabel, OUTPUT_CAPABILITIES } from "./capabilities";

describe("output capability truthfulness", () => {
  it("does not claim unsupported editors are available", () => {
    expect(OUTPUT_CAPABILITIES.document.edit).toBe("preview_only");
    expect(OUTPUT_CAPABILITIES.presentation.edit).toBe("preview_only");
    expect(OUTPUT_CAPABILITIES.image.edit).toBe("unsupported");
    expect(capabilityLabel("unsupported")).toBe("Not available");
  });
});
