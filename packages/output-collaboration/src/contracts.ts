export const OUTPUT_SCHEMA_VERSION = "1.0" as const;

export type OutputKind = "document" | "spreadsheet" | "presentation" | "data_chart" | "image";
export type OutputLifecycle = "working" | "generated" | "validating" | "ready_for_review" | "approved" | "published" | "superseded" | "archived";
export type CapabilityState = "supported" | "preview_only" | "unsupported";
export type Permission = "view" | "comment" | "edit" | "review" | "share";
export type ReviewDecision = "approved" | "changes_requested";

export interface DocumentPayload { readonly kind: "document"; readonly blocks: ReadonlyArray<{ readonly id: string; readonly type: "heading" | "paragraph" | "list"; readonly text: string; readonly style?: string }>; }
export interface SpreadsheetPayload { readonly kind: "spreadsheet"; readonly sheets: ReadonlyArray<{ readonly id: string; readonly name: string; readonly cells: Readonly<Record<string, { readonly value: string | number | boolean | null; readonly formula?: string; readonly format?: string }>> }>; }
export interface PresentationPayload { readonly kind: "presentation"; readonly slides: ReadonlyArray<{ readonly id: string; readonly title: string; readonly elements: ReadonlyArray<{ readonly id: string; readonly type: "text" | "image" | "chart" | "shape"; readonly value: string }> }>; }
export interface DataChartPayload { readonly kind: "data_chart"; readonly columns: ReadonlyArray<{ readonly name: string; readonly type: "string" | "number" | "boolean" | "date" }>; readonly rows: ReadonlyArray<Readonly<Record<string, string | number | boolean | null>>>; readonly chart: { readonly type: "bar" | "line" | "area" | "scatter" | "table"; readonly x?: string; readonly y?: readonly string[] } | null; }
export interface ImagePayload { readonly kind: "image"; readonly asset: { readonly storage_key: string; readonly media_type: string; readonly width: number; readonly height: number; readonly alt_text: string }; readonly generation_metadata?: Readonly<Record<string, string | number | boolean | null>>; }
export type OutputPayload = DocumentPayload | SpreadsheetPayload | PresentationPayload | DataChartPayload | ImagePayload;

export interface OutputActor { readonly organization_id: string; readonly project_id: string; readonly user_id: string; }
export interface OutputRecord { readonly schema_version: typeof OUTPUT_SCHEMA_VERSION; readonly id: string; readonly organization_id: string; readonly project_id: string; readonly kind: OutputKind; readonly title: string; readonly lifecycle: OutputLifecycle; readonly head_version_id: string; readonly promoted_branch_id: string; readonly created_by: string; readonly created_at: string; readonly updated_at: string; }
export interface OutputVersion { readonly schema_version: typeof OUTPUT_SCHEMA_VERSION; readonly id: string; readonly output_id: string; readonly branch_id: string; readonly ordinal: number; readonly parent_version_id: string | null; readonly payload: OutputPayload; readonly content_hash: string; readonly checkpoint_label: string; readonly created_by: string; readonly created_at: string; }
export interface OutputRender { readonly id: string; readonly version_id: string; readonly capability: CapabilityState; readonly media_type: string | null; readonly storage_key: string | null; readonly message: string; readonly created_at: string; }
export interface OutputValidation { readonly id: string; readonly version_id: string; readonly status: "passed" | "warning" | "failed"; readonly checks: ReadonlyArray<{ readonly code: string; readonly status: "passed" | "warning" | "failed"; readonly message: string }>; readonly created_at: string; }
export type DiffChange = { readonly domain: OutputKind; readonly path: string; readonly change: "added" | "removed" | "changed"; readonly before: unknown; readonly after: unknown };

export interface CommentAnchor { readonly kind: "text" | "cell" | "slide_element" | "chart_element" | "image_region" | "source_claim"; readonly reference: Readonly<Record<string, string | number>>; }
export interface Comment { readonly id: string; readonly output_id: string; readonly version_id: string; readonly parent_comment_id: string | null; readonly author_id: string; readonly body: string; readonly anchor: CommentAnchor; readonly mentions: readonly string[]; readonly created_at: string; }
export interface Notification { readonly id: string; readonly user_id: string; readonly type: "mention" | "review_requested" | "review_decided"; readonly resource_id: string; readonly created_at: string; readonly read_at: string | null; }
export interface ReviewRequest { readonly id: string; readonly output_id: string; readonly version_id: string; readonly requested_by: string; readonly reviewer_id: string; readonly status: "pending" | ReviewDecision; readonly decision_note: string | null; readonly created_at: string; readonly decided_at: string | null; }
export interface ActivityEvent { readonly id: string; readonly output_id: string; readonly actor_id: string; readonly action: string; readonly detail: Readonly<Record<string, string | number | boolean | null>>; readonly created_at: string; }
export interface ShareGrant { readonly project_id: string; readonly user_id: string; readonly permissions: readonly Permission[]; readonly revision: number; readonly revoked_at: string | null; }

export interface CollaborationSnapshot { readonly outputs: readonly OutputRecord[]; readonly versions: readonly OutputVersion[]; readonly renders: readonly OutputRender[]; readonly validations: readonly OutputValidation[]; readonly comments: readonly Comment[]; readonly notifications: readonly Notification[]; readonly reviews: readonly ReviewRequest[]; readonly activity: readonly ActivityEvent[]; readonly shares: readonly ShareGrant[]; readonly idempotency: Readonly<Record<string, { readonly fingerprint: string; readonly result_id: string }>>; }
export interface CollaborationPersistencePort { load(): Promise<CollaborationSnapshot>; save(snapshot: CollaborationSnapshot): Promise<void>; }

export interface RenderAdapterPort { capability(kind: OutputKind): CapabilityState; render(version: OutputVersion, now: string): Promise<OutputRender>; }
export interface ValidationAdapterPort { validate(version: OutputVersion, now: string): Promise<OutputValidation>; }
export interface RealtimeEvent { readonly channel: "presence" | "run_progress" | "comments" | "notifications" | "activity" | "permissions"; readonly project_id: string; readonly type: string; readonly payload: Readonly<Record<string, unknown>>; }
export interface RealtimePort { publish(event: RealtimeEvent): Promise<void>; revoke(projectId: string, userId: string): Promise<void>; }

export type TextOperation =
  | { readonly kind: "insert"; readonly op_id: string; readonly after_id: string | null; readonly value: string }
  | { readonly kind: "delete"; readonly op_id: string; readonly target_id: string };
export interface YjsSession { readonly room_id: string; readonly user_id: string; apply(operations: readonly TextOperation[]): Promise<{ readonly text: string; readonly revision: number }>; snapshot(): Promise<{ readonly text: string; readonly revision: number }>; disconnect(): Promise<void>; }
export interface YjsProviderPort { connect(roomId: string, actor: OutputActor): Promise<YjsSession>; revoke(roomId: string, userId: string): Promise<void>; }
