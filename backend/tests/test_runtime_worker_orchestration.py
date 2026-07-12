from __future__ import annotations

import asyncio
import inspect
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from src.runtime.models import ActualCost, DurableEvent, Lease, RuntimeCheckpoint, RuntimeRun, StoredOutput
from src.runtime_worker import (
    AdapterEvent, CommitOutcomeUnknown, DurableWorker, EventKind, InvocationBrokerSession,
    PiAdapterCommandFactory, ProviderTimeout, RuntimeReconciler, SandboxHandle, StaleLease,
)
from src.runtime_worker.ports import InvocationBroker


NOW = datetime(2026, 7, 12, tzinfo=UTC)
IMAGE = "sha256:" + "b" * 64
RUN = RuntimeRun("run-1", "org-1", "project-1", "actor-1", "agent-v1", attempt=1)
LEASE = Lease(RUN, "lease-1", "worker-1", NOW + timedelta(seconds=30))
OUTPUT = StoredOutput("output-1", RUN.run_id, "object://output", "sha256:abc", "text/plain", 3)
COST = ActualCost(RUN.run_id, 1, "modal", "sandbox", Decimal("0.01"), "usage-1", "v1", "completed")
CHECKPOINT = RuntimeCheckpoint("cp-1", RUN.run_id, 1, LEASE.lease_id, 2, {"turn": 2}, {"files": []}, IMAGE, "sha256:" + "a" * 64, 10)


class FakePersistence:
    def __init__(self, *, lease=LEASE, checkpoint=None):
        self.lease = lease
        self.checkpoint = checkpoint
        self.cancel = False
        self.events: dict[str, DurableEvent] = {}
        self.calls = []
        self.state = "leased"
        self.fail_at = None
        self.complete_writes = 0
        self.heartbeats = 0

    async def claim_one(self, **kwargs):
        self.calls.append("claim")
        return self.lease

    async def control(self, lease):
        from src.runtime_worker.models import RunControl
        self._fail("control")
        return RunControl(self.state, self.cancel, self.checkpoint)

    async def append_event(self, lease, event):
        self._fail("append")
        prior = self.events.get(event.idempotency_key)
        if prior:
            return prior
        event = replace(event, sequence=len(self.events) + 1)
        self.events[event.idempotency_key] = event
        return event

    async def heartbeat(self, lease, **kwargs):
        self._fail("heartbeat")
        self.heartbeats += 1
        return True

    async def write_checkpoint(self, lease, checkpoint):
        self._fail("checkpoint")
        self.checkpoint = checkpoint

    async def suspend_for_approval(self, lease, checkpoint, **kwargs):
        self._fail("suspend")
        self.checkpoint, self.state = checkpoint, "awaiting_approval"

    async def complete_success(self, lease, **kwargs):
        self._fail("complete")
        self.complete_writes += 1
        self.state = "completed"

    async def complete_cancellation(self, lease, **kwargs):
        self._fail("cancel")
        self.state = "canceled"

    async def record_failure(self, lease, **kwargs):
        self.calls.append(("failure", kwargs["failure_class"], kwargs["retryable"]))
        self.state = "retrying" if kwargs["retryable"] else "failed"

    async def release(self, lease, **kwargs):
        self.calls.append(("release", kwargs["reason"]))

    async def reconcile_expired(self, **kwargs):
        return ["expired-run"]

    async def terminal_state(self, run_id):
        return self.state

    def _fail(self, boundary):
        if self.fail_at == boundary:
            raise ProviderTimeout(boundary)


class FakeIssuer:
    def __init__(self):
        self.sessions = []
        self.fail = False
        self.session_updates = {}

    async def open_session(self, run, *, lease_id, allowed_invocations):
        if self.fail:
            raise ProviderTimeout("issuer")
        self.sessions.append((lease_id, allowed_invocations))
        session = InvocationBrokerSession(
            "broker-session", run.run_id, run.attempt, lease_id,
            NOW + timedelta(minutes=5), allowed_invocations,
        )
        return replace(session, **self.session_updates)


