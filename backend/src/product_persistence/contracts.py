from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol


class NotFoundError(LookupError):
    pass


class ConflictError(RuntimeError):
    pass


class ProductPersistenceUnavailable(RuntimeError):
    pass


@dataclass(frozen=True)
class Scope:
    organization_id: str
    project_id: str | None = None
    team_id: str | None = None


@dataclass(frozen=True)
class ProductRecord:
    id: str
    kind: str
    scope: Scope
    state: str
    version: int
    payload: dict[str, Any]
    created_by: str
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class CapabilityRun:
    run_id: str
    organization_id: str
    project_id: str
    actor_id: str
    agent_version_id: str
    state: str


class ProductRepository(Protocol):
    """Tenant-scoped atomic storage contract.

    Implementations must enforce every scope component, bind idempotency keys to
    a request digest, and make updates compare-and-swap on ``expected_version``.
    """

    def list(self, *, kind: str, scope: Scope, states: tuple[str, ...] = ()) -> list[ProductRecord]: ...

    def get(self, *, kind: str, record_id: str, scope: Scope) -> ProductRecord | None: ...

    def create_once(
        self,
        *,
        kind: str,
        scope: Scope,
        actor_id: str,
        idempotency_key: str,
        request_digest: str,
        state: str,
        payload: Mapping[str, Any],
    ) -> ProductRecord: ...

    def update(
        self,
        *,
        kind: str,
        record_id: str,
        scope: Scope,
        actor_id: str,
        expected_version: int,
        state: str | None = None,
        payload: Mapping[str, Any] | None = None,
    ) -> ProductRecord: ...

    def append_once(
        self,
        *,
        kind: str,
        parent_kind: str,
        parent_id: str,
        scope: Scope,
        actor_id: str,
        idempotency_key: str,
        request_digest: str,
        state: str,
        payload: Mapping[str, Any],
    ) -> ProductRecord: ...

    def get_capability_run(self, *, run_id: str) -> CapabilityRun | None: ...

    def record_capability_resolution(
        self,
        *,
        run: CapabilityRun,
        actor_id: str,
        projection_digest: str,
        metadata: Mapping[str, Any],
        approval_claims: tuple[Mapping[str, Any], ...] = (),
    ) -> None: ...
