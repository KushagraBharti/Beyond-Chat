import { DemoAgentBuilderAdapter, type AgentBuilderAdapter } from "./adapter";
import type { BuilderDraftView, DirectoryAgent } from "./model";
import { sessionRequest } from "../../lib/sessionClient";
import { executeGeneralAgent, listOrganizationRecent, type ProductRecordSummary } from "../workspace/api";

export class LiveAgentBuilderAdapter extends DemoAgentBuilderAdapter implements AgentBuilderAdapter {
  constructor(private readonly projectId: string) { super(); }

  override async test(draft: BuilderDraftView, input: string): Promise<string> {
    if (!draft.instructions.trim() || !input.trim()) throw new Error("Instructions and a test input are required.");
    const result = await executeGeneralAgent({
      projectId: this.projectId,
      prompt: `Act as ${draft.name}. Instructions:\n${draft.instructions}\n\nTest input:\n${input}`,
    });
    return result.text;
  }

  override async publish(draft: BuilderDraftView, audience: string): Promise<{ version: string; contentHash: string }> {
    if (!draft.name.trim() || !draft.instructions.trim()) throw new Error("Name and instructions are required.");
    const created = await sessionRequest<ProductRecordSummary>(
      `/api/v2/product/projects/${encodeURIComponent(this.projectId)}/agents/drafts`,
      {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          configuration: { ...draft, audience },
        }),
      },
    );
    const published = await sessionRequest<ProductRecordSummary>(
      `/api/v2/product/projects/${encodeURIComponent(this.projectId)}/agents/drafts/${encodeURIComponent(created.id)}/publish`,
      { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } },
    );
    return { version: String(published.version), contentHash: published.id };
  }

  override async search(query: string): Promise<readonly DirectoryAgent[]> {
    const response = await listOrganizationRecent("agents", 100);
    const needle = query.trim().toLowerCase();
    return response.items.filter((record) => {
      const manifest = (record.payload["manifest"] ?? {}) as Record<string, unknown>;
      return !needle || String(manifest["name"] ?? "").toLowerCase().includes(needle);
    }).map((record) => {
      const manifest = (record.payload["manifest"] ?? {}) as Record<string, unknown>;
      return {
        id: record.id,
        name: String(manifest["name"] ?? "Organization agent"),
        description: String(manifest["description"] ?? ""),
        category: "Organization",
        version: String(record.version),
        audience: String(((manifest["configuration"] ?? {}) as Record<string, unknown>)["audience"] ?? "Organization"),
        favorite: false,
        runs: 0,
        uniqueUsers: 0,
      };
    });
  }
}
