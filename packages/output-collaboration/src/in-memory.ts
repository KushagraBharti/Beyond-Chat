import type { CollaborationPersistencePort, CollaborationSnapshot, OutputActor, RealtimeEvent, RealtimePort, TextOperation, YjsProviderPort, YjsSession } from "./contracts.ts";

export const EMPTY_COLLABORATION_SNAPSHOT: CollaborationSnapshot = Object.freeze({ outputs: [], versions: [], renders: [], validations: [], comments: [], notifications: [], reviews: [], activity: [], shares: [], idempotency: {} });
const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryCollaborationPersistence implements CollaborationPersistencePort {
  private value: CollaborationSnapshot;
  constructor(seed: CollaborationSnapshot = EMPTY_COLLABORATION_SNAPSHOT) { this.value = clone(seed); }
  async load(): Promise<CollaborationSnapshot> { return clone(this.value); }
  async save(snapshot: CollaborationSnapshot): Promise<void> { this.value = clone(snapshot); }
}

export class InMemoryRealtime implements RealtimePort {
  readonly events: RealtimeEvent[] = [];
  readonly revoked = new Set<string>();
  async publish(event: RealtimeEvent): Promise<void> { this.events.push(clone(event)); }
  async revoke(projectId: string, userId: string): Promise<void> { this.revoked.add(`${projectId}:${userId}`); }
}

interface Room { inserts: Map<string, { after: string | null; value: string }>; deleted: Set<string>; applied: Set<string>; revision: number; sessions: Map<string, Set<MemoryYjsSession>>; }
function render(room: Room): string {
  const children = new Map<string | null, string[]>();
  for (const [id, node] of room.inserts) { const list = children.get(node.after) ?? []; list.push(id); children.set(node.after, list); }
  for (const list of children.values()) list.sort();
  const visit = (parent: string | null): string => (children.get(parent) ?? []).map((id) => `${room.deleted.has(id) ? "" : room.inserts.get(id)?.value ?? ""}${visit(id)}`).join("");
  return visit(null);
}

class MemoryYjsSession implements YjsSession {
  readonly room_id: string;
  readonly user_id: string;
  private readonly room: Room;
  private readonly authorize: () => Promise<boolean>;
  private connected = true;
  constructor(roomId: string, userId: string, room: Room, authorize: () => Promise<boolean>) { this.room_id = roomId; this.user_id = userId; this.room = room; this.authorize = authorize; }
  private async guard(): Promise<void> { if (!this.connected || !(await this.authorize())) { this.connected = false; throw new Error("collaboration.permission_revoked"); } }
  async apply(operations: readonly TextOperation[]) {
    await this.guard();
    for (const operation of [...operations].sort((a, b) => a.op_id.localeCompare(b.op_id))) {
      if (this.room.applied.has(operation.op_id)) continue;
      if (operation.kind === "insert") {
        if (operation.after_id !== null && !this.room.inserts.has(operation.after_id)) throw new Error("collaboration.missing_anchor");
        this.room.inserts.set(operation.op_id, { after: operation.after_id, value: operation.value });
      } else {
        if (!this.room.inserts.has(operation.target_id)) throw new Error("collaboration.missing_target");
        this.room.deleted.add(operation.target_id);
      }
      this.room.applied.add(operation.op_id); this.room.revision += 1;
    }
    return { text: render(this.room), revision: this.room.revision };
  }
  async snapshot() { await this.guard(); return { text: render(this.room), revision: this.room.revision }; }
  async disconnect(): Promise<void> { this.connected = false; this.room.sessions.get(this.user_id)?.delete(this); }
  revoke(): void { this.connected = false; }
}

export class InMemoryYjsProvider implements YjsProviderPort {
  private readonly rooms = new Map<string, Room>();
  private readonly canEdit: (roomId: string, actor: OutputActor) => Promise<boolean>;
  constructor(canEdit: (roomId: string, actor: OutputActor) => Promise<boolean>) { this.canEdit = canEdit; }
  async connect(roomId: string, actor: OutputActor): Promise<YjsSession> {
    if (!(await this.canEdit(roomId, actor))) throw new Error("collaboration.permission_denied");
    const room = this.rooms.get(roomId) ?? { inserts: new Map(), deleted: new Set(), applied: new Set(), revision: 0, sessions: new Map() };
    this.rooms.set(roomId, room);
    const session = new MemoryYjsSession(roomId, actor.user_id, room, () => this.canEdit(roomId, actor));
    const sessions = room.sessions.get(actor.user_id) ?? new Set(); sessions.add(session); room.sessions.set(actor.user_id, sessions);
    return session;
  }
  async revoke(roomId: string, userId: string): Promise<void> { for (const session of this.rooms.get(roomId)?.sessions.get(userId) ?? []) session.revoke(); }
}
