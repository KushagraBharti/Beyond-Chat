import type { MemoryScopeKind } from "../../features/memory/model";
import { memoryScopeLabels } from "../../features/memory/adapter";

export function MemoryScopeChip({ scope }: { readonly scope: MemoryScopeKind }) {
  return <span className={`memory-scope-chip is-${scope}`} data-memory-scope={scope}>{memoryScopeLabels[scope]}</span>;
}
