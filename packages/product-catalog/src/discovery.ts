import { serializeCanonical } from "@beyond/contracts";
import type { AgentManifest, CapabilityId, DiscoveryItem, DiscoveryResult, ParsedInvocation, ReferenceKind, TypedIntent } from "./types.ts";

const normalize = (value: string): string => value.trim().toLocaleLowerCase().replace(/^[/@#]+/, "").replace(/\s+/g, " ");
const valuesFor = (item: DiscoveryItem): readonly string[] => Object.freeze([item.label, ...item.aliases].map(normalize));

export function assertNoAliasCollisions(items: readonly DiscoveryItem[]): void {
  const seen = new Map<string, string>();
  for (const item of items) for (const alias of valuesFor(item)) {
    const key = `${item.kind}:${alias}`;
    const previous = seen.get(key);
    if (previous && previous !== item.id) throw new Error(`Alias collision for ${key}: ${previous}, ${item.id}`);
    seen.set(key, item.id);
  }
}

function inScope(item: DiscoveryItem, scope?: DiscoveryItem["scope"]): boolean {
  if (!item.scope) return true;
  return (!item.scope.organization_id || item.scope.organization_id === scope?.organization_id)
    && (!item.scope.project_id || item.scope.project_id === scope?.project_id);
}

function score(item: DiscoveryItem, query: string): number | undefined {
  const q = normalize(query);
  if (!q) return 100;
  const candidates = valuesFor(item);
  if (candidates.some((value) => value === q)) return 0;
  if (candidates.some((value) => value.startsWith(q))) return 10;
  if (candidates.some((value) => value.includes(q))) return 20;
  const terms = q.split(" ");
  if (terms.every((term) => candidates.some((value) => value.includes(term)))) return 30;
  return undefined;
}

function keyboard(item: DiscoveryItem): DiscoveryResult["keyboard"] {
  const selectable = item.state === "ready";
  return Object.freeze({
    key: item.id, aria_label: `${item.label}: ${item.state === "ready" ? "available" : item.state_reason ?? item.state}`,
    shortcut_hint: item.intent === "browse" ? "ArrowRight" : "Enter",
    selection_behavior: selectable ? (item.intent === "browse" ? "open_browser" : "insert_chip") : item.state === "approval_required" ? "request_approval" : "unavailable",
    is_selectable: selectable,
  });
}

export function queryDiscovery(items: readonly DiscoveryItem[], query: string, scope?: DiscoveryItem["scope"]): readonly DiscoveryResult[] {
  const matches = items.flatMap((item) => {
    if (!inScope(item, scope)) return [];
    const itemScore = score(item, query);
    return itemScore === undefined ? [] : [{ ...item, score: itemScore, keyboard: keyboard(item) }];
  });
  return Object.freeze(matches.sort((left, right) => left.score - right.score || left.label.localeCompare(right.label) || left.id.localeCompare(right.id)));
}

function resolve(items: readonly DiscoveryItem[], raw: string, allowedKinds?: readonly ReferenceKind[]): TypedIntent | undefined {
  const token = normalize(raw);
  const matches = items.filter((item) => (!allowedKinds || allowedKinds.includes(item.kind)) && valuesFor(item).includes(token));
  if (matches.length === 0) return undefined;
  if (matches.length > 1) return Object.freeze({ intent: matches[0].intent, reference_kind: matches[0].kind, raw, state: "disabled", ambiguity: Object.freeze(matches.map((item) => item.id).sort()) });
  const item = matches[0];
  return Object.freeze({ intent: item.intent, reference_kind: item.kind, stable_id: item.id, raw, state: item.state });
}

/** Parses discovery syntax into inert typed intents. It does not authorize, execute, or connect anything. */
export function parseInvocation(input: string, items: readonly DiscoveryItem[]): ParsedInvocation {
  const intents: TypedIntent[] = [];
  const errors: { raw: string; code: "unknown" | "ambiguous" | "invalid_reference" }[] = [];
  const add = (raw: string, allowedKinds?: readonly ReferenceKind[]) => {
    const intent = resolve(items, raw, allowedKinds);
    if (!intent) { errors.push({ raw, code: "unknown" }); return; }
    if (intent.ambiguity) { errors.push({ raw, code: "ambiguous" }); return; }
    intents.push(intent);
  };
  const tokens: { readonly index: number; readonly raw: string; readonly kinds?: readonly ReferenceKind[] }[] = [];
  const namespaces: Readonly<Record<string, ReferenceKind>> = Object.freeze({ agent: "agent", skill: "skill", app: "app", mcp: "mcp_tool", project: "project", file: "file", source: "source", model: "model" });
  for (const match of input.matchAll(/(^|\s)\/([a-z][\w-]*)(?:\s+([a-z0-9][\w.-]*))?/gi)) {
    const name = match[2].toLocaleLowerCase();
    const kind = namespaces[name];
    tokens.push({ index: match.index + match[1].length, raw: kind && match[3] ? match[3] : name, kinds: kind && match[3] ? [kind] : undefined });
  }
  for (const match of input.matchAll(/(^|\s)@([a-z][\w-]*)/gi)) tokens.push({ index: match.index + match[1].length, raw: match[2], kinds: ["agent"] });
  for (const match of input.matchAll(/(^|\s)#(?:(project|source|file):)?([\w.-]+)(?=$|\s|[.,!?])/gi)) {
    const kind = match[2] as "project" | "source" | "file" | undefined;
    tokens.push({ index: match.index + match[1].length, raw: match[3], kinds: kind ? [kind] : ["project", "source", "file"] });
  }
  for (const match of input.matchAll(/(^|\s)#(project|source|file):(?=\s|$)/gi)) errors.push({ raw: match[0].trim(), code: "invalid_reference" });
  for (const token of tokens.sort((left, right) => left.index - right.index)) add(token.raw, token.kinds);
  return Object.freeze({ input, intents: Object.freeze(intents), errors: Object.freeze(errors) });
}

export function serializeDiscovery(value: readonly DiscoveryResult[] | ParsedInvocation): string {
  return serializeCanonical(value);
}

export function isCapabilityAllowed(agent: AgentManifest, capability: CapabilityId): boolean {
  return agent.allowed_capabilities.includes(capability);
}
