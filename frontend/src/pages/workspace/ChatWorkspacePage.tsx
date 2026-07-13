import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScopedDiscovery } from "../../features/discovery/useScopedDiscovery";
import { savePromotionDraft, type PromotionDraft } from "../../features/workspace/adapter";
import { PageHeader, WorkspaceState } from "../../components/workspace/WorkspacePrimitives";
import { WorkspaceComposer } from "../../components/workspace/WorkspaceComposer";
import { cancelGeneralAgentRun, executeGeneralAgent, replayGeneralAgentRun, saveGeneratedOutput } from "../../features/workspace/api";
import { useProjects } from "../../features/workspace/ProjectContext";

interface ChatMessage { role: "user" | "agent" | "error"; text: string; name?: string }

function agentLabel(agentId: unknown): string {
  if (agentId === "agent.research") return "Research";
  if (agentId === "agent.finance") return "Finance";
  return "General";
}

const agentInstructions: Record<string, string> = {
  "agent.research": "Act as the Beyond Research agent. Produce evidence-led work, distinguish sourced facts from inference, and cite sources when available.",
  "agent.finance": "Act as the Beyond Finance agent. Perform careful financial analysis, state assumptions, show calculations, and distinguish sourced facts from estimates.",
};

interface ChatWorkspacePageProps {
  defaultAgentVersionId?: "agent.general" | "agent.research" | "agent.finance";
  eyebrow?: string;
  title?: string;
  intro?: string;
}

