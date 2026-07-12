from __future__ import annotations

from datetime import datetime

from .ports import SandboxLifecycle, WorkerPersistence


class RuntimeReconciler:
    def __init__(self, *, persistence: WorkerPersistence, sandboxes: SandboxLifecycle) -> None:
        self.persistence = persistence
        self.sandboxes = sandboxes

    async def reconcile(self, *, now: datetime, active_run_ids: frozenset[str]) -> dict[str, list[str]]:
        expired = await self.persistence.reconcile_expired(now=now)
        orphaned = await self.sandboxes.reconcile(active_run_ids=active_run_ids)
        return {"expired_runs": expired, "terminated_sandboxes": orphaned}
