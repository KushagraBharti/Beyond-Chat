import { BUILT_IN_AGENTS, builtInDiscoveryItems } from "./catalog.ts";
import { isCapabilityAllowed, parseInvocation, queryDiscovery } from "./discovery.ts";
import type { DiscoveryItem } from "./types.ts";

export interface FrozenJourney {
  readonly id: string;
  readonly input?: string;
  readonly expect_intent_ids?: readonly string[];
  readonly expect_agent?: string;
  readonly expect_capability?: string;
  readonly expected_allowed?: boolean;
  readonly disconnected_item?: "app" | "mcp_tool";
  readonly empty_query?: string;
}

export interface FrozenJourneyResult { readonly id: string; readonly pass: boolean; readonly detail: string; }

export function evaluateFrozenJourney(journey: FrozenJourney): FrozenJourneyResult {
  const items = builtInDiscoveryItems();
  if (journey.input) {
    const parsed = parseInvocation(journey.input, items);
    const ids = parsed.intents.map((intent) => intent.stable_id).filter((value): value is string => Boolean(value));
    const expected = journey.expect_intent_ids ?? [];
    const pass = parsed.errors.length === 0 && expected.every((id) => ids.includes(id));
    return { id: journey.id, pass, detail: pass ? "resolved expected inert intents" : `got ${ids.join(", ")} errors ${parsed.errors.length}` };
  }
  if (journey.expect_agent && journey.expect_capability) {
    const agent = BUILT_IN_AGENTS.find((candidate) => candidate.id === journey.expect_agent);
    const allowed = agent ? isCapabilityAllowed(agent, journey.expect_capability as `capability.${string}`) : undefined;
    const pass = allowed === journey.expected_allowed;
    return { id: journey.id, pass, detail: `capability allowed=${String(allowed)}` };
  }
  if (journey.disconnected_item) {
    const item: DiscoveryItem = { id: `${journey.disconnected_item}.fixture`, version: "1.0.0", kind: journey.disconnected_item, label: "Notion", aliases: Object.freeze([]), intent: "attach", state: "disconnected", state_reason: "Connection is disconnected." };
    const result = queryDiscovery([item], "notion")[0];
    const pass = result?.keyboard.is_selectable === false && result.keyboard.selection_behavior === "unavailable";
    return { id: journey.id, pass, detail: result?.keyboard.aria_label ?? "missing result" };
  }
  if (journey.empty_query !== undefined) {
    const result = queryDiscovery(items, journey.empty_query);
    const pass = result.length === 0;
    return { id: journey.id, pass, detail: `results=${result.length}` };
  }
  return { id: journey.id, pass: false, detail: "fixture has no evaluable assertion" };
}
