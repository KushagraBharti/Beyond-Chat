import type { DiffChange, OutputPayload } from "./contracts.ts";

export function diffOutputs(before: OutputPayload, after: OutputPayload): readonly DiffChange[] {
  if (before.kind !== after.kind) return [{ domain: after.kind, path: "$", change: "changed", before: before.kind, after: after.kind }];
  const changes: DiffChange[] = [];
  const walk = (left: unknown, right: unknown, path: string): void => {
    if (JSON.stringify(left) === JSON.stringify(right)) return;
    if (Array.isArray(left) && Array.isArray(right)) {
      const identifiable = [...left, ...right].every((item) => item && typeof item === "object" && "id" in item && typeof item.id === "string");
      if (identifiable) {
        const leftById = new Map(left.map((item) => [item.id as string, item])); const rightById = new Map(right.map((item) => [item.id as string, item]));
        for (const id of [...new Set([...leftById.keys(), ...rightById.keys()])].sort()) walk(leftById.get(id), rightById.get(id), `${path}[${id}]`);
        return;
      }
      const length = Math.max(left.length, right.length); for (let index = 0; index < length; index += 1) walk(left[index], right[index], `${path}[${index}]`); return;
    }
    if (left && right && typeof left === "object" && typeof right === "object" && !Array.isArray(left) && !Array.isArray(right)) {
      for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) walk((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key], `${path}.${key}`);
      return;
    }
    changes.push({ domain: after.kind, path, change: left === undefined ? "added" : right === undefined ? "removed" : "changed", before: left, after: right });
  };
  walk(before, after, "$payload"); return changes;
}
