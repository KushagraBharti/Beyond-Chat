import { createHash } from "node:crypto";
import { canonicalId, type EventEnvelope, type JsonObject } from "@beyond/contracts";
import { createOpenRouterPiRuntime, type AdapterScope } from "@beyond/pi-runtime-adapter";

const input = JSON.parse(await new Response(process.stdin).text()) as {
  prompt: string;
  model?: string;
  organization_id?: string;
  project_id?: string;
  run_id?: string;
};

const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32);
const runId = canonicalId("run", hash(input.run_id ?? crypto.randomUUID()));
const scope: AdapterScope = {
  organization_id: canonicalId("org", hash(input.organization_id ?? "beyond-production")),
  project_id: canonicalId("prj", hash(input.project_id ?? "general")),
  thread_id: canonicalId("thr", hash(runId)),
  run_id: runId,
  actor: { type: "agent", id: canonicalId("act", hash(`general:${runId}`)) },
  correlation_id: canonicalId("cor", hash(`correlation:${runId}`)),
};
const emptyManifest = {
  uri: "data:application/json;base64,e30=",
  digest: "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
  media_type: "application/json",
  byte_size: 2,
};
const runtime = createOpenRouterPiRuntime(scope, {
  workingSetManifest: emptyManifest,
  runtimeImageDigest: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  providerMetadata: { provider: "modal", mode: "production" } as JsonObject,
}, process.env.OPENROUTER_API_KEY ?? "", input.model);

const events: EventEnvelope[] = [];
for await (const event of runtime.start({ prompt: input.prompt })) events.push(event);
const completed = [...events].reverse().find((event) => event.event_type === "message.completed");
const content = Array.isArray(completed?.payload.content) ? completed.payload.content : [];
const text = content
  .filter((part): part is { type: "text"; text: string } => Boolean(part) && typeof part === "object" && part.type === "text" && typeof part.text === "string")
  .map((part) => part.text)
  .join("\n");
process.stdout.write(JSON.stringify({ run_id: runId, text, events }));
