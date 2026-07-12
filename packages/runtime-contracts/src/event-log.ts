import {
  ContractError,
  type EventEnvelope,
  type OrganizationId,
  type ProjectId,
  type RunId,
  type ThreadId,
  type JsonObject,
  assertEventEnvelope,
  serializeCanonical,
  toJsonValue,
} from "@beyond/contracts";

export interface EventStream {
  readonly organization_id: OrganizationId;
  readonly project_id: ProjectId;
  readonly thread_id: ThreadId;
  readonly run_id: RunId;
}

export interface EventCursor extends EventStream {
  readonly after_sequence: number;
}

export type RunEvent<Payload extends JsonObject = JsonObject> = EventEnvelope<Payload> & EventStream;
export type EventWithoutSequence<Payload extends JsonObject = JsonObject> = Omit<RunEvent<Payload>, "sequence">;

function streamKey(stream: EventStream): string {
  return `${stream.organization_id}:${stream.project_id}:${stream.thread_id}:${stream.run_id}`;
}

function sameStream(left: EventStream, right: EventStream): boolean {
  return streamKey(left) === streamKey(right);
}

function immutableEvent<Event extends RunEvent>(event: Event): Event {
  return toJsonValue(event) as unknown as Event;
}

/**
 * Ordered, append-only event log suitable for local protocol tests. It models
 * the persistence-before-broadcast and duplicate-delivery semantics required
 * of the production event store, while deliberately containing no provider IO.
 */
export class InMemoryDurableEventLog {
  private readonly streams = new Map<string, readonly RunEvent[]>();
  private readonly byEventId = new Map<string, RunEvent>();

  append<Event extends RunEvent>(event: Event): Event {
    assertEventEnvelope(event);
    const key = streamKey(event);
    const existing = this.byEventId.get(event.event_id);
    if (existing) {
      if (serializeCanonical(existing) !== serializeCanonical(event)) {
        throw new ContractError("idempotency.conflict", "event_id was reused for a different event", {
          event_id: event.event_id,
        });
      }
      return existing as Event;
    }
    const events = this.streams.get(key) ?? [];
    const expectedSequence = events.length + 1;
    if (event.sequence !== expectedSequence) {
      throw new ContractError("event.sequence_conflict", "Event sequence must be contiguous within a run stream", {
        expectedSequence,
        receivedSequence: event.sequence,
      });
    }
    const stored = immutableEvent(event);
    this.streams.set(key, Object.freeze([...events, stored]));
    this.byEventId.set(stored.event_id, stored);
    return stored as Event;
  }

  appendNew<Event extends EventWithoutSequence>(event: Event): RunEvent {
    const events = this.streams.get(streamKey(event)) ?? [];
    return this.append({ ...event, sequence: events.length + 1 });
  }

  read(cursor: EventCursor): { readonly events: readonly RunEvent[]; readonly cursor: EventCursor } {
    if (!Number.isSafeInteger(cursor.after_sequence) || cursor.after_sequence < 0) {
      throw new ContractError("validation.invalid_envelope", "Cursor must use a non-negative sequence");
    }
    const events = this.streams.get(streamKey(cursor)) ?? [];
    const unread = events.filter((event) => event.sequence > cursor.after_sequence);
    const lastSequence = unread.length === 0 ? cursor.after_sequence : unread[unread.length - 1].sequence;
    return {
      events: Object.freeze([...unread]),
      cursor: Object.freeze({ ...cursor, after_sequence: lastSequence }),
    };
  }

  replay<State>(
    cursor: EventCursor,
    initial: State,
    projector: (state: State, event: RunEvent) => State,
  ): { readonly state: State; readonly cursor: EventCursor } {
    const page = this.read(cursor);
    const state = page.events.reduce(projector, initial);
    return Object.freeze({ state, cursor: page.cursor });
  }
}

export function initialCursor(stream: EventStream): EventCursor {
  return Object.freeze({ ...stream, after_sequence: 0 });
}
