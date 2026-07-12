"""Narrow backend ports; production adapters belong to the canonical API composition layer."""

from typing import Mapping, Protocol


class CollaborationAuthorizationPort(Protocol):
    async def require_permission(
        self, *, organization_id: str, project_id: str, user_id: str, permission: str
    ) -> int:
        """Authorize and return the current grant revision."""


class CollaborationRealtimePort(Protocol):
    async def publish(
        self, *, project_id: str, channel: str, event_type: str, payload: Mapping[str, object]
    ) -> None: ...

    async def revoke(self, *, project_id: str, user_id: str, grant_revision: int) -> None:
        """Evict active presence/editor sessions after durable revocation commits."""
