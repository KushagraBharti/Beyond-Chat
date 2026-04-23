import RunStudioWorkspace from "../../components/RunStudioWorkspace";

export default function FinancePage() {
  return (
    <RunStudioWorkspace
      studio="finance"
      eyebrow="Dexter Finance Studio"
      title="Dexter financial research agent"
      description="Ask Dexter for company, market, filing, valuation, and screening work. Runs execute in a sandbox and return the final memo plus tool trace."
      promptPlaceholder="Analyze AAPL revenue, margins, valuation risks, and the key catalysts to watch."
    />
  );
}
