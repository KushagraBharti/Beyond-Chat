import { formatMemoryDate } from "../../features/memory/adapter";
import type { RecallExplanationView } from "../../features/memory/model";
import { MemoryScopeChip } from "./MemoryScopeChip";

export function RecallExplanation({ explanation }: { readonly explanation: RecallExplanationView }) {
  return <details className="memory-explanation">
    <summary>Why was this recalled?</summary>
    <div className="memory-explanation-body">
      <div><MemoryScopeChip scope={explanation.scope} /><span>{Math.round(explanation.score * 100)}% match</span></div>
      <p>Last updated {formatMemoryDate(explanation.lastUpdatedAt)}</p>
      <ul>{explanation.reasons.map((reason) => <li key={reason}>{reason.replaceAll("_", " ")}</li>)}</ul>
      {explanation.sourceEventIds.length > 0 && <p className="memory-provenance">Source events: {explanation.sourceEventIds.join(", ")}</p>}
    </div>
  </details>;
}
