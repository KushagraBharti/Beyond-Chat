import type { CapabilityState, OutputKind } from "./model";

export const OUTPUT_CAPABILITIES: Readonly<Record<OutputKind, { readonly view: CapabilityState; readonly edit: CapabilityState; readonly diff: CapabilityState }>> = {
  document: { view: "supported", edit: "preview_only", diff: "supported" },
  spreadsheet: { view: "supported", edit: "preview_only", diff: "supported" },
  presentation: { view: "supported", edit: "preview_only", diff: "supported" },
  data_chart: { view: "supported", edit: "preview_only", diff: "supported" },
  image: { view: "supported", edit: "unsupported", diff: "preview_only" },
};

export function capabilityLabel(state: CapabilityState): string {
  return state === "supported" ? "Available" : state === "preview_only" ? "Preview only" : "Not available";
}
