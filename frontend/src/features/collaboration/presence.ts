import { useEffect, useState } from "react";
import { sessionRequest } from "../../lib/sessionClient";
import type { ProductRecordSummary } from "../workspace/api";
import type { CollaboratorView } from "./model";

function initials(name: string): string {
  const local = name.includes("@") ? name.split("@")[0] : name;
  return local.split(/[._\s-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

export function useOutputPresence(projectId: string | null, outputId: string | null): readonly CollaboratorView[] {
  const [collaborators, setCollaborators] = useState<CollaboratorView[]>([]);

  useEffect(() => {
    if (!projectId || !outputId) {
      setCollaborators([]);
      return;
    }
    let stopped = false;
    const base = `/api/v2/product/projects/${encodeURIComponent(projectId)}/outputs/${encodeURIComponent(outputId)}/realtime-hints`;
    const heartbeat = async () => {
      await sessionRequest(base, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ state: "active", reason: "Reviewing output" }),
      }).catch(() => undefined);
    };
    const refresh = async () => {
      const response = await sessionRequest<{ items: ProductRecordSummary[] }>(base).catch(() => ({ items: [] }));
      if (stopped) return;
      setCollaborators(response.items.map((item) => {
        const name = String(item.payload["actor_name"] ?? "Organization member");
        return { id: String(item.payload["actor_id"] ?? item.created_by ?? item.id), name, initials: initials(name), state: "active", location: String(item.payload["reason"] ?? "Output") };
      }));
    };
    void heartbeat().then(refresh);
    const timer = window.setInterval(() => { void heartbeat().then(refresh); }, 20_000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [projectId, outputId]);

  return collaborators;
}
