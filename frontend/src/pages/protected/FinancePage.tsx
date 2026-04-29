import RunStudioWorkspace from "../../components/RunStudioWorkspace";

export default function FinancePage() {
  return (
    <RunStudioWorkspace
      studio="finance"
      eyebrow="Finance Studio"
      title="Finance workflows with agent-style steps"
      description="Finance uses the same run system as research, but shapes prompts and outputs toward market, company, and investment-style analysis."
      promptPlaceholder="Research current AI infrastructure companies, compare risks, and produce a concise financial briefing with key catalysts."
      suggestedStudio="data"
    />
  );
}
