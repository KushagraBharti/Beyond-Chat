from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

import pytest

from src.runtime.models import Lease, RuntimeCheckpoint, RuntimeRun, StoredOutput
from src.runtime_worker.errors import AdapterProtocolError, CommitOutcomeUnknown, StaleLease
from src.runtime_worker.invocation_broker import BrokerCapabilityIssuer
from src.runtime_worker.modal_sandbox import ModalSandboxLifecycle, parse_adapter_event
from src.runtime_worker.models import AdapterCommand, EventKind, InvocationRequest, SandboxHandle, SandboxSpec
from src.runtime_worker.supabase_persistence import SupabaseWorkerPersistence


NOW = datetime(2026, 7, 12, tzinfo=UTC)
IMAGE = "sha256:" + "a" * 64
RUN_ROW = {"id": "run-1", "organization_id": "org-1", "project_id": "project-1",
           "actor_id": "actor-1", "agent_version_id": "agent-1", "state": "running",
           "attempt": 2, "version": 4, "lease_id": "lease-1"}
RUN = RuntimeRun("run-1", "org-1", "project-1", "actor-1", "agent-1", "running", 2, 4)
LEASE = Lease(RUN, "lease-1", "worker-1", NOW + timedelta(minutes=1))
CHECKPOINT = RuntimeCheckpoint("checkpoint-1", "run-1", 2, "lease-1", 9, {"turn": 2},
    {"volume": "vol-1", "path": "/workspace"}, IMAGE, "sha256:" + "b" * 64, 42)


class Result:
    def __init__(self, data): self.data = data


class Query:
    def __init__(self, client, kind, name, params=None):
        self.client, self.kind, self.name, self.params = client, kind, name, params
        self.filters = []
    def select(self, columns): self.columns = columns; return self
    def eq(self, key, value): self.filters.append((key, value)); return self
    def order(self, key, desc=False): return self
    def limit(self, value): return self
    async def execute(self):
        self.client.calls.append((self.kind, self.name, self.params, tuple(self.filters)))
        failure = self.client.failures.get(self.name)
        if failure: raise failure
        return Result(self.client.responses.get(self.name))


class Supabase:
    def __init__(self): self.calls, self.responses, self.failures = [], {}, {}
    def rpc(self, name, params): return Query(self, "rpc", name, params)
    def table(self, name): return Query(self, "table", name)


class DbError(Exception):
    def __init__(self, code): self.code = code


@pytest.mark.asyncio
async def test_supabase_claim_uses_exact_committed_rpc_shape_and_parses_lease():
    client = Supabase(); client.responses["claim_runtime_run"] = [RUN_ROW]
    lease = await SupabaseWorkerPersistence(client, organization_limit=7).claim_one(
        worker_id="worker-1", lease_expires_at=LEASE.expires_at)
    assert lease == LEASE
    assert client.calls == [("rpc", "claim_runtime_run", {
        "p_worker_id": "worker-1", "p_lease_expires_at": "2026-07-12T00:01:00Z",
        "p_organization_limit": 7}, ())]


@pytest.mark.asyncio
async def test_supabase_control_reads_attempt_bound_run_and_latest_checkpoint():
    client = Supabase()
    client.responses["runtime_runs"] = [{"id": "run-1", "state": "running", "attempt": 2,
                                         "cancel_requested_at": "2026-07-12T00:00:00Z"}]
    client.responses["runtime_leases"] = [{"id": "lease-1", "run_id": "run-1", "attempt": 2,
        "worker_id": "worker-1", "expires_at": "2026-07-12T00:01:00Z", "released_at": None}]
    client.responses["runtime_checkpoints"] = [{"id": "checkpoint-1", "run_id": "run-1", "attempt": 2,
        "lease_id": "lease-1", "event_sequence": 9, "logical_state": {"turn": 2},
        "working_set": {"volume": "vol-1", "path": "/workspace"}, "runtime_image_digest": IMAGE,
        "state_digest": "sha256:" + "b" * 64, "byte_size": 42}]
    control = await SupabaseWorkerPersistence(client, clock=lambda: NOW).control(LEASE)
    assert control.cancel_requested and control.checkpoint == CHECKPOINT


