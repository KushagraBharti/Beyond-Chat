export const ERROR_CODES = [
  "validation.invalid_id",
  "validation.invalid_envelope",
  "schema.invalid_version",
  "schema.unsupported_version",
  "concurrency.version_conflict",
  "idempotency.conflict",
  "state.invalid_transition",
  "event.sequence_conflict",
  "authorization.denied",
  "policy.denied",
  "approval.required",
  "provider.unavailable",
  "provider.rate_limited",
  "provider.timeout",
  "sandbox.lost",
  "checkpoint.unavailable",
  "artifact.invalid",
  "run.canceled",
  "internal.unexpected",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
export type RetryDisposition = "never" | "after_backoff" | "after_reconciliation";

const RETRY_DISPOSITIONS: Readonly<Record<ErrorCode, RetryDisposition>> = {
  "validation.invalid_id": "never",
  "validation.invalid_envelope": "never",
  "schema.invalid_version": "never",
  "schema.unsupported_version": "never",
  "concurrency.version_conflict": "never",
  "idempotency.conflict": "never",
  "state.invalid_transition": "never",
  "event.sequence_conflict": "never",
  "authorization.denied": "never",
  "policy.denied": "never",
  "approval.required": "never",
  "provider.unavailable": "after_backoff",
  "provider.rate_limited": "after_backoff",
  "provider.timeout": "after_backoff",
  "sandbox.lost": "after_reconciliation",
  "checkpoint.unavailable": "after_reconciliation",
  "artifact.invalid": "never",
  "run.canceled": "never",
  "internal.unexpected": "after_reconciliation",
};

export class ContractError extends Error {
  readonly retryDisposition: RetryDisposition;
  readonly code: ErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: ErrorCode,
    message: string,
    details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "ContractError";
    this.code = code;
    this.details = details;
    this.retryDisposition = RETRY_DISPOSITIONS[code];
  }
}
