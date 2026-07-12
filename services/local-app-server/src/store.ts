import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  ContractError,
  toJsonValue,
  type CheckpointReference,
  type CommandEnvelope,
  type EventEnvelope,
  type ExecutionSnapshot,
  type JsonObject,
} from "@beyond/contracts";

export type StoreRecord =
  | {
      readonly kind: "command";
      readonly scope: string;
      readonly fingerprint: string;
      readonly command: CommandEnvelope;
      readonly result: JsonObject;
    }
  | {
      readonly kind: "run";
      readonly run_id: string;
      readonly start_scope: string;
      readonly start_command: CommandEnvelope;
      readonly snapshot: ExecutionSnapshot;
    }
  | { readonly kind: "event"; readonly run_id: string; readonly event: EventEnvelope }
  | { readonly kind: "checkpoint"; readonly run_id: string; readonly checkpoint: CheckpointReference }
  | { readonly kind: "attempt"; readonly run_id: string; readonly attempt: number; readonly status: "started" | "completed" | "failed" | "canceled"; readonly occurred_at: string; readonly reason_code?: string }
  | { readonly kind: "lease"; readonly run_id: string; readonly lease_id: string; readonly worker_id: string; readonly expires_at: string; readonly heartbeat_at: string; readonly released_at?: string }
  | { readonly kind: "approval"; readonly run_id: string; readonly approval_id: string; readonly status: "pending" | "approved" | "denied" | "expired"; readonly payload: JsonObject; readonly occurred_at: string }
  | { readonly kind: "resource"; readonly run_id: string; readonly resource_id: string; readonly provider: string; readonly state: "allocated" | "released"; readonly occurred_at: string }
  | { readonly kind: "usage"; readonly run_id: string; readonly status: "reserved" | "finalized" | "released"; readonly units: number; readonly occurred_at: string }
  | { readonly kind: "output"; readonly run_id: string; readonly event_sequence: number; readonly reference: JsonObject };

interface JournalRow {
  readonly id: number;
  readonly body: string;
  readonly digest: string;
}

function digest(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

/**
 * A local append-only SQLite journal. Every logical mutation group is written
 * in one SQLite transaction, so command acceptance, run state, and emitted
 * events cannot be durably split across a process crash.
 */
export class AppendOnlyStore {
  readonly path: string;
  private database?: DatabaseSync;

  constructor(path: string) { this.path = path; }

  async init(): Promise<void> {
    if (this.database) throw new ContractError("internal.unexpected", "Store is already initialized");
    await mkdir(dirname(this.path), { recursive: true });
    try {
      const database = new DatabaseSync(this.path);
      database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;");
      database.exec(`
        CREATE TABLE IF NOT EXISTS append_only_journal (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id TEXT NOT NULL,
          record_index INTEGER NOT NULL,
          body TEXT NOT NULL,
          digest TEXT NOT NULL,
          UNIQUE(transaction_id, record_index)
        ) STRICT;
      `);
      this.database = database;
    } catch (error) {
      throw new ContractError("validation.invalid_envelope", "Unable to open durable journal", { cause: String(error) });
    }
  }

  async append(records: readonly StoreRecord[]): Promise<void> {
    if (records.length === 0) return;
    const database = this.requireDatabase();
    const transactionId = crypto.randomUUID();
    const insert = database.prepare(
      "INSERT INTO append_only_journal(transaction_id, record_index, body, digest) VALUES (?, ?, ?, ?)",
    );
    database.exec("BEGIN IMMEDIATE");
    try {
      records.forEach((record, index) => {
        const body = JSON.stringify(toJsonValue(record));
        insert.run(transactionId, index, body, digest(body));
      });
      database.exec("COMMIT");
    } catch (error) {
      try { database.exec("ROLLBACK"); } catch { /* original failure is authoritative */ }
      throw error;
    }
  }

  async read(): Promise<readonly StoreRecord[]> {
    const rows = this.requireDatabase()
      .prepare("SELECT id, body, digest FROM append_only_journal ORDER BY id ASC")
      .all() as unknown as JournalRow[];
    return rows.map((row) => {
      if (digest(row.body) !== row.digest) {
        throw new ContractError("validation.invalid_envelope", "Durable journal checksum mismatch", { row: row.id });
      }
      try {
        return JSON.parse(row.body) as StoreRecord;
      } catch (error) {
        throw new ContractError("validation.invalid_envelope", "Corrupt durable journal record", { row: row.id, cause: String(error) });
      }
    });
  }

  close(): void {
    this.database?.close();
    this.database = undefined;
  }

  private requireDatabase(): DatabaseSync {
    if (!this.database) throw new ContractError("internal.unexpected", "Store is not initialized");
    return this.database;
  }
}