class FakeSandboxes:
    def __init__(self, events=()):
        self.events = list(events)
        self.command = None
        self.spec = None
        self.canceled = False
        self.terminated = False
        self.fail_create = False
        self.fail_launch = False
        self.fail_terminate = False

    async def create_or_restore(self, spec):
        if self.fail_create:
            raise ProviderTimeout("create")
        self.spec = spec
        return SandboxHandle("sandbox-1", "modal")

    async def launch(self, handle, command):
        if self.fail_launch:
            raise ProviderTimeout("launch")
        self.command = command

        async def stream():
            for event in self.events:
                if isinstance(event, Exception):
                    raise event
                yield event
        return stream()

    async def cancel(self, handle):
        self.canceled = True

    async def terminate(self, handle):
        self.terminated = True
        if self.fail_terminate:
            raise RuntimeError("cleanup")

    async def reconcile(self, **kwargs):
        return ["orphan-sandbox"]


def events(*extra):
    return [
        AdapterEvent(EventKind.EVENT, "event-001", "run.progress", {"step": 1}),
        *extra,
        AdapterEvent(EventKind.OUTPUT, "output-1", output=OUTPUT),
        AdapterEvent(EventKind.COST, "cost-001", cost=COST),
        AdapterEvent(EventKind.SUCCESS, "success-1"),
    ]


def worker(
    persistence, sandboxes, issuer=None, *, supervision_seconds=5,
    heartbeat_seconds=None, monotonic=None,
):
    return DurableWorker(
        worker_id="worker-1", persistence=persistence, issuer=issuer or FakeIssuer(),
        sandboxes=sandboxes,
        commands=PiAdapterCommandFactory(argv=("node", "/runtime/pi-adapter.js"), image_digest=IMAGE),
        image_digest=IMAGE, supervision_seconds=supervision_seconds,
        heartbeat_seconds=heartbeat_seconds, clock=lambda: NOW,
        **({"monotonic": monotonic} if monotonic else {}),
    )


@pytest.mark.asyncio
async def test_success_uses_scoped_capabilities_no_provider_credentials_and_atomic_terminal_commit():
    persistence, issuer, sandboxes = FakePersistence(), FakeIssuer(), FakeSandboxes(events())
    result = await worker(persistence, sandboxes, issuer).run_once()
    assert result.outcome == "completed" and persistence.complete_writes == 1
    assert issuer.sessions == [(LEASE.lease_id, {
        "model-gateway": ("model.invoke",), "tool-gateway": ("tool.execute",)
    })]
    assert sandboxes.command.argv == ("node", "/runtime/pi-adapter.js")
    assert set(sandboxes.command.environment) == {
        "BEYOND_RUN_ID", "BEYOND_ATTEMPT", "BEYOND_INVOCATION_BROKER_SESSION"
    }
    assert not any("MODEL_CAPABILITY" in key or "TOOL_CAPABILITY" in key for key in sandboxes.command.environment)
    assert sandboxes.terminated
    assert not any(call[0] == "release" for call in persistence.calls if isinstance(call, tuple))


def test_per_call_single_use_invocation_minting_is_an_explicit_contract():
    signature = inspect.signature(InvocationBroker.mint_once)
    assert list(signature.parameters) == ["self", "session", "request"]


@pytest.mark.asyncio
@pytest.mark.parametrize("boundary", ["control", "append", "heartbeat", "checkpoint", "complete"])
async def test_retryable_crash_at_every_persistence_boundary_never_false_succeeds(boundary):
    persistence = FakePersistence()
    persistence.fail_at = boundary
    extra = [AdapterEvent(EventKind.HEARTBEAT, "heartbeat-001")]
    if boundary == "checkpoint":
        extra.append(AdapterEvent(EventKind.CHECKPOINT, "checkpoint-001", checkpoint=CHECKPOINT))
    result = await worker(persistence, FakeSandboxes(events(*extra))).run_once()
    assert result.outcome == "retrying"
    assert persistence.state != "completed"


