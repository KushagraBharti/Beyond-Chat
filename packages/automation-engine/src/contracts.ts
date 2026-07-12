export const AUTOMATION_SCHEMA_VERSION = "1.0" as const;
export type TriggerKind = "schedule" | "manual" | "webhook" | "composio";
export type AutomationState = "active" | "paused" | "disabled";
export type ExecutionState =
  | "queued"
  | "leased"
  | "running"
  | "awaiting_approval"
  | "retrying"
  | "completed"
  | "failed"
  | "dead_letter"
  | "canceled"
  | "skipped";
export type OverlapPolicy = "skip" | "queue" | "cancel_previous";
export interface VersionRef {
  readonly id: string;
  readonly version: string;
  readonly digest: `sha256:${string}`;
}
export interface PinnedConfiguration {
  readonly agent: VersionRef;
  readonly tools: readonly VersionRef[];
  readonly knowledge: readonly VersionRef[];
  readonly approval_policy_id: string;
}
export interface Budget {
  readonly max_cost_cents: number;
  readonly max_actions: number;
  readonly max_attempts: number;
}
export interface RetryPolicy {
  readonly max_attempts: number;
  readonly initial_backoff_seconds: number;
  readonly max_backoff_seconds: number;
}
export interface ScheduleSpec {
  readonly time_zone: string;
  readonly hour: number;
  readonly minute: number;
  readonly days_of_week?: readonly number[];
}
export interface TriggerSpec {
  readonly kind: TriggerKind;
  readonly schedule?: ScheduleSpec;
  readonly source_id?: string;
}
export interface Destination {
  readonly id: string;
  readonly kind:
    | "project_inbox"
    | "shared_output"
    | "review_task"
    | "email"
    | "slack"
    | "teams"
    | "connected_action";
  readonly target_ref: string;
  readonly external: boolean;
  readonly approval_required: boolean;
}
export interface ServicePrincipal {
  readonly id: string;
  readonly organization_id: string;
  readonly state: "active" | "revoked";
  readonly connection_refs: readonly string[];
}
export interface AutomationDefinition {
  readonly id: string;
  readonly organization_id: string;
  readonly project_id: string;
  readonly owner_id: string;
  readonly service_principal_id?: string;
  readonly name: string;
  readonly state: AutomationState;
  readonly active_version_id?: string;
  readonly revision: number;
  readonly created_at: string;
  readonly updated_at: string;
}
export interface AutomationVersion {
  readonly id: string;
  readonly automation_id: string;
  readonly organization_id: string;
  readonly ordinal: number;
  readonly instructions: string;
  readonly trigger: TriggerSpec;
  readonly pinned: PinnedConfiguration;
  readonly budget: Budget;
  readonly retry: RetryPolicy;
  readonly overlap: OverlapPolicy;
  readonly destinations: readonly Destination[];
  readonly content_hash: `sha256:${string}`;
  readonly created_by: string;
  readonly created_at: string;
}
export interface TriggerEnvelope {
  readonly organization_id: string;
  readonly automation_id: string;
  readonly kind: TriggerKind;
  readonly source: string;
  readonly source_event_id: string;
  readonly occurred_at: string;
  readonly received_at: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly correlation_id: string;
  readonly test: boolean;
}
export interface AutomationExecution {
  readonly id: string;
  readonly organization_id: string;
  readonly automation_id: string;
  readonly automation_version_id: string;
  readonly trigger_key: string;
  readonly state: ExecutionState;
  readonly attempt: number;
  readonly cost_cents: number;
  readonly action_count: number;
  readonly input: Readonly<Record<string, unknown>>;
  readonly pinned: PinnedConfiguration;
  readonly correlation_id: string;
  readonly test: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly next_attempt_at?: string;
  readonly failure_code?: string;
  readonly failure_message?: string;
  readonly lease_id?: string;
  readonly lease_expires_at?: string;
  readonly runtime_run_id?: string;
}
export interface ApprovalRequest {
  readonly id: string;
  readonly execution_id: string;
  readonly destination_id: string;
  readonly status: "pending" | "approved" | "denied" | "expired";
  readonly expires_at: string;
  readonly requested_at: string;
  readonly decided_by?: string;
  readonly decided_at?: string;
}
export interface FailureRecord {
  readonly id: string;
  readonly execution_id: string;
  readonly attempt: number;
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly occurred_at: string;
}
export interface Notification {
  readonly id: string;
  readonly organization_id: string;
  readonly recipient_id: string;
  readonly kind:
    | "approval_requested"
    | "automation_failed"
    | "automation_paused"
    | "dead_letter";
  readonly subject_id: string;
  readonly created_at: string;
}
export interface RuntimeStart {
  readonly execution_id: string;
  readonly organization_id: string;
  readonly project_id: string;
  readonly actor_id: string;
  readonly instructions: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly pinned: PinnedConfiguration;
  readonly budget: Budget;
  readonly idempotency_key: string;
  readonly correlation_id: string;
  readonly test: boolean;
}
export interface RuntimeResult {
  readonly run_id: string;
  readonly cost_cents: number;
  readonly output_ref?: string;
}
export interface ClaimedExecution {
  readonly execution: AutomationExecution;
  readonly lease_id: string;
}

