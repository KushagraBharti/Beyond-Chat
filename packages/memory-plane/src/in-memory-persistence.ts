import type { CleanupRequest, MemoryPersistencePort, MemorySnapshot } from "./contracts.ts";

const EMPTY: MemorySnapshot = Object.freeze({ spaces: [], proposals: [], entries: [], revisions: [], retrievals: [] });

function clone(snapshot: MemorySnapshot): MemorySnapshot { return structuredClone(snapshot); }

export class InMemoryMemoryPersistence implements MemoryPersistencePort {
  private snapshot: MemorySnapshot;
  readonly cleanupRequests: CleanupRequest[] = [];
  constructor(seed: MemorySnapshot = EMPTY) { this.snapshot = clone(seed); }
  async load(): Promise<MemorySnapshot> { return clone(this.snapshot); }
  async save(snapshot: MemorySnapshot): Promise<void> { this.snapshot = clone(snapshot); }
  async requestDerivedCleanup(request: CleanupRequest): Promise<void> { this.cleanupRequests.push(structuredClone(request)); }
}