@pytest.mark.asyncio
@pytest.mark.parametrize("boundary", ["issuer", "create", "launch", "stream"])
async def test_provider_failures_at_each_effect_boundary_are_retryable(boundary):
    persistence, issuer, sandbox = FakePersistence(), FakeIssuer(), FakeSandboxes(events())
    if boundary == "issuer":
        issuer.fail = True
    elif boundary == "create":
        sandbox.fail_create = True
    elif boundary == "launch":
        sandbox.fail_launch = True
    else:
        sandbox.events = [ProviderTimeout("stream")]
    result = await worker(persistence, sandbox, issuer).run_once()
    assert result.outcome == "retrying"
    assert persistence.complete_writes == 0


@pytest.mark.asyncio
async def test_duplicate_event_is_db_idempotent_and_sequence_is_db_owned():
    duplicate = AdapterEvent(EventKind.EVENT, "same-key", "tool.completed", {"x": 1})
    persistence = FakePersistence()
    result = await worker(persistence, FakeSandboxes(events(duplicate, duplicate))).run_once()
    assert result.outcome == "completed"
    assert [event.sequence for event in persistence.events.values()] == [1, 2]
    assert persistence.events["same-key"].payload == {"x": 1}


@pytest.mark.asyncio
async def test_lost_atomic_completion_response_is_read_after_write_safe():
    class LostResponse(FakePersistence):
        async def complete_success(self, lease, **kwargs):
            self.complete_writes += 1
            self.state = "completed"
            raise CommitOutcomeUnknown("response lost")

    persistence = LostResponse()
    result = await worker(persistence, FakeSandboxes(events())).run_once()
    assert result.outcome == "completed" and persistence.complete_writes == 1


@pytest.mark.asyncio
async def test_timeout_is_retryable_and_adapter_protocol_failure_is_terminal():
    retry = await worker(FakePersistence(), FakeSandboxes([TimeoutError("stream")])).run_once()
    terminal = await worker(FakePersistence(), FakeSandboxes([])).run_once()
    assert retry.outcome == "retrying"
    assert terminal.outcome == "failed"


@pytest.mark.asyncio
async def test_stale_lease_fences_worker_without_failure_or_success_commit():
    class Stale(FakePersistence):
        async def heartbeat(self, *args, **kwargs):
            return False

    persistence = Stale()
    result = await worker(persistence, FakeSandboxes(events(AdapterEvent(EventKind.HEARTBEAT, "heartbeat-001")))).run_once()
    assert result.outcome == "stale" and persistence.complete_writes == 0
    assert not any(call[0] == "failure" for call in persistence.calls if isinstance(call, tuple))


class QuietSandboxes(FakeSandboxes):
    def __init__(self):
        super().__init__()
        self.unblock = asyncio.Event()
        self.finalized = asyncio.Event()

    async def launch(self, handle, command):
        self.command = command

        async def stream():
            try:
                await self.unblock.wait()
                yield AdapterEvent(EventKind.OUTPUT, "quiet-output", output=OUTPUT)
                yield AdapterEvent(EventKind.SUCCESS, "quiet-success")
            finally:
                self.finalized.set()
        return stream()


@pytest.mark.asyncio
async def test_quiet_stream_has_worker_owned_periodic_heartbeat_and_no_task_leak():
    persistence, sandbox = FakePersistence(), QuietSandboxes()
    task = asyncio.create_task(worker(
        persistence, sandbox, supervision_seconds=0.005, heartbeat_seconds=0.005,
        monotonic=StepMonotonic(0.01),
    ).run_once())
    for _ in range(100):
        if persistence.heartbeats >= 2:
            break
        await asyncio.sleep(0.002)
    assert persistence.heartbeats >= 2
    sandbox.unblock.set()
    assert (await task).outcome == "completed"
    assert sandbox.finalized.is_set() and task.done()


