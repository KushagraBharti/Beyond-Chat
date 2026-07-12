import type { MemoryEntryView, MemoryProposalView, MemoryScopeKind } from "./model";

export const memoryScopeLabels: Readonly<Record<MemoryScopeKind, string>> = {
  user: "Only me",
  project: "This project",
  team: "Team",
};

export function memoryReasonLabel(reason: MemoryProposalView["reason"]): string {
  switch (reason) {
    case "explicit_remember": return "You asked to remember this";
    case "runtime_candidate": return "Suggested from recent work";
    case "contradiction": return "Conflicts with an existing memory";
    case "compaction": return "Summary of durable run events";
    case "edit": return "User edit";
  }
}

export function formatMemoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function filterMemoryEntries(entries: readonly MemoryEntryView[], scope: MemoryScopeKind | "all", query: string): readonly MemoryEntryView[] {
  const normalized = query.trim().toLocaleLowerCase();
  return entries.filter((entry) => (scope === "all" || entry.scope === scope) && (!normalized || `${entry.key} ${entry.content}`.toLocaleLowerCase().includes(normalized)));
}
