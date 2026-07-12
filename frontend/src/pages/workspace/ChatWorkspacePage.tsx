import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScopedDiscovery } from "../../features/discovery/useScopedDiscovery";
import { savePromotionDraft, type PromotionDraft } from "../../features/workspace/adapter";
import { PageHeader, WorkspaceState } from "../../components/workspace/WorkspacePrimitives";
import { WorkspaceComposer } from "../../components/workspace/WorkspaceComposer";
import { cancelGeneralAgentRun, executeGeneralAgent, replayGeneralAgentRun } from "../../features/workspace/api";
import { useProjects } from "../../features/workspace/ProjectContext";

interface ChatMessage { role: "user" | "agent" | "error"; text: string }

export function ChatWorkspacePage() {
  const navigate = useNavigate();
  const composer = useRef<HTMLTextAreaElement>(null);
  const discovery = useScopedDiscovery();
  const { currentProject } = useProjects();
  const [running, setRunning] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const reconnect = async () => {
    if (!currentProject) return;
    const key = `beyond.last-chat-run.${currentProject.id}`;
    const runId = sessionStorage.getItem(key);
    if (!runId) return;
    const { events } = await replayGeneralAgentRun(runId);
    const savedPrompt = sessionStorage.getItem(`${key}.prompt`);
    const output = [...events].reverse().find((event) => event.event_type === "output.generated");
    const failure = [...events].reverse().find((event) => event.event_type === "run.failed");
    const text = typeof output?.payload.text === "string" ? output.payload.text : "";
    setMessages([
      ...(savedPrompt ? [{ role: "user" as const, text: savedPrompt }] : []),
      ...(text ? [{ role: "agent" as const, text }] : failure ? [{ role: "error" as const, text: "The durable run failed. You can retry the request." }] : []),
    ]);
  };
  useEffect(() => {
    if (!currentProject) return;
    const key = `beyond.last-chat-run.${currentProject.id}`;
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
        { role: "agent", text },
      ]);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [currentProject]);
  const runGeneral = async (draft: PromotionDraft) => {
    if (!currentProject || running) return;
    const referenceContext = draft.references.length ? `\n\nAttached context: ${draft.references.map((item) => item.label).join(", ")}` : "";
    setMessages((current) => [...current, { role: "user", text: draft.prompt }]);
    setRunning(true);
    const runId = crypto.randomUUID();
    const key = `beyond.last-chat-run.${currentProject.id}`;
    sessionStorage.setItem(key, runId);
    sessionStorage.setItem(`${key}.prompt`, draft.prompt);
    setActiveRunId(runId);
    try {
      const result = await executeGeneralAgent({ prompt: `${draft.prompt}${referenceContext}`, projectId: currentProject.id, runId });
      setMessages((current) => [...current, { role: "agent", text: result.text }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "error", text: error instanceof Error ? error.message : "The General Agent could not complete this run." }]);
    } finally {
      setRunning(false);
      setActiveRunId(null);
    }
  };
  return <section className="workspace-page workspace-chat-page">
    <PageHeader eyebrow="Chat" title="Ask, explore, then make it durable.">{running && activeRunId ? <button className="workspace-button is-quiet" type="button" onClick={() => { void cancelGeneralAgentRun(activeRunId).finally(() => { setRunning(false); setActiveRunId(null); void reconnect(); }); }}>Cancel run</button> : <button className="workspace-button is-quiet" type="button" disabled={!currentProject} onClick={() => { void reconnect(); }}>Reconnect last run</button>}</PageHeader>
    {!currentProject ? <WorkspaceState state="empty">Select or create a project before running General.</WorkspaceState> : null}
    <div className="workspace-chat-thread"><div className="workspace-message is-agent"><b>General</b><p>I run through the production Pi agent on Modal and return reviewable work here.</p></div>{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`workspace-message ${message.role === "user" ? "is-user" : "is-agent"}`}><b>{message.role === "user" ? "You" : message.role === "error" ? "Run failed" : "General"}</b><p>{message.text}</p></div>)}{running ? <div className="workspace-message is-agent"><b>General</b><p>Working in Modal…</p></div> : null}</div>
    <WorkspaceComposer ref={composer} items={discovery} disabled={running || !currentProject} onSend={(draft) => { void runGeneral(draft); }} onBrowse={navigate} onPromote={(draft) => { savePromotionDraft(draft); navigate("/work/new"); }} />
    <p className="workspace-footnote">General runs on the production Pi runtime in Modal. Promotion keeps a draft for a longer task.</p>
  </section>;
}