@pytest.mark.asyncio
async def test_quiet_stream_detects_mid_silence_cancel_and_cleans_pending_next_task():
    persistence, sandbox = FakePersistence(), QuietSandboxes()
    task = asyncio.create_task(worker(
        persistence, sandbox, supervision_seconds=0.005, heartbeat_seconds=0.005
    ).run_once())
    await asyncio.sleep(0.012)
    persistence.cancel = True
    assert (await task).outcome == "canceled"
    assert sandbox.canceled and sandbox.finalized.is_set()
    assert not any(call[0] == "release" for call in persistence.calls if isinstance(call, tuple))


@pytest.mark.asyncio
async def test_quiet_stream_stale_periodic_heartbeat_fences_and_cleans_task():
    class StaleQuiet(FakePersistence):
        async def heartbeat(self, *args, **kwargs):
            self.heartbeats += 1
            return False

    persistence, sandbox = StaleQuiet(), QuietSandboxes()
    result = await worker(
        persistence, sandbox, supervision_seconds=0.005, heartbeat_seconds=0.005
    ).run_once()
    assert result.outcome == "stale" and persistence.heartbeats == 1
    assert sandbox.finalized.is_set()


class StepMonotonic:
    def __init__(self, step=0.4):
        self.value = -step
        self.step = step

    def __call__(self):
        self.value += self.step
        return self.value


@pytest.mark.asyncio
async def test_busy_stream_heartbeats_on_monotonic_cadence_not_per_event():
    progress = [
        AdapterEvent(EventKind.EVENT, f"busy-{index:04d}", "run.progress", {"index": index})
        for index in range(12)
    ]
    persistence = FakePersistence()
    result = await worker(
        persistence, FakeSandboxes(events(*progress)), heartbeat_seconds=1,
        monotonic=StepMonotonic(),
    ).run_once()
    assert result.outcome == "completed"
    assert 2 <= persistence.heartbeats < len(progress)


@pytest.mark.asyncio
async def test_busy_stream_stale_heartbeat_rejection_fences_immediately():
    class StaleBusy(FakePersistence):
        async def heartbeat(self, *args, **kwargs):
            self.heartbeats += 1
            return False

    progress = [
        AdapterEvent(EventKind.EVENT, f"stale-{index:03d}", "run.progress", {})
        for index in range(10)
    ]
    persistence = StaleBusy()
    result = await worker(
        persistence, FakeSandboxes(events(*progress)), heartbeat_seconds=1,
        monotonic=StepMonotonic(0.6),
    ).run_once()
    assert result.outcome == "stale" and persistence.heartbeats == 1
    assert persistence.complete_writes == 0


@pytest.mark.asyncio
async def test_cancel_before_start_and_during_stream_propagates():
    before = FakePersistence(); before.cancel = True
    before_result = await worker(before, FakeSandboxes(events())).run_once()

    during = FakePersistence()
    class CancelAfterAppend(FakePersistence):
        async def append_event(self, lease, event):
            value = await super().append_event(lease, event)
            self.cancel = True
            return value
    during = CancelAfterAppend()
    sandbox = FakeSandboxes(events(AdapterEvent(EventKind.HEARTBEAT, "heartbeat-001")))
    during_result = await worker(during, sandbox).run_once()
    assert before_result.outcome == during_result.outcome == "canceled"
    assert sandbox.canceled and during.state == "canceled"