export function ChatWorkspacePage({
  defaultAgentVersionId = "agent.general",
  eyebrow = "Chat",
  title = "Ask, explore, then make it durable.",
  intro,
}: ChatWorkspacePageProps = {}) {
  const navigate = useNavigate();
  const composer = useRef<HTMLTextAreaElement>(null);
  const discovery = useScopedDiscovery();
  const { currentProject } = useProjects();
  const [running, setRunning] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [savingOutput, setSavingOutput] = useState(false);
  const [lastOutputKind, setLastOutputKind] = useState("document");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const latestAgentText = [...messages].reverse().find((message) => message.role === "agent")?.text ?? "";
  const reconnect = async () => {
    if (!currentProject) return;
    const key = `beyond.last-chat-run.${currentProject.id}.${defaultAgentVersionId}`;
    const runId = sessionStorage.getItem(key);
    if (!runId) return;
    const { events } = await replayGeneralAgentRun(runId);
    const savedPrompt = sessionStorage.getItem(`${key}.prompt`);
    const output = [...events].reverse().find((event) => event.event_type === "output.generated");
    const failure = [...events].reverse().find((event) => event.event_type === "run.failed");
    const text = typeof output?.payload.text === "string" ? output.payload.text : "";
    setMessages([
      ...(savedPrompt ? [{ role: "user" as const, text: savedPrompt }] : []),
      ...(text ? [{ role: "agent" as const, text, name: agentLabel(output?.payload.agent) }] : failure ? [{ role: "error" as const, text: "The durable run failed. You can retry the request." }] : []),
    ]);
  };
  useEffect(() => {
    if (!currentProject) return;
    const key = `beyond.last-chat-run.${currentProject.id}.${defaultAgentVersionId}`;
    const runId = sessionStorage.getItem(key);
    if (!runId) return;
    let cancelled = false;
    replayGeneralAgentRun(runId).then(({ events }) => {
      if (cancelled) return;
      const savedPrompt = sessionStorage.getItem(`${key}.prompt`);
      const output = [...events].reverse().find((event) => event.event_type === "output.generated");
      const text = typeof output?.payload.text === "string" ? output.payload.text : "";
      if (text) setMessages([
        ...(savedPrompt ? [{ role: "user" as const, text: savedPrompt }] : []),
        { role: "agent", text, name: agentLabel(output?.payload.agent) },
      ]);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [currentProject, defaultAgentVersionId]);
  const runGeneral = async (draft: PromotionDraft) => {
    if (!currentProject || running) return;
    const referenceContext = draft.references.length ? `\n\nAttached context: ${draft.references.map((item) => item.label).join(", ")}` : "";
    const selectedAgent = draft.references.find((item) => item.kind === "agent");
    const requestedOutput = draft.references.find((item) => item.kind === "output_type");
    const outputKind = requestedOutput?.label.toLowerCase() ?? "document";
    setLastOutputKind(outputKind);
    const agentVersionId = selectedAgent?.id ?? defaultAgentVersionId;
    const selectedAgentName = agentLabel(agentVersionId);
    setMessages((current) => [...current, { role: "user", text: draft.prompt }]);
    setRunning(true);
    const runId = crypto.randomUUID();
    const key = `beyond.last-chat-run.${currentProject.id}.${defaultAgentVersionId}`;
    sessionStorage.setItem(key, runId);
    sessionStorage.setItem(`${key}.prompt`, draft.prompt);
    setActiveRunId(runId);
    try {
      const result = await executeGeneralAgent({ prompt: `${draft.prompt}${referenceContext}\n\nRequested output type: ${outputKind}.`, projectId: currentProject.id, runId, agentVersionId, instructions: agentInstructions[agentVersionId] });
      setMessages((current) => [...current, { role: "agent", text: result.text, name: selectedAgentName }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "error", text: error instanceof Error ? error.message : `The ${selectedAgentName} Agent could not complete this run.` }]);
    } finally {
      setRunning(false);
      setActiveRunId(null);
    }
  };
  return <section className="workspace-page workspace-chat-page">
    <PageHeader eyebrow={eyebrow} title={title}>{running && activeRunId ? <button className="workspace-button is-quiet" type="button" onClick={() => { void cancelGeneralAgentRun(activeRunId).finally(() => { setRunning(false); setActiveRunId(null); void reconnect(); }); }}>Cancel run</button> : <button className="workspace-button is-quiet" type="button" disabled={!currentProject} onClick={() => { void reconnect(); }}>Reconnect last run</button>}</PageHeader>
    {!currentProject ? <WorkspaceState state="empty">Select or create a project before running {agentLabel(defaultAgentVersionId)}.</WorkspaceState> : null}
    <div className="workspace-chat-thread"><div className="workspace-message is-agent"><b>{agentLabel(defaultAgentVersionId)}</b><p>{intro ?? "I run through the production Pi agent on Modal and return reviewable work here."}</p></div>{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`workspace-message ${message.role === "user" ? "is-user" : "is-agent"}`}><b>{message.role === "user" ? "You" : message.role === "error" ? "Run failed" : message.name ?? agentLabel(defaultAgentVersionId)}</b><p>{message.text}</p></div>)}{running ? <div className="workspace-message is-agent"><b>{agentLabel(defaultAgentVersionId)}</b><p>Working in Modal…</p></div> : null}</div>
    {latestAgentText && currentProject ? <div className="workspace-composer-actions"><span>Keep this result as a versioned, collaborative output.</span><button type="button" className="workspace-button is-quiet" disabled={savingOutput} onClick={() => {
      setSavingOutput(true);
      const prompt = [...messages].reverse().find((message) => message.role === "user")?.text ?? "General Agent result";
      const storedRunId = sessionStorage.getItem(`beyond.last-chat-run.${currentProject.id}.${defaultAgentVersionId}`) ?? undefined;
      void saveGeneratedOutput(currentProject.id, prompt.slice(0, 80), latestAgentText, storedRunId, lastOutputKind)
        .then((record) => navigate(`/outputs/${record.id}`))
        .finally(() => setSavingOutput(false));
    }}>{savingOutput ? "Saving…" : `Save ${lastOutputKind} to Work`}</button></div> : null}
    <WorkspaceComposer ref={composer} items={discovery} disabled={running || !currentProject} runLabel={`Run ${agentLabel(defaultAgentVersionId)}`} onSend={(draft) => { void runGeneral(draft); }} onBrowse={navigate} onPromote={(draft) => { savePromotionDraft(draft); navigate("/work/new"); }} />
    <p className="workspace-footnote">{agentLabel(defaultAgentVersionId)} runs on the production Pi runtime in Modal. Promotion keeps a draft for a longer task.</p>
  </section>;
}

export const GeneralAgentWorkspacePage = () => <ChatWorkspacePage />;
export const ResearchAgentWorkspacePage = () => <ChatWorkspacePage
  defaultAgentVersionId="agent.research"
  eyebrow="Research"
  title="Research with evidence, citations, and durable outputs."
  intro="I investigate, compare sources, distinguish evidence from inference, and save reviewable work."
/>;
export const FinanceAgentWorkspacePage = () => <ChatWorkspacePage
  defaultAgentVersionId="agent.finance"
  eyebrow="Finance"
  title="Financial analysis with explicit assumptions."
  intro="I analyze companies, datasets, scenarios, and financial decisions with visible assumptions and calculations."
/>;
