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

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const state = searchParams.get("state");
    const status = searchParams.get("status");
    const connectedAccountId = searchParams.get("connected_account_id");
    if (!projectId || !connectionId || !state || !status) {
      setError("The app connection callback is incomplete.");
      return;
    }
    const query = new URLSearchParams({ state, status });
    if (connectedAccountId) query.set("connected_account_id", connectedAccountId);
    void sessionRequest(
      `/api/v2/product/projects/${encodeURIComponent(projectId)}/connections/${encodeURIComponent(connectionId)}/callback?${query}`,
    ).then(() => navigate("/knowledge-apps?view=apps&connected=success", { replace: true }))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "The app connection could not be completed."));
  }, [connectionId, navigate, projectId, searchParams]);

  return (
    <section className="workspace-page">
      <WorkspaceState state={error ? "error" : "loading"}>
        {error ?? "Completing the secure app connection…"}
      </WorkspaceState>
    </section>
  );
}
