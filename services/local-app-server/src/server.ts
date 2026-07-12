import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import { ContractError, type CommandEnvelope, type EventEnvelope } from "@beyond/contracts";
import { LocalAppServerCore, PROTOCOL_VERSION } from "./protocol.ts";
import { AppendOnlyStore } from "./store.ts";
import { defaultOfflinePiRuntimeFactory } from "./pi-runtime.ts";

async function readJson(request: IncomingMessage): Promise<unknown> {
  let body = "";
  for await (const chunk of request) body += chunk;
  try { return JSON.parse(body); }
  catch { throw new ContractError("validation.invalid_envelope", "Malformed JSON request"); }
}

function errorStatus(error: unknown): number {
  if (!(error instanceof ContractError)) return 500;
  if (error.code === "idempotency.conflict" || error.code === "concurrency.version_conflict") return 409;
  if (error.code === "schema.unsupported_version") return 426;
  if (error.code === "checkpoint.unavailable") return 404;
  return 400;
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(value));
}

function writeSse(response: ServerResponse, event: EventEnvelope): void {
  response.write(`id: ${event.sequence}\nevent: ${event.event_type}\ndata: ${JSON.stringify(event)}\n\n`);
}

export function createLocalHttpServer(core: LocalAppServerCore, heartbeatMs = 15_000): Server {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://local");
      const version = request.headers["x-beyond-protocol-version"]?.toString() ?? PROTOCOL_VERSION;
      if (request.method === "POST" && url.pathname === "/v1/commands") {
        const result = await core.command(version, await readJson(request) as CommandEnvelope);
        sendJson(response, 202, result); return;
      }
      const match = /^\/v1\/runs\/([^/]+)\/(events|snapshot)$/u.exec(url.pathname);
      if (match?.[2] === "snapshot" && request.method === "GET") { sendJson(response, 200, core.snapshot(version, match[1])); return; }
      if (match?.[2] === "events" && request.method === "GET") {
        const headerCursor = request.headers["last-event-id"]?.toString();
        const after = Number(headerCursor ?? url.searchParams.get("after") ?? 0);
        core.replay(version, match[1], after);
        response.statusCode = 200;
        response.setHeader("content-type", "text/event-stream");
        response.setHeader("cache-control", "no-cache");
        response.setHeader("connection", "keep-alive");
        response.flushHeaders();
        const unsubscribe = core.subscribe(version, match[1], after, (event) => writeSse(response, event));
        const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), heartbeatMs);
        heartbeat.unref();
        const cleanup = () => { clearInterval(heartbeat); unsubscribe(); };
        request.once("close", cleanup); response.once("close", cleanup);
        return;
      }
      sendJson(response, 404, { error: "not_found" });
    } catch (error) {
      sendJson(response, errorStatus(error), { error: error instanceof Error ? error.message : String(error), code: error instanceof ContractError ? error.code : "internal.unexpected" });
    }
  });
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  const core = new LocalAppServerCore(
    new AppendOnlyStore(resolve(process.env.BEYOND_LOCAL_STORE ?? ".data/events.sqlite")),
    defaultOfflinePiRuntimeFactory,
  );
  await core.init();
  const server = createLocalHttpServer(core);
  server.listen(Number(process.env.PORT ?? 8787), "127.0.0.1", () => console.log(`Beyond local app server ${PROTOCOL_VERSION} listening`));
}
