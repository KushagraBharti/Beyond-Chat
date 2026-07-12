import type { ConnectionState, SyncState } from "./contracts.ts";

const CONNECTION_TRANSITIONS: Readonly<Record<ConnectionState, readonly ConnectionState[]>> = Object.freeze({
  pending: ["connected", "reauth_required", "deleted"],
  connected: ["degraded", "reauth_required", "disconnected", "deleted"],
  degraded: ["connected", "reauth_required", "disconnected", "deleted"],
  reauth_required: ["connected", "disconnected", "deleted"],
  disconnected: ["connected", "deleted"],
  deleted: [],
});
const SYNC_TRANSITIONS: Readonly<Record<SyncState, readonly SyncState[]>> = Object.freeze({
  queued: ["running", "cancelled"],
  running: ["succeeded", "retrying", "failed", "dead_letter", "cancelled"],
  succeeded: [], retrying: ["queued", "running", "dead_letter", "failed", "cancelled"], failed: ["queued"], dead_letter: ["queued", "cancelled"], cancelled: [],
});

export function canTransitionConnection(from: ConnectionState, to: ConnectionState): boolean { return CONNECTION_TRANSITIONS[from].includes(to); }
export function canTransitionSync(from: SyncState, to: SyncState): boolean { return SYNC_TRANSITIONS[from].includes(to); }
export function assertConnectionTransition(from: ConnectionState, to: ConnectionState): ConnectionState { if (!canTransitionConnection(from, to)) throw new Error(`Invalid connection transition: ${from} -> ${to}`); return to; }
export function assertSyncTransition(from: SyncState, to: SyncState): SyncState { if (!canTransitionSync(from, to)) throw new Error(`Invalid sync transition: ${from} -> ${to}`); return to; }
