import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScopedDiscovery } from "../../features/discovery/useScopedDiscovery";
import { savePromotionDraft } from "../../features/workspace/adapter";
import { PageHeader, WorkspaceState } from "../../components/workspace/WorkspacePrimitives";
import { WorkspaceComposer } from "../../components/workspace/WorkspaceComposer";

export function ChatWorkspacePage() {
  const navigate = useNavigate();
  const [disconnected, setDisconnected] = useState(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const discovery = useScopedDiscovery();
  return <section className="workspace-page workspace-chat-page">
    <PageHeader eyebrow="Chat" title="Ask, explore, then make it durable."><button className="workspace-button is-quiet" type="button" onClick={() => setDisconnected((value) => !value)}>{disconnected ? "Return to local draft" : "Show reconnect state"}</button></PageHeader>
    {disconnected ? <WorkspaceState state="disconnected">Your draft stays in this browser. Sending and promotion are unavailable until a future run service reconnects.</WorkspaceState> : null}
    <div className="workspace-chat-thread"><div className="workspace-message is-agent"><b>General</b><p>I can shape a request, attach context, or help you promote it into a task when it needs a plan, tools, approvals, or durable outputs.</p></div></div>
    <WorkspaceComposer ref={composer} items={discovery} disabled={disconnected} onBrowse={navigate} onPromote={(draft) => { savePromotionDraft(draft); navigate("/work/new"); }} />
    <p className="workspace-footnote">Promotion is a local client-state handoff only. It does not start a run or claim that work completed.</p>
  </section>;
}