@pytest.mark.asyncio
@pytest.mark.parametrize("lease_rows", [[], [{"id": "lease-1", "run_id": "run-1", "attempt": 2,
    "worker_id": "worker-1", "expires_at": "2026-07-12T00:01:00Z", "released_at": "2026-07-12T00:00:00Z"}],
    [{"id": "lease-1", "run_id": "run-1", "attempt": 2, "worker_id": "worker-1",
      "expires_at": "2026-07-11T23:59:59Z", "released_at": None}]])
async def test_control_fences_missing_released_and_expired_leases(lease_rows):
    client = Supabase(); client.responses["runtime_runs"] = [{"state": "running", "attempt": 2,
        "cancel_requested_at": None}]; client.responses["runtime_leases"] = lease_rows
    with pytest.raises(StaleLease):
        await SupabaseWorkerPersistence(client, clock=lambda: NOW).control(LEASE)


@pytest.mark.asyncio
async def test_supabase_stale_fencing_and_unknown_atomic_completion_are_distinct():
    stale = Supabase(); stale.failures["heartbeat_runtime_lease"] = DbError("40001")
    with pytest.raises(StaleLease):
        await SupabaseWorkerPersistence(stale).heartbeat(LEASE, lease_expires_at=LEASE.expires_at)
    unknown = Supabase(); unknown.failures["complete_runtime_success"] = TimeoutError("token=secret")
    unknown.responses["runtime_runs"] = [{"state": "running"}]
    with pytest.raises(CommitOutcomeUnknown, match="unknown"):
        await SupabaseWorkerPersistence(unknown).complete_success(
            LEASE, output=StoredOutput("output-1", "run-1", "s3://output", IMAGE, "text/plain", 1), costs=())


@pytest.mark.asyncio
async def test_unknown_atomic_completion_is_read_after_write_safe():
    client = Supabase(); client.failures["complete_runtime_cancellation"] = ConnectionError("lost")
    client.responses["runtime_runs"] = [{"state": "canceled"}]
    await SupabaseWorkerPersistence(client).complete_cancellation(LEASE, propagation={"sandbox": "stopped"})


@pytest.mark.asyncio
async def test_failure_rpc_shape_is_atomic_and_strict():
    client = Supabase(); client.responses["record_runtime_attempt_failure"] = RUN_ROW
    await SupabaseWorkerPersistence(client, max_attempts=5, retry_delay_seconds=12).record_failure(
        LEASE, failure_class="provider_timeout", detail={"safe": True}, retryable=True)
    _, name, params, _ = client.calls[0]
    assert name == "record_runtime_attempt_failure"
    assert params == {"p_run_id": "run-1", "p_attempt": 2, "p_lease_id": "lease-1",
        "p_failure_class": "provider_timeout", "p_failure_detail": {"safe": True},
        "p_retryable": True, "p_max_attempts": 5, "p_retry_delay_seconds": 12}


@pytest.mark.asyncio
async def test_success_settles_only_exact_run_attempt_active_reservation():
    client = Supabase(); client.responses["runtime_usage_reservations"] = [{
        "id": "reservation-run-1", "run_id": "run-1", "attempt": 2, "state": "reserved",
        "expires_at": "2026-07-12T00:01:00Z"}]; client.responses["complete_runtime_success"] = RUN_ROW
    output = StoredOutput("output-1", "run-1", "s3://output", IMAGE, "text/plain", 1)
    await SupabaseWorkerPersistence(client, clock=lambda: NOW).complete_success(LEASE, output=output, costs=())
    completion = next(call for call in client.calls if call[1] == "complete_runtime_success")
    assert completion[2]["p_reservation_id"] == "reservation-run-1"
    reservation_read = next(call for call in client.calls if call[1] == "runtime_usage_reservations")
    assert ("run_id", "run-1") in reservation_read[3] and ("attempt", 2) in reservation_read[3]