@pytest.mark.asyncio
async def test_approval_checkpoint_and_suspend_are_atomic_then_cleanup():
    approval = AdapterEvent(
        EventKind.APPROVAL, "approval-event", checkpoint=CHECKPOINT,
        approval_id="approval-1", operation="tool.external_write", argument_summary={"target": "draft"},
    )
    persistence, sandbox = FakePersistence(), FakeSandboxes([approval])
    result = await worker(persistence, sandbox).run_once()
    assert result.outcome == "awaiting_approval"
    assert persistence.state == "awaiting_approval" and persistence.checkpoint == CHECKPOINT
    assert sandbox.terminated
    assert not any(call[0] == "release" for call in persistence.calls if isinstance(call, tuple))


@pytest.mark.asyncio
async def test_resume_from_checkpoint_restores_sandbox_and_adapter_state():
    persistence, sandbox = FakePersistence(checkpoint=CHECKPOINT), FakeSandboxes(events())
    assert (await worker(persistence, sandbox).run_once()).outcome == "completed"
    assert sandbox.spec.checkpoint == CHECKPOINT
    assert sandbox.command.resume_state == {"turn": 2}


@pytest.mark.asyncio
@pytest.mark.parametrize("missing", ["output", "success"])
async def test_no_terminal_success_when_required_boundary_is_missing(missing):
    stream = events()
    if missing == "output": stream = [e for e in stream if e.kind is not EventKind.OUTPUT]
    if missing == "success": stream = [e for e in stream if e.kind is not EventKind.SUCCESS]
    persistence = FakePersistence()
    assert (await worker(persistence, FakeSandboxes(stream)).run_once()).outcome == "failed"
    assert persistence.complete_writes == 0 and persistence.state == "failed"


@pytest.mark.asyncio
async def test_cost_or_output_commit_failure_and_cleanup_failure_do_not_false_succeed():
    for kind in (EventKind.OUTPUT, EventKind.COST):
        malformed = AdapterEvent(kind, "malformed-001")
        persistence = FakePersistence()
        result = await worker(persistence, FakeSandboxes([malformed])).run_once()
        assert result.outcome == "failed" and persistence.complete_writes == 0
    persistence, sandbox = FakePersistence(), FakeSandboxes(events())
    sandbox.fail_terminate = True
    assert (await worker(persistence, sandbox).run_once()).outcome == "completed"
    assert persistence.state == "completed"


@pytest.mark.asyncio
async def test_reconciler_handles_expired_leases_and_orphan_sandboxes():
    result = await RuntimeReconciler(
        persistence=FakePersistence(), sandboxes=FakeSandboxes()
    ).reconcile(now=NOW, active_run_ids=frozenset({"live-run"}))
    assert result == {"expired_runs": ["expired-run"], "terminated_sandboxes": ["orphan-sandbox"]}


@pytest.mark.asyncio
@pytest.mark.parametrize("bad_key", ["", "       ", "x" * 7, "x" * 256])
async def test_adapter_idempotency_key_is_validated_before_persistence(bad_key):
    persistence = FakePersistence()
    bad = AdapterEvent(EventKind.EVENT, bad_key, "run.progress", {})
    assert (await worker(persistence, FakeSandboxes([bad])).run_once()).outcome == "failed"
    assert persistence.events == {}


@pytest.mark.asyncio
@pytest.mark.parametrize("size", [8, 255])
async def test_adapter_idempotency_database_bounds_are_inclusive(size):
    persistence = FakePersistence()
    event = AdapterEvent(EventKind.EVENT, "x" * size, "run.progress", {})
    stream = [event, AdapterEvent(EventKind.OUTPUT, "output-ok", output=OUTPUT), AdapterEvent(EventKind.SUCCESS, "success-ok")]
    assert (await worker(persistence, FakeSandboxes(stream)).run_once()).outcome == "completed"


@pytest.mark.asyncio
@pytest.mark.parametrize("field,value", [
    ("run_id", "other-run"), ("attempt", 9), ("lease_id", "other-lease"),
    ("runtime_image_digest", "sha256:other"), ("state_digest", "not-a-digest"),
])
async def test_checkpoint_bindings_are_validated_before_persistence(field, value):
    persistence = FakePersistence()
    bad = replace(CHECKPOINT, **{field: value})
    stream = [AdapterEvent(EventKind.CHECKPOINT, "checkpoint", checkpoint=bad)]
    assert (await worker(persistence, FakeSandboxes(stream)).run_once()).outcome == "failed"
    assert persistence.checkpoint is None


