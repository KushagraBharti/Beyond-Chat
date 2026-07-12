import {
  ContractError,
  type CommandEnvelope,
  assertCommandEnvelope,
  serializeCanonical,
} from "@beyond/contracts";

export interface IdempotentResult<Result> {
  readonly result: Result;
  readonly duplicate: boolean;
}

interface StoredCommand<Result> {
  readonly fingerprint: string;
  readonly result: Promise<Result>;
}

/**
 * Process-local prototype of the command idempotency table. Production storage
 * must persist this key and result atomically with the resulting events.
 */
export class InMemoryCommandInbox {
  private readonly entries = new Map<string, StoredCommand<unknown>>();

  async execute<Result>(
    command: CommandEnvelope,
    handler: () => Promise<Result> | Result,
  ): Promise<IdempotentResult<Result>> {
    assertCommandEnvelope(command);
    const scope = [
      command.organization_id,
      command.project_id ?? "-",
      command.thread_id ?? "-",
      command.run_id ?? "-",
      command.actor.id,
      command.idempotency_key,
    ].join(":");
    const fingerprint = serializeCanonical({
      organization_id: command.organization_id,
      project_id: command.project_id ?? null,
      thread_id: command.thread_id ?? null,
      run_id: command.run_id ?? null,
      actor: command.actor,
      command_type: command.command_type,
      schema_version: command.schema_version,
      expected_version: command.expected_version ?? null,
      payload: command.payload,
    });
    const previous = this.entries.get(scope);
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        throw new ContractError("idempotency.conflict", "Idempotency key was reused for a different command", {
          scope,
        });
      }
      return { result: await previous.result as Result, duplicate: true };
    }
    const result = Promise.resolve().then(handler);
    this.entries.set(scope, { fingerprint, result });
    return { result: await result, duplicate: false };
  }
}
