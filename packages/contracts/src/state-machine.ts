import { type RunId } from "./ids.ts";
import { ContractError } from "./errors.ts";

export const EXECUTION_STATES = [
  "accepted",
  "queued",
  "leased",
  "preparing",
  "running",
  "awaiting_approval",
  "completing",
  "retrying",
  "paused",
  "stalled",
  "reconciling",
  "completed",
  "failed",
  "canceled",
] as const;

export type ExecutionState = (typeof EXECUTION_STATES)[number];
export type TerminalExecutionState = "completed" | "failed" | "canceled";

export const USER_FACING_STATE_LABEL: Readonly<Record<ExecutionState, string>> = {
  accepted: "Starting",
  queued: "Waiting to start",
  leased: "Starting",
  preparing: "Preparing workspace",
  running: "Working",
  awaiting_approval: "Needs your approval",
  completing: "Finalizing output",
  retrying: "Retrying",
  paused: "Paused",
  stalled: "Taking longer than expected",
  reconciling: "Recovering",
  completed: "Complete",
  failed: "Failed",
  canceled: "Canceled",
};

const NEXT_STATES: Readonly<Record<ExecutionState, readonly ExecutionState[]>> = {
  accepted: ["queued", "failed", "canceled"],
  queued: ["leased", "paused", "retrying", "failed", "canceled", "reconciling"],
  leased: ["preparing", "queued", "stalled", "reconciling", "failed", "canceled"],
  preparing: ["running", "retrying", "stalled", "reconciling", "failed", "canceled"],
  running: ["awaiting_approval", "completing", "retrying", "paused", "stalled", "reconciling", "failed", "canceled"],
  awaiting_approval: ["running", "paused", "reconciling", "failed", "canceled"],
  completing: ["completed", "retrying", "reconciling", "failed", "canceled"],
  retrying: ["queued", "leased", "preparing", "running", "failed", "canceled", "reconciling"],
  paused: ["queued", "leased", "preparing", "running", "canceled", "failed", "reconciling"],
  stalled: ["reconciling", "retrying", "failed", "canceled"],
  reconciling: ["queued", "leased", "preparing", "running", "awaiting_approval", "completing", "retrying", "paused", "completed", "failed", "canceled"],
  completed: [],
  failed: [],
  canceled: [],
};

export interface ExecutionSnapshot {
  readonly run_id: RunId;
  readonly state: ExecutionState;
  readonly version: number;
  readonly attempt: number;
  readonly updated_at: string;
  readonly reason_code?: string;
}

export interface StateTransition {
  readonly to: ExecutionState;
  readonly occurred_at: string;
  readonly expected_version?: number;
  readonly reason_code?: string;
}

export function isTerminalState(state: ExecutionState): state is TerminalExecutionState {
  return state === "completed" || state === "failed" || state === "canceled";
}

export function canTransition(from: ExecutionState, to: ExecutionState): boolean {
  return NEXT_STATES[from].includes(to);
}

export function transitionExecution(
  current: ExecutionSnapshot,
  transition: StateTransition,
): Readonly<ExecutionSnapshot> {
  if (transition.expected_version !== undefined && transition.expected_version !== current.version) {
    throw new ContractError("concurrency.version_conflict", "Execution version does not match", {
      expected: transition.expected_version,
      actual: current.version,
    });
  }
  if (!canTransition(current.state, transition.to)) {
    throw new ContractError("state.invalid_transition", `Cannot transition ${current.state} to ${transition.to}`, {
      from: current.state,
      to: transition.to,
    });
  }
  if (!Number.isFinite(Date.parse(transition.occurred_at))) {
    throw new ContractError("validation.invalid_envelope", "Transition timestamp must be ISO-8601");
  }
  const { reason_code: _previousReason, ...withoutPreviousReason } = current;
  return Object.freeze({
    ...withoutPreviousReason,
    state: transition.to,
    version: current.version + 1,
    attempt: transition.to === "retrying" ? current.attempt + 1 : current.attempt,
    updated_at: transition.occurred_at,
    ...(transition.reason_code ? { reason_code: transition.reason_code } : {}),
  });
}