@pytest.mark.asyncio
@pytest.mark.parametrize("digest", [
    "sha256:" + "A" * 64, "sha256:" + "g" * 64, "sha256:" + "a" * 63,
])
async def test_checkpoint_state_digest_uses_strict_lowercase_sha256_grammar(digest):
    persistence = FakePersistence()
    bad = replace(CHECKPOINT, state_digest=digest)
    stream = [AdapterEvent(EventKind.CHECKPOINT, "digest-bad", checkpoint=bad)]
    assert (await worker(persistence, FakeSandboxes(stream)).run_once()).outcome == "failed"
    assert persistence.checkpoint is None


def test_configured_approved_image_digest_uses_strict_lowercase_sha256_grammar():
    with pytest.raises(ValueError, match="canonical sha256"):
        DurableWorker(
            worker_id="worker-1", persistence=FakePersistence(), issuer=FakeIssuer(),
            sandboxes=FakeSandboxes(),
            commands=PiAdapterCommandFactory(argv=("node", "adapter.js"), image_digest="sha256:bad"),
            image_digest="sha256:bad",
        )


@pytest.mark.asyncio
@pytest.mark.parametrize("updates", [
    {"credential": ""}, {"run_id": "other-run"}, {"attempt": 99},
    {"lease_id": "other-lease"}, {"expires_at": NOW},
    {"allowed_invocations": {"model-gateway": ("model.invoke",), "tool-gateway": ("tool.execute",), "admin": ("admin.execute",)}},
    {"allowed_invocations": {"model-gateway": ("model.invoke", "model.admin"), "tool-gateway": ("tool.execute",)}},
])
async def test_broker_session_full_binding_is_validated_before_sandbox_launch(updates):
    issuer = FakeIssuer(); issuer.session_updates = updates
    sandbox = FakeSandboxes(events())
    result = await worker(FakePersistence(), sandbox, issuer).run_once()
    assert result.outcome == "failed"
    assert sandbox.spec is None


@pytest.mark.asyncio
async def test_output_and_cost_bindings_are_validated_before_atomic_completion():
    cases = [
        [AdapterEvent(EventKind.OUTPUT, "output-x1", output=replace(OUTPUT, run_id="other"))],
        [AdapterEvent(EventKind.COST, "cost-x01", cost=replace(COST, run_id="other"))],
        [AdapterEvent(EventKind.COST, "cost-x02", cost=replace(COST, attempt=7))],
    ]
    for stream in cases:
        persistence = FakePersistence()
        assert (await worker(persistence, FakeSandboxes(stream)).run_once()).outcome == "failed"
        assert persistence.complete_writes == 0


@pytest.mark.asyncio
async def test_output_success_and_provider_usage_ordering_and_uniqueness_are_explicit():
    streams = [
        [AdapterEvent(EventKind.SUCCESS, "success-x")],
        [AdapterEvent(EventKind.OUTPUT, "output-a1", output=OUTPUT), AdapterEvent(EventKind.OUTPUT, "output-a2", output=OUTPUT)],
        [AdapterEvent(EventKind.COST, "cost-a01", cost=COST), AdapterEvent(EventKind.COST, "cost-a02", cost=COST)],
        [AdapterEvent(EventKind.OUTPUT, "output-b1", output=OUTPUT), AdapterEvent(EventKind.SUCCESS, "success-b1"), AdapterEvent(EventKind.COST, "cost-late", cost=COST)],
    ]
    for stream in streams:
        persistence = FakePersistence()
        assert (await worker(persistence, FakeSandboxes(stream)).run_once()).outcome == "failed"
        assert persistence.complete_writes == 0
