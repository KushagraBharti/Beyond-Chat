import { diffOutputs } from "./diff.ts";
import type {
  ActivityEvent, CollaborationPersistencePort, CollaborationSnapshot, Comment, CommentAnchor, DiffChange,
  Notification, OutputActor, OutputPayload, OutputRecord, OutputVersion, Permission, RealtimePort,
  RenderAdapterPort, ReviewDecision, ReviewRequest, ShareGrant, ValidationAdapterPort, YjsProviderPort,
} from "./contracts.ts";

export class CollaborationError extends Error {
  readonly code: string;
  constructor(code: string, message = code) { super(message); this.code = code; this.name = "CollaborationError"; }
}

const hash = (value: unknown): string => {
  const text = JSON.stringify(value); let result = 2166136261;
  for (let index = 0; index < text.length; index += 1) { result ^= text.charCodeAt(index); result = Math.imul(result, 16777619); }
  return (result >>> 0).toString(16).padStart(8, "0");
};
const clone = <T>(value: T): T => structuredClone(value);
const replace = <T extends { readonly id: string }>(items: readonly T[], item: T): readonly T[] => [...items.filter((candidate) => candidate.id !== item.id), item];

export class OutputCollaborationService {
  private queue: Promise<void> = Promise.resolve();
  private readonly persistence: CollaborationPersistencePort;
  private readonly renderer: RenderAdapterPort;
  private readonly validator: ValidationAdapterPort;
  private readonly realtime: RealtimePort;
  private readonly yjs?: YjsProviderPort;
  constructor(
    persistence: CollaborationPersistencePort,
    renderer: RenderAdapterPort,
    validator: ValidationAdapterPort,
    realtime: RealtimePort,
    yjs?: YjsProviderPort,
  ) { this.persistence = persistence; this.renderer = renderer; this.validator = validator; this.realtime = realtime; this.yjs = yjs; }