@pytest.mark.asyncio
async def test_success_rejects_ambiguous_or_expired_active_hold_instead_of_leaking_it():
    output = StoredOutput("output-1", "run-1", "s3://output", IMAGE, "text/plain", 1)
    for rows in ([{"id": "a", "run_id": "run-1", "attempt": 2, "expires_at": "2026-07-12T00:01:00Z"},
                  {"id": "b", "run_id": "run-1", "attempt": 2, "expires_at": "2026-07-12T00:01:00Z"}],
                 [{"id": "a", "run_id": "run-1", "attempt": 2, "expires_at": "2026-07-11T23:59:00Z"}]):
        client = Supabase(); client.responses["runtime_usage_reservations"] = rows
        with pytest.raises(Exception, match="reservation"):
            await SupabaseWorkerPersistence(client, clock=lambda: NOW).complete_success(LEASE, output=output, costs=())
        assert not any(call[1] == "complete_runtime_success" for call in client.calls)


class Broker:
    async def open_session(self, payload):
        return {"credential": "opaque", "run_id": payload["run_id"], "attempt": payload["attempt"],
                "lease_id": payload["lease_id"], "expires_at": NOW + timedelta(minutes=2),
                "allowed_invocations": payload["allowed_invocations"]}
    async def mint_once(self, credential, payload):
        return {"token": "single-use", **payload, "expires_at": NOW + timedelta(seconds=20)}


@pytest.mark.asyncio
async def test_broker_issuer_preserves_exact_session_and_single_use_token_bindings():
    adapter = BrokerCapabilityIssuer(Broker(), clock=lambda: NOW)
    session = await adapter.open_session(RUN, lease_id="lease-1", allowed_invocations={"model": ("invoke",)})
    request = InvocationRequest("model", "invoke", IMAGE, "idempotency-1")
    token = await adapter.mint_once(session, request)
    assert token.token == "single-use" and token.argument_digest == IMAGE


class Process:
    def __init__(self, lines=(), usage=None): self.lines, self.canceled, self.reported_usage = lines, False, usage or {}
    async def stdout_lines(self):
        for line in self.lines: yield line
    async def cancel_tree(self): self.canceled = True
    async def usage(self): return self.reported_usage


class Modal:
    def __init__(self): self.created = None; self.process = Process(); self.terminated = []; self.rows = []
    async def create_sandbox(self, **kwargs): self.created = kwargs; return "sb-1"
    async def launch(self, sandbox_id, **kwargs): self.launched = kwargs; return self.process
    async def terminate(self, sandbox_id): self.terminated.append(sandbox_id)
    async def list_sandboxes(self, **kwargs): return self.rows


@pytest.mark.asyncio
async def test_modal_restores_working_set_passes_no_creation_secrets_and_cancels_tree_idempotently():
    client = Modal(); adapter = ModalSandboxLifecycle(client, approved_image_digests=frozenset({IMAGE}))
    handle = await adapter.create_or_restore(SandboxSpec("run-1", 2, IMAGE, CHECKPOINT))
    assert client.created["working_set"] == CHECKPOINT.working_set
    assert client.created["environment"] == {}
    stream = await adapter.launch(handle, AdapterCommand(("node", "pi.js"), {
        "BEYOND_INVOCATION_BROKER_SESSION": "opaque"}, {}))
    assert [event async for event in stream] == []
    await adapter.cancel(handle); await adapter.terminate(handle); await adapter.terminate(handle)
    assert client.process.canceled and client.terminated == ["sb-1"]


