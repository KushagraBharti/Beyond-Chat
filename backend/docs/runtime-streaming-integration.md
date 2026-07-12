# Runtime streaming integration contract

`src.runtime_streaming` is transport-ready but intentionally not registered in `main.py` or shared routes. The production PostgREST adapter is `SupabaseRuntimeEventRepository`; the isolated HTTP edge is built by `create_runtime_streaming_router(service, authorize_scope)`. `authorize_scope` is mandatory and must authenticate the request, re-read current organization/project access, and either return the exact path-derived `RunScope` or hide denial as `404`.

The HTTP edge must authenticate the caller, authorize organization/project membership, construct `RunScope`, and map both an inaccessible run and an absent run to the same `404`. It must pass `Last-Event-ID` (preferred) and the `after` query parameter to `RuntimeStreamingService.parse_cursor`, then await `service.preflight(scope, cursor=cursor)` before response headers are committed. Preflight performs only the bounded snapshot/access and cursor checks; it never waits for an event or heartbeat. Map `CursorInvalid` to `400`, `CursorAhead` to `409`, and `CursorStale` to `410` with `minimum_cursor`; clients receiving `410` must discard local projection state and fetch a fresh snapshot.

For `GET /v1/organizations/{org}/projects/{project}/runs/{run}/snapshot`, return `service.snapshot(scope)`. For `/events`, return a `StreamingResponse(service.stream(...), media_type="text/event-stream")` with `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, and `X-Accel-Buffering: no`. Pass Starlette's `request.is_disconnected` as the disconnect probe.

The repository adapter is security-critical. Both `get_snapshot` and every `read_events_after` call must use one database query/RPC constrained by `organization_id`, `project_id`, and `run_id`; never fetch by run ID and authorize afterward. `read_events_after` must use `sequence > after_sequence ORDER BY sequence ASC LIMIT limit`. `get_snapshot` must atomically return projection state, latest durable sequence, and the lowest retained sequence. An inaccessible row returns `None`, never a distinct authorization error.

## Required database read contract

Before mounting the router, add a PostgREST-exposed `runtime_stream_snapshot(p_organization_id uuid, p_project_id uuid, p_run_id text)` function. It must be a read-only, security-invoker function (or an equivalently protected private-schema function exposed only through an authenticated backend role), apply all three arguments in the `runtime_runs` predicate, and return zero or one row with exactly:

- `organization_id text`, `project_id text`, `run_id text`, and `state text`;
- `latest_sequence bigint = runtime_runs.next_event_sequence - 1`;
- `minimum_available_sequence bigint = coalesce(min(runtime_events.sequence), latest_sequence + 1)` using the same organization/project/run predicates;
- `projection jsonb`, an object containing the authoritative current run projection selected by the function.

The projection object is passed through exactly: the adapter does not infer state by replaying events, merge client state, add omitted keys, or copy arbitrary columns outside the function's explicit projection. The initial function should explicitly construct the supported projection fields (`attempt`, `version`, `cancel_requested_at`, `terminal_reason`, `created_at`, `updated_at`, and `terminal_at`) with stable JSON names. SQL permissions must deny `anon`, grant only the backend authenticated/read role that mounts this adapter, and retain RLS/current-membership checks as defense in depth. Returning no row for both missing and inaccessible scopes is required. No schema migration or remote mutation was made as part of this adapter work.

`runtime_events` must be exposed to that same backend role for `SELECT`, with RLS enforcing current organization/project access. For the bounded read shape, retain or add a composite index beginning with `(organization_id, project_id, run_id, sequence)`; the current `(organization_id, run_id, sequence)` index does not cover the complete authoritative predicate as directly.

Repository rows are treated as untrusted input. The service rejects oversized batches, negative or unordered sequences, inconsistent snapshot bounds, unsafe state/event tokens, malformed event IDs/schema versions, and timezone-naive timestamps before SSE serialization. Adapters must return canonical event names such as `run.completed`, opaque ASCII event IDs, `major.minor` schema versions, and timezone-aware datetimes.

A fresh stream emits a synthetic `snapshot` frame whose SSE ID equals `latest_sequence`, then follows events after it. A reconnect emits no synthetic snapshot and replays strictly after its cursor. The router returns `StreamingResponse` immediately after preflight, so a valid quiet running reconnect does not delay HTTP headers until the next heartbeat. Durable events are never dropped or coalesced by this layer. Reads are capped by `batch_size`, backlog batches drain without polling delay, heartbeats are SSE comments, terminal streams close only after all durable events are delivered, and idle streams close at `max_idle_seconds` so clients reconnect. Cancellation, disconnect, and response teardown close the async generator without background tasks or subscriptions to leak.

## Later manager-owned mount

After constructing a Supabase/PostgREST client carrying only the intended backend read credential and an authenticated scope-authorizer dependency, the later shared-file integration is one line:

```python
app.include_router(create_runtime_streaming_router(RuntimeStreamingService(SupabaseRuntimeEventRepository(runtime_read_client)), authorize_runtime_stream_scope))
```