  private async serial<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.queue; let release!: () => void; this.queue = new Promise<void>((resolve) => { release = resolve; });
    await previous; try { return await work(); } finally { release(); }
  }
  private grant(snapshot: CollaborationSnapshot, actor: OutputActor): ShareGrant | undefined { return snapshot.shares.find((item) => item.project_id === actor.project_id && item.user_id === actor.user_id && !item.revoked_at); }
  private assert(snapshot: CollaborationSnapshot, actor: OutputActor, permission: Permission): void {
    const grant = this.grant(snapshot, actor);
    if (!grant?.permissions.includes(permission)) throw new CollaborationError("permission.denied");
  }
  private findOutput(snapshot: CollaborationSnapshot, actor: OutputActor, id: string): OutputRecord {
    const output = snapshot.outputs.find((item) => item.id === id && item.organization_id === actor.organization_id && item.project_id === actor.project_id);
    if (!output) throw new CollaborationError("output.not_found"); return output;
  }
  private event(outputId: string, actorId: string, action: string, now: string, detail: ActivityEvent["detail"] = {}): ActivityEvent { return { id: `activity_${hash([outputId, actorId, action, now, detail])}`, output_id: outputId, actor_id: actorId, action, detail, created_at: now }; }
  private async persist(snapshot: CollaborationSnapshot, event?: ActivityEvent): Promise<void> {
    const next = event ? { ...snapshot, activity: [...snapshot.activity, event] } : snapshot; await this.persistence.save(next);
    if (event) await this.realtime.publish({ channel: "activity", project_id: next.outputs.find((item) => item.id === event.output_id)?.project_id ?? "", type: event.action, payload: clone(event.detail) });
  }

  async createOutput(actor: OutputActor, input: { readonly title: string; readonly payload: OutputPayload; readonly idempotency_key: string; readonly now: string }): Promise<OutputRecord> {
    return this.serial(async () => {
      let snapshot = await this.persistence.load(); const fingerprint = hash([actor, input.title, input.payload]); const prior = snapshot.idempotency[input.idempotency_key];
      if (prior) { if (prior.fingerprint !== fingerprint) throw new CollaborationError("idempotency.conflict"); const existing = snapshot.outputs.find((item) => item.id === prior.result_id); if (!existing) throw new CollaborationError("idempotency.corrupt"); return existing; }
      const outputId = `output_${hash([actor, input.idempotency_key])}`; const versionId = `version_${hash([outputId, 1, input.payload])}`; const branchId = `branch_${hash([outputId, "main"])}`;
      const version: OutputVersion = { schema_version: "1.0", id: versionId, output_id: outputId, branch_id: branchId, ordinal: 1, parent_version_id: null, payload: clone(input.payload), content_hash: hash(input.payload), checkpoint_label: "Initial output", created_by: actor.user_id, created_at: input.now };
      const output: OutputRecord = { schema_version: "1.0", id: outputId, organization_id: actor.organization_id, project_id: actor.project_id, kind: input.payload.kind, title: input.title.trim(), lifecycle: "generated", head_version_id: versionId, promoted_branch_id: branchId, created_by: actor.user_id, created_at: input.now, updated_at: input.now };
      const owner: ShareGrant = { project_id: actor.project_id, user_id: actor.user_id, permissions: ["view", "comment", "edit", "review", "share"], revision: 1, revoked_at: null };
      snapshot = { ...snapshot, outputs: [...snapshot.outputs, output], versions: [...snapshot.versions, version], shares: snapshot.shares.some((item) => item.project_id === actor.project_id && item.user_id === actor.user_id) ? snapshot.shares : [...snapshot.shares, owner], idempotency: { ...snapshot.idempotency, [input.idempotency_key]: { fingerprint, result_id: output.id } } };
      await this.persist(snapshot, this.event(output.id, actor.user_id, "output.created", input.now)); return output;
    });
  }

  async checkpoint(actor: OutputActor, input: { readonly output_id: string; readonly expected_head_version_id: string; readonly payload: OutputPayload; readonly label: string; readonly idempotency_key: string; readonly now: string; readonly branch_id?: string }): Promise<OutputVersion> {
    return this.serial(async () => {
      let snapshot = await this.persistence.load(); this.assert(snapshot, actor, "edit"); const output = this.findOutput(snapshot, actor, input.output_id);
      const fingerprint = hash(input); const prior = snapshot.idempotency[input.idempotency_key];
      if (prior) { if (prior.fingerprint !== fingerprint) throw new CollaborationError("idempotency.conflict"); const existing = snapshot.versions.find((item) => item.id === prior.result_id); if (!existing) throw new CollaborationError("idempotency.corrupt"); return existing; }
      if (output.head_version_id !== input.expected_head_version_id) throw new CollaborationError("version.conflict");
      if (input.payload.kind !== output.kind) throw new CollaborationError("output.kind_mismatch");
      const ordinal = Math.max(...snapshot.versions.filter((item) => item.output_id === output.id).map((item) => item.ordinal), 0) + 1;
      const version: OutputVersion = { schema_version: "1.0", id: `version_${hash([output.id, ordinal, input.payload, input.branch_id])}`, output_id: output.id, branch_id: input.branch_id ?? output.promoted_branch_id, ordinal, parent_version_id: output.head_version_id, payload: clone(input.payload), content_hash: hash(input.payload), checkpoint_label: input.label, created_by: actor.user_id, created_at: input.now };
      const updated = { ...output, head_version_id: version.id, updated_at: input.now };
      snapshot = { ...snapshot, outputs: replace(snapshot.outputs, updated), versions: [...snapshot.versions, version], idempotency: { ...snapshot.idempotency, [input.idempotency_key]: { fingerprint, result_id: version.id } } };
      await this.persist(snapshot, this.event(output.id, actor.user_id, "output.checkpointed", input.now, { version_id: version.id, ordinal })); return version;
    });
  }

  async renderAndValidate(actor: OutputActor, versionId: string, now: string) {
    return this.serial(async () => {
      let snapshot = await this.persistence.load(); this.assert(snapshot, actor, "view"); const version = snapshot.versions.find((item) => item.id === versionId); if (!version) throw new CollaborationError("version.not_found"); this.findOutput(snapshot, actor, version.output_id);
      const [render, validation] = await Promise.all([this.renderer.render(version, now), this.validator.validate(version, now)]);
      snapshot = { ...snapshot, renders: [...snapshot.renders.filter((item) => item.version_id !== version.id), render], validations: [...snapshot.validations.filter((item) => item.version_id !== version.id), validation] };
      await this.persist(snapshot, this.event(version.output_id, actor.user_id, "output.validated", now, { validation: validation.status, render: render.capability })); return { render, validation };
    });
  }

  async restore(actor: OutputActor, outputId: string, versionId: string, expectedHead: string, now: string): Promise<OutputVersion> {
    const snapshot = await this.persistence.load(); const target = snapshot.versions.find((item) => item.id === versionId && item.output_id === outputId); if (!target) throw new CollaborationError("version.not_found");
    return this.checkpoint(actor, { output_id: outputId, expected_head_version_id: expectedHead, payload: target.payload, label: `Restored from v${target.ordinal}`, idempotency_key: `restore:${outputId}:${versionId}:${expectedHead}`, now });
  }

  async branch(actor: OutputActor, outputId: string, fromVersionId: string, name: string, now: string): Promise<string> {
    return this.serial(async () => { const snapshot = await this.persistence.load(); this.assert(snapshot, actor, "edit"); this.findOutput(snapshot, actor, outputId); if (!snapshot.versions.some((item) => item.id === fromVersionId && item.output_id === outputId)) throw new CollaborationError("version.not_found"); const id = `branch_${hash([outputId, fromVersionId, name])}`; await this.persist(snapshot, this.event(outputId, actor.user_id, "output.branched", now, { branch_id: id, from_version_id: fromVersionId, name })); return id; });
  }

  async compare(actor: OutputActor, beforeId: string, afterId: string): Promise<readonly DiffChange[]> {
    const snapshot = await this.persistence.load(); this.assert(snapshot, actor, "view"); const before = snapshot.versions.find((item) => item.id === beforeId); const after = snapshot.versions.find((item) => item.id === afterId); if (!before || !after || before.output_id !== after.output_id) throw new CollaborationError("version.not_found"); this.findOutput(snapshot, actor, before.output_id); return diffOutputs(before.payload, after.payload);
  }

  async promote(actor: OutputActor, outputId: string, versionId: string, expectedHead: string, now: string): Promise<OutputRecord> {
    return this.serial(async () => { let snapshot = await this.persistence.load(); this.assert(snapshot, actor, "edit"); const output = this.findOutput(snapshot, actor, outputId); if (output.head_version_id !== expectedHead) throw new CollaborationError("version.conflict"); const version = snapshot.versions.find((item) => item.id === versionId && item.output_id === outputId); if (!version) throw new CollaborationError("version.not_found"); const updated = { ...output, head_version_id: version.id, promoted_branch_id: version.branch_id, updated_at: now }; snapshot = { ...snapshot, outputs: replace(snapshot.outputs, updated) }; await this.persist(snapshot, this.event(outputId, actor.user_id, "output.promoted", now, { version_id: version.id, branch_id: version.branch_id })); return updated; });
  }

  async share(actor: OutputActor, projectId: string, userId: string, permissions: readonly Permission[], now: string): Promise<ShareGrant> {
    return this.serial(async () => { let snapshot = await this.persistence.load(); this.assert(snapshot, actor, "share"); if (projectId !== actor.project_id) throw new CollaborationError("project.mismatch"); const prior = snapshot.shares.find((item) => item.project_id === projectId && item.user_id === userId); const grant: ShareGrant = { project_id: projectId, user_id: userId, permissions: [...new Set(permissions)].sort() as Permission[], revision: (prior?.revision ?? 0) + 1, revoked_at: null }; snapshot = { ...snapshot, shares: [...snapshot.shares.filter((item) => !(item.project_id === projectId && item.user_id === userId)), grant] }; await this.persistence.save(snapshot); await this.realtime.publish({ channel: "permissions", project_id: projectId, type: "permission.granted", payload: { user_id: userId, revision: grant.revision } }); return grant; });
  }

  async revoke(actor: OutputActor, projectId: string, userId: string, now: string): Promise<void> {
    return this.serial(async () => { let snapshot = await this.persistence.load(); this.assert(snapshot, actor, "share"); const prior = snapshot.shares.find((item) => item.project_id === projectId && item.user_id === userId); if (!prior) return; const revoked = { ...prior, permissions: [] as Permission[], revision: prior.revision + 1, revoked_at: now }; snapshot = { ...snapshot, shares: [...snapshot.shares.filter((item) => !(item.project_id === projectId && item.user_id === userId)), revoked] }; await this.persistence.save(snapshot); await Promise.all([this.realtime.revoke(projectId, userId), ...snapshot.outputs.filter((item) => item.project_id === projectId).map((item) => this.yjs?.revoke(item.id, userId))]); });
  }

  async comment(actor: OutputActor, input: { readonly output_id: string; readonly version_id: string; readonly body: string; readonly anchor: CommentAnchor; readonly mentions?: readonly string[]; readonly parent_comment_id?: string | null; readonly now: string }): Promise<Comment> {
    return this.serial(async () => { let snapshot = await this.persistence.load(); this.assert(snapshot, actor, "comment"); const output = this.findOutput(snapshot, actor, input.output_id); if (!input.body.trim()) throw new CollaborationError("comment.empty"); if (!snapshot.versions.some((item) => item.id === input.version_id && item.output_id === output.id)) throw new CollaborationError("version.not_found"); const mentions = [...new Set(input.mentions ?? [])].filter((id) => snapshot.shares.some((grant) => grant.project_id === actor.project_id && grant.user_id === id && !grant.revoked_at)); const comment: Comment = { id: `comment_${hash([actor, input])}`, output_id: output.id, version_id: input.version_id, parent_comment_id: input.parent_comment_id ?? null, author_id: actor.user_id, body: input.body.trim(), anchor: clone(input.anchor), mentions, created_at: input.now }; const notifications: Notification[] = mentions.map((userId) => ({ id: `notification_${hash([comment.id, userId])}`, user_id: userId, type: "mention", resource_id: comment.id, created_at: input.now, read_at: null })); snapshot = { ...snapshot, comments: [...snapshot.comments, comment], notifications: [...snapshot.notifications, ...notifications] }; await this.persist(snapshot, this.event(output.id, actor.user_id, "comment.created", input.now, { comment_id: comment.id })); await this.realtime.publish({ channel: "comments", project_id: actor.project_id, type: "comment.created", payload: { ...clone(comment) } }); return comment; });
  }

  async requestReview(actor: OutputActor, outputId: string, versionId: string, reviewerId: string, now: string): Promise<ReviewRequest> {
    return this.serial(async () => { let snapshot = await this.persistence.load(); this.assert(snapshot, actor, "edit"); const output = this.findOutput(snapshot, actor, outputId); if (!snapshot.versions.some((item) => item.id === versionId && item.output_id === output.id)) throw new CollaborationError("version.not_found"); if (!snapshot.shares.some((grant) => grant.project_id === actor.project_id && grant.user_id === reviewerId && grant.permissions.includes("review") && !grant.revoked_at)) throw new CollaborationError("reviewer.permission_denied"); const review: ReviewRequest = { id: `review_${hash([outputId, versionId, reviewerId, now])}`, output_id: outputId, version_id: versionId, requested_by: actor.user_id, reviewer_id: reviewerId, status: "pending", decision_note: null, created_at: now, decided_at: null }; snapshot = { ...snapshot, reviews: [...snapshot.reviews, review], notifications: [...snapshot.notifications, { id: `notification_${review.id}`, user_id: reviewerId, type: "review_requested", resource_id: review.id, created_at: now, read_at: null }] }; await this.persist(snapshot, this.event(outputId, actor.user_id, "review.requested", now, { review_id: review.id, reviewer_id: reviewerId })); return review; });
  }

  async decideReview(actor: OutputActor, reviewId: string, decision: ReviewDecision, note: string, now: string): Promise<ReviewRequest> {
    return this.serial(async () => { let snapshot = await this.persistence.load(); this.assert(snapshot, actor, "review"); const review = snapshot.reviews.find((item) => item.id === reviewId); if (!review) throw new CollaborationError("review.not_found"); this.findOutput(snapshot, actor, review.output_id); if (review.reviewer_id !== actor.user_id || review.status !== "pending") throw new CollaborationError("review.invalid_state"); const updated = { ...review, status: decision, decision_note: note.trim() || null, decided_at: now }; snapshot = { ...snapshot, reviews: replace(snapshot.reviews, updated), notifications: [...snapshot.notifications, { id: `notification_${hash([review.id, decision])}`, user_id: review.requested_by, type: "review_decided", resource_id: review.id, created_at: now, read_at: null }] }; await this.persist(snapshot, this.event(review.output_id, actor.user_id, "review.decided", now, { review_id: review.id, decision })); return updated; });
  }

  async inspect(actor: OutputActor): Promise<CollaborationSnapshot> {
    const snapshot = await this.persistence.load(); this.assert(snapshot, actor, "view"); const outputs = snapshot.outputs.filter((item) => item.organization_id === actor.organization_id && item.project_id === actor.project_id); const outputIds = new Set(outputs.map((item) => item.id)); const versions = snapshot.versions.filter((item) => outputIds.has(item.output_id)); const versionIds = new Set(versions.map((item) => item.id));
    return clone({ ...snapshot, outputs, versions, renders: snapshot.renders.filter((item) => versionIds.has(item.version_id)), validations: snapshot.validations.filter((item) => versionIds.has(item.version_id)), comments: snapshot.comments.filter((item) => outputIds.has(item.output_id)), reviews: snapshot.reviews.filter((item) => outputIds.has(item.output_id)), activity: snapshot.activity.filter((item) => outputIds.has(item.output_id)), shares: snapshot.shares.filter((item) => item.project_id === actor.project_id), notifications: snapshot.notifications.filter((item) => item.user_id === actor.user_id), idempotency: {} });
  }
}
