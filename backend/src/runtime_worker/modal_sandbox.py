from __future__ import annotations

import json
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, AsyncIterator, Mapping, Protocol

from src.runtime.models import ActualCost, RuntimeCheckpoint, StoredOutput

from .errors import AdapterProtocolError, ProviderTimeout, ProviderUnavailable
from .models import AdapterCommand, AdapterEvent, EventKind, SandboxHandle, SandboxSpec


class ModalProcess(Protocol):
    def stdout_lines(self) -> AsyncIterator[str | bytes]: ...
    async def cancel_tree(self) -> None: ...
    async def usage(self) -> Mapping[str, Any]: ...


class ModalClient(Protocol):
    async def create_sandbox(self, *, image_digest: str, metadata: Mapping[str, str],
                             working_set: Mapping[str, Any], environment: Mapping[str, str]) -> str: ...
    async def launch(self, sandbox_id: str, *, argv: tuple[str, ...],
                     environment: Mapping[str, str], resume_state: Mapping[str, Any]) -> ModalProcess: ...
    async def terminate(self, sandbox_id: str) -> None: ...
    async def list_sandboxes(self, *, metadata: Mapping[str, str]) -> list[Mapping[str, Any]]: ...


class ModalSandboxLifecycle:
    """Provider-dependency-free Modal lifecycle around an injected SDK client."""

    OWNER_LABEL = "beyond-chat"

    def __init__(self, client: ModalClient, *, approved_image_digests: frozenset[str]) -> None:
        if not approved_image_digests or any(not _SHA256.fullmatch(x) for x in approved_image_digests):
            raise ValueError("approved immutable Modal image digests are required")
        self.client = client
        self.approved_image_digests = approved_image_digests
        self._processes: dict[str, ModalProcess] = {}
        self._owned: set[str] = set()
        self._terminated: set[str] = set()

    async def create_or_restore(self, spec: SandboxSpec) -> SandboxHandle:
        if spec.image_digest not in self.approved_image_digests:
            raise AdapterProtocolError("runtime image digest is not approved")
        working_set = _working_set(spec.checkpoint)
        metadata = {
            "beyond.owner": self.OWNER_LABEL, "beyond.run_id": spec.run_id,
            "beyond.attempt": str(spec.attempt), "beyond.image_digest": spec.image_digest,
        }
        try:
            sandbox_id = str(await self.client.create_sandbox(
                image_digest=spec.image_digest, metadata=metadata,
                working_set=working_set, environment={},
            ))
        except TimeoutError as exc:
            raise ProviderTimeout("Modal sandbox creation timed out") from exc
        except Exception as exc:
            raise ProviderUnavailable("Modal sandbox creation failed") from exc
        if not sandbox_id.strip():
            raise AdapterProtocolError("Modal returned an empty sandbox id")
        self._owned.add(sandbox_id)
        return SandboxHandle(sandbox_id, "modal")

    async def launch(self, handle: SandboxHandle, command: AdapterCommand):
        self._require_owned(handle)
        _validate_environment(command.environment)
        if not command.argv or any(not isinstance(value, str) or not value for value in command.argv):
            raise AdapterProtocolError("Pi command argv is invalid")
        try:
            process = await self.client.launch(handle.sandbox_id, argv=command.argv,
                environment=dict(command.environment), resume_state=dict(command.resume_state))
        except TimeoutError as exc:
            raise ProviderTimeout("Modal process launch timed out") from exc
        except Exception as exc:
            raise ProviderUnavailable("Modal process launch failed") from exc
        self._processes[handle.sandbox_id] = process

        async def events() -> AsyncIterator[AdapterEvent]:
            try:
                success: AdapterEvent | None = None
                async for line in process.stdout_lines():
                    event = parse_adapter_event(line)
                    if success is not None:
                        raise AdapterProtocolError("Pi adapter emitted after success")
                    if event.kind is EventKind.SUCCESS:
                        success = event
                        continue
                    yield event
                usage = await process.usage()
                if usage:
                    yield _usage_event(usage)
                if success is not None:
                    yield success
            except (AdapterProtocolError, ProviderUnavailable, ProviderTimeout):
                raise
            except TimeoutError as exc:
                raise ProviderTimeout("Modal process stream timed out") from exc
            except Exception as exc:
                raise ProviderUnavailable("Modal process stream failed") from exc
        return events()

    async def cancel(self, handle: SandboxHandle) -> None:
        self._require_owned(handle)
        process = self._processes.get(handle.sandbox_id)
        if process is None:
            return
        try:
            await process.cancel_tree()
        except Exception as exc:
            raise ProviderUnavailable("Modal process cancellation failed") from exc

    async def terminate(self, handle: SandboxHandle) -> None:
        self._require_owned(handle)
        if handle.sandbox_id in self._terminated:
            return
        try:
            await self.client.terminate(handle.sandbox_id)
            self._terminated.add(handle.sandbox_id)
            self._processes.pop(handle.sandbox_id, None)
        except Exception as exc:
            raise ProviderUnavailable("Modal sandbox termination failed") from exc

    async def reconcile(self, *, active_run_ids: frozenset[str]) -> list[str]:
        try:
            rows = await self.client.list_sandboxes(metadata={"beyond.owner": self.OWNER_LABEL})
        except Exception as exc:
            raise ProviderUnavailable("Modal sandbox listing failed") from exc
        terminated: list[str] = []
        for row in rows:
            metadata = row.get("metadata") if isinstance(row, Mapping) else None
            if not isinstance(metadata, Mapping) or metadata.get("beyond.owner") != self.OWNER_LABEL:
                continue
            sandbox_id, run_id = str(row.get("id", "")), str(metadata.get("beyond.run_id", ""))
            if not sandbox_id or not run_id or run_id in active_run_ids:
                continue
            self._owned.add(sandbox_id)
            await self.terminate(SandboxHandle(sandbox_id, "modal"))
            terminated.append(sandbox_id)
        return terminated

    async def provider_usage(self, handle: SandboxHandle) -> Mapping[str, Any]:
        self._require_owned(handle)
        process = self._processes.get(handle.sandbox_id)
        return dict(await process.usage()) if process else {}

    def _require_owned(self, handle: SandboxHandle) -> None:
        if handle.provider != "modal" or handle.sandbox_id not in self._owned:
            raise AdapterProtocolError("sandbox is not owned by Beyond")