@pytest.mark.asyncio
async def test_modal_withholds_success_until_provider_usage_cost_and_rejects_post_success_events():
    usage = {"idempotency_key": "modal-usage-1", "run_id": "run-1", "attempt": 2,
        "provider": "modal", "category": "sandbox", "amount_usd": "0.01",
        "provider_usage_id": "usage-1", "rate_version": "2026-07", "outcome": "completed"}
    client = Modal(); client.process = Process([
        '{"version":1,"kind":"success","idempotency_key":"success-1"}'], usage)
    adapter = ModalSandboxLifecycle(client, approved_image_digests=frozenset({IMAGE}))
    handle = await adapter.create_or_restore(SandboxSpec("run-1", 2, IMAGE, None))
    stream = await adapter.launch(handle, AdapterCommand(("node", "pi.js"), {
        "BEYOND_RUN_ID": "run-1", "BEYOND_ATTEMPT": "2",
        "BEYOND_INVOCATION_BROKER_SESSION": "opaque"}))
    events = [event async for event in stream]
    assert [event.kind for event in events] == [EventKind.COST, EventKind.SUCCESS]
    client.process = Process([
        '{"version":1,"kind":"success","idempotency_key":"success-1"}',
        '{"version":1,"kind":"success","idempotency_key":"success-2"}'])
    stream = await adapter.launch(handle, AdapterCommand(("node", "pi.js"), {}))
    with pytest.raises(AdapterProtocolError, match="after success"):
        [event async for event in stream]


@pytest.mark.asyncio
async def test_modal_reconcile_never_touches_unowned_or_active_resources():
    client = Modal(); client.rows = [
        {"id": "foreign", "metadata": {"beyond.run_id": "old"}},
        {"id": "active", "metadata": {"beyond.owner": "beyond-chat", "beyond.run_id": "live"}},
        {"id": "orphan", "metadata": {"beyond.owner": "beyond-chat", "beyond.run_id": "old"}},]
    adapter = ModalSandboxLifecycle(client, approved_image_digests=frozenset({IMAGE}))
    assert await adapter.reconcile(active_run_ids=frozenset({"live"})) == ["orphan"]
    assert client.terminated == ["orphan"]


def test_modal_jsonl_parser_rejects_unknown_versions_and_normalizes_events():
    event = parse_adapter_event(json.dumps({"version": 1, "kind": "event",
        "idempotency_key": "event-001", "event_type": "run.progress", "payload": {"step": 1}}))
    assert event.kind is EventKind.EVENT and event.payload == {"step": 1}
    with pytest.raises(AdapterProtocolError, match="version"):
        parse_adapter_event('{"version":2,"kind":"success","idempotency_key":"success-1"}')


@pytest.mark.asyncio
async def test_modal_forbids_unapproved_images_provider_or_database_secrets_and_redacts_errors():
    client = Modal(); adapter = ModalSandboxLifecycle(client, approved_image_digests=frozenset({IMAGE}))
    with pytest.raises(AdapterProtocolError, match="not approved"):
        await adapter.create_or_restore(SandboxSpec("run-1", 2, "sha256:" + "c" * 64, None))
    handle = await adapter.create_or_restore(SandboxSpec("run-1", 2, IMAGE, None))
    for key in ("AWS_SECRET_ACCESS_KEY", "STRIPE_SECRET_KEY", "COMPOSIO_API_KEY", "WORKOS_API_KEY",
                "MODAL_TOKEN_SECRET", "EXA_API_KEY", "FINANCIAL_DATASETS_API_KEY"):
        with pytest.raises(AdapterProtocolError, match="allowlisted"):
            await adapter.launch(handle, AdapterCommand(("node", "pi.js"), {key: "secret"}))


@pytest.mark.asyncio
async def test_modal_rejects_nested_working_set_credentials():
    client = Modal(); adapter = ModalSandboxLifecycle(client, approved_image_digests=frozenset({IMAGE}))
    bad = RuntimeCheckpoint("checkpoint-1", "run-1", 2, "lease-1", 1, {},
        {"mount": {"metadata": {"credentials": {"password": "secret"}}}}, IMAGE,
        "sha256:" + "b" * 64, 1)
    with pytest.raises(AdapterProtocolError, match="working_set"):
        await adapter.create_or_restore(SandboxSpec("run-1", 2, IMAGE, bad))
