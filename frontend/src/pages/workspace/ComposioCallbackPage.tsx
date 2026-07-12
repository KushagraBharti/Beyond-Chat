import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { sessionRequest } from "../../lib/sessionClient";
import { WorkspaceState } from "../../components/workspace/WorkspacePrimitives";

export function ComposioCallbackPage() {
  const { projectId, connectionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const state = searchParams.get("state");
  const status = searchParams.get("status");
  const connectedAccountId = searchParams.get("connected_account_id");
  const callbackIncomplete = !projectId || !connectionId || !state || !status;

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (callbackIncomplete) return;
    const query = new URLSearchParams({ state, status });
    if (connectedAccountId) query.set("connected_account_id", connectedAccountId);
    void sessionRequest(
      `/api/v2/product/projects/${encodeURIComponent(projectId)}/connections/${encodeURIComponent(connectionId)}/callback?${query}`,
    ).then(() => navigate("/knowledge-apps?view=apps&connected=success", { replace: true }))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "The app connection could not be completed."));
  }, [callbackIncomplete, connectedAccountId, connectionId, navigate, projectId, state, status]);

  const visibleError = callbackIncomplete ? "The app connection callback is incomplete." : error;

  return (
    <section className="workspace-page">
      <WorkspaceState state={visibleError ? "error" : "loading"}>
        {visibleError ?? "Completing the secure app connection…"}
      </WorkspaceState>
    </section>
  );
}