def parse_adapter_event(line: str | bytes) -> AdapterEvent:
    try:
        text = line.decode("utf-8") if isinstance(line, bytes) else line
        value = json.loads(text)
    except (UnicodeDecodeError, json.JSONDecodeError, TypeError) as exc:
        raise AdapterProtocolError("Pi adapter emitted invalid JSONL") from exc
    if not isinstance(value, dict) or value.get("version") != 1:
        raise AdapterProtocolError("Pi adapter event version is unsupported")
    try:
        kind = EventKind(value["kind"])
        key = str(value["idempotency_key"])
        common = {"kind": kind, "idempotency_key": key}
        if kind is EventKind.EVENT:
            return AdapterEvent(**common, event_type=str(value["event_type"]), payload=dict(value.get("payload") or {}))
        if kind is EventKind.CHECKPOINT:
            return AdapterEvent(**common, checkpoint=_parse_checkpoint(value["checkpoint"]))
        if kind is EventKind.APPROVAL:
            expires = value.get("approval_expires_at")
            return AdapterEvent(**common, checkpoint=_parse_checkpoint(value["checkpoint"]),
                approval_id=str(value["approval_id"]), operation=str(value["operation"]),
                argument_summary=dict(value.get("argument_summary") or {}),
                approval_expires_at=_time(expires) if expires else None)
        if kind is EventKind.OUTPUT:
            item = value["output"]
            return AdapterEvent(**common, output=StoredOutput(str(item["output_id"]), str(item["run_id"]),
                str(item["uri"]), str(item["digest"]), str(item["media_type"]), int(item["byte_size"])))
        if kind is EventKind.COST:
            return AdapterEvent(**common, cost=_parse_cost(value["cost"]))
        return AdapterEvent(**common)
    except (KeyError, TypeError, ValueError, InvalidOperation) as exc:
        raise AdapterProtocolError("Pi adapter event shape is invalid") from exc


def _working_set(checkpoint: RuntimeCheckpoint | None) -> Mapping[str, Any]:
    if checkpoint is None:
        return {}
    value = checkpoint.working_set
    if not isinstance(value, dict) or not _safe_working_set(value):
        raise AdapterProtocolError("checkpoint working_set is unsafe")
    return value


def _validate_environment(environment: Mapping[str, str]) -> None:
    allowed = {"BEYOND_RUN_ID", "BEYOND_ATTEMPT", "BEYOND_INVOCATION_BROKER_SESSION"}
    if set(environment) - allowed or any(not isinstance(value, str) for value in environment.values()):
        raise AdapterProtocolError("sandbox command environment is not allowlisted")


def _parse_checkpoint(item: Mapping[str, Any]) -> RuntimeCheckpoint:
    return RuntimeCheckpoint(str(item["checkpoint_id"]), str(item["run_id"]), int(item["attempt"]),
        str(item["lease_id"]), int(item["event_sequence"]), dict(item.get("logical_state") or {}),
        dict(item.get("working_set") or {}), str(item["runtime_image_digest"]),
        str(item["state_digest"]), int(item["byte_size"]))


def _parse_cost(item: Mapping[str, Any]) -> ActualCost:
    return ActualCost(str(item["run_id"]), int(item["attempt"]), str(item["provider"]),
        str(item["category"]), Decimal(str(item["amount_usd"])), str(item["provider_usage_id"]),
        str(item["rate_version"]), str(item["outcome"]), dict(item.get("metadata") or {}))


def _usage_event(usage: Mapping[str, Any]) -> AdapterEvent:
    try:
        return AdapterEvent(EventKind.COST, str(usage["idempotency_key"]), cost=_parse_cost(usage))
    except (KeyError, TypeError, ValueError, InvalidOperation) as exc:
        raise AdapterProtocolError("Modal provider usage shape is invalid") from exc


def _time(value: Any) -> datetime:
    parsed = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("adapter timestamps must be timezone-aware")
    return parsed


def _safe_working_set(value: Any) -> bool:
    if isinstance(value, Mapping):
        for key, nested in value.items():
            normalized = str(key).lower().replace("-", "_")
            if any(part in normalized for part in ("secret", "credential", "environment", "token", "api_key")):
                return False
            if not _safe_working_set(nested):
                return False
        return True
    if isinstance(value, (list, tuple)):
        return all(_safe_working_set(item) for item in value)
    return value is None or isinstance(value, (str, int, float, bool))


_SHA256 = re.compile(r"sha256:[0-9a-f]{64}")
