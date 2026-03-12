import RunStudioWorkspace from "../../components/RunStudioWorkspace";

export default function ResearchPage() {
  return (
    <RunStudioWorkspace
      studio="research"
      eyebrow="Research Studio"
      title="Structured research with visible steps"
      description="A long-running research workflow with prompt input, tool runner timeline, structured markdown output, and visible sources."
      promptPlaceholder="Investigate the current state of campus AI tooling, summarize the strongest opportunities, and cite recent sources."
    />
  );
}
