import RunStudioWorkspace from "../../components/RunStudioWorkspace";

const researchPresets = [
  {
    label: "Citrus cold brew market",
    prompt:
      "Research the market for citrus-forward cold brew and seasonal ready-to-drink coffee. Compare competitor positioning, likely buyer motivations, pricing signals, channel patterns, and risks for a Starbucks summer pilot. Include a cited synthesis, competitor matrix, and opportunity/risk matrix from live sources.",
  },
  {
    label: "Competitor matrix",
    prompt:
      "Find current source-backed examples of seasonal coffee, ready-to-drink coffee, and citrus-forward beverage launches. Build a competitor matrix covering positioning, audience, price cues, channel, source URL, and implication for Starbucks.",
  },
  {
    label: "Risk scan",
    prompt:
      "Research the main product, brand, supply-chain, and consumer adoption risks for launching a citrus cold brew beverage in Summer 2026. Cite sources and rank each risk by likelihood, impact, and mitigation.",
  },
];

export default function ResearchPage() {
  return (
    <RunStudioWorkspace
      studio="research"
      eyebrow="Research Studio"
      title="Structured research with visible steps"
      description="A long-running research workflow with prompt input, tool runner timeline, structured markdown output, and visible sources."
      promptPlaceholder="Investigate the current state of campus AI tooling, summarize the strongest opportunities, and cite recent sources."
      promptPresets={researchPresets}
    />
  );
}
