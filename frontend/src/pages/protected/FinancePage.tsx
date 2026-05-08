import RunStudioWorkspace from "../../components/RunStudioWorkspace";

const financePresets = [
  {
    label: "SBUX pilot case",
    prompt:
      "Using SBUX public-company context, our pilot assumptions, and public competitor context, assess whether Cinder Orange Cold Brew is financially credible. Compare Starbucks against relevant beverage and coffee peers, then include price, gross margin, break-even units, cannibalization risk, and what management would need to believe. Use SBUX as the core company context and frame BROS, DNUT, MCD, KO, PEP, and MNST as imperfect but useful public reference points for pricing power, beverage demand, gross margin expectations, and channel strategy.",
  },
  {
    label: "Peer memo",
    prompt:
      "Build a public-company peer memo for SBUX using BROS, DNUT, MCD, KO, PEP, and MNST as reference points. Focus on revenue quality, margin profile, pricing power, balance-sheet risk, and what each peer implies for a new beverage pilot.",
  },
  {
    label: "Sensitivity table",
    prompt:
      "Create a sensitivity analysis for a 400-store beverage pilot. Include price, gross margin, daily units, cannibalization, break-even units, downside case, base case, upside case, and the decision rule management should use.",
  },
];

export default function FinancePage() {
  return (
    <RunStudioWorkspace
      studio="finance"
      eyebrow="Dexter Finance Studio"
      title="Dexter Finance Desk"
      description="Run company, market, filing, valuation, and screening work through Dexter's sandboxed analyst workflow, with the final memo, assumptions, sources, and tool trace preserved."
      promptPlaceholder="Analyze AAPL revenue quality, margin durability, valuation risks, and the catalysts to watch."
      suggestedStudio="data"
      promptPresets={financePresets}
    />
  );
}