export interface AutomationPersistencePort {
  createDefinition(value: AutomationDefinition): Promise<void>;
  getDefinition(id: string): Promise<AutomationDefinition | undefined>;
  saveDefinition(
    value: AutomationDefinition,
    expected_revision: number,
  ): Promise<void>;
  saveVersion(value: AutomationVersion): Promise<void>;
  getVersion(id: string): Promise<AutomationVersion | undefined>;
  listVersions(automation_id: string): Promise<readonly AutomationVersion[]>;
  createExecutionOnce(
    value: AutomationExecution,
  ): Promise<{ execution: AutomationExecution; duplicate: boolean }>;
  getExecution(id: string): Promise<AutomationExecution | undefined>;
  listExecutions(
    automation_id: string,
  ): Promise<readonly AutomationExecution[]>;
  saveExecution(value: AutomationExecution): Promise<void>;
  claim(
    now: string,
    worker_id: string,
    lease_expires_at: string,
  ): Promise<ClaimedExecution | undefined>;
  recoverExpired(now: string): Promise<readonly string[]>;
  heartbeat(
    execution_id: string,
    lease_id: string,
    lease_expires_at: string,
  ): Promise<boolean>;
  activeExecutions(
    automation_id: string,
  ): Promise<readonly AutomationExecution[]>;
  recordActionOnce(
    execution_id: string,
    destination_id: string,
  ): Promise<boolean>;
  saveApproval(value: ApprovalRequest): Promise<void>;
  getApproval(id: string): Promise<ApprovalRequest | undefined>;
  listApprovals(organization_id: string): Promise<readonly ApprovalRequest[]>;
  appendFailure(value: FailureRecord): Promise<void>;
  listFailures(automation_id: string): Promise<readonly FailureRecord[]>;
}
export interface AutomationRuntimePort {
  start(input: RuntimeStart): Promise<RuntimeResult>;
  cancel(run_id: string, reason: string): Promise<void>;
}
export interface DestinationPort {
  deliver(
    destination: Destination,
    execution: AutomationExecution,
    runtime: RuntimeResult,
  ): Promise<void>;
}
export interface NotificationPort {
  deliver(notification: Notification): Promise<void>;
}
export interface ServicePrincipalPort {
  resolve(
    id: string,
    organization_id: string,
  ): Promise<ServicePrincipal | undefined>;
}
export interface SchedulerPort {
  schedule(automation_id: string, at: string): Promise<void>;
  unschedule(automation_id: string): Promise<void>;
}
export interface ComposioTriggerPort {
  normalize(
    payload: Readonly<Record<string, unknown>>,
    received_at: string,
  ): Promise<
    Omit<TriggerEnvelope, "organization_id" | "automation_id" | "test">
  >;
}
export interface Clock {
  now(): Date;
}
