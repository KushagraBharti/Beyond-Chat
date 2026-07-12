from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException, status

from ..authorization.policy import Principal
from ..identity.authkit import require_csrf, require_principal
from ..providers import call_openrouter, exa_search, provider_statuses
from ..supabase_service import supabase_service
from ..workflows import run_studio_workflow
from .coordinator import MemoryOutputStore, RuntimeCoordinator
from .in_memory import AllowPolicy, InMemoryRuntimeQueue, InMemoryRuntimeRepository, OwnedConnections
from .router import RuntimePrincipal, create_runtime_router
from .supabase_adapter import (
    SupabaseGatewayPolicyResolver,
    SupabaseOutputStore,
    SupabasePostgresRuntimeRepository,
    SupabaseRuntimeQueue,
)


def runtime_control_plane_enabled() -> bool:
    """Production execution is fail-closed until migration review and rollout authorization."""

    return os.getenv("BEYOND_RUNTIME_CONTROL_PLANE_ENABLED", "false").strip().lower() == "true"


class NoExternalConnections:
    """Connection-backed tools remain denied until the canonical connection table is admitted."""

    def is_owned(self, *, connection_id: str, organization_id: str, actor_id: str) -> bool:
        del connection_id, organization_id, actor_id
        return False


@dataclass(frozen=True)
class ExistingGatewayPorts:
    """Existing provider entrypoints, available only to a separately started trusted worker."""

    model: Any = call_openrouter
    research_tool: Any = exa_search
    studio_tool: Any = run_studio_workflow
    provider_status: Any = provider_statuses


@dataclass(frozen=True)
class RuntimeControlPlane:
    coordinator: RuntimeCoordinator
    gateways: ExistingGatewayPorts
    enabled: bool


def build_runtime_control_plane() -> RuntimeControlPlane:
    enabled = runtime_control_plane_enabled()
    if enabled:
        client = supabase_service.client()
        if client is None:
            raise RuntimeError("runtime control plane requires an app-server Supabase service client")
        repository = SupabasePostgresRuntimeRepository(client)
        coordinator = RuntimeCoordinator(
            repository=repository,
            queue=SupabaseRuntimeQueue(client),
            policy=SupabaseGatewayPolicyResolver(client),
            connections=NoExternalConnections(),
            outputs=SupabaseOutputStore(client),
        )
    else:
        coordinator = RuntimeCoordinator(
            repository=InMemoryRuntimeRepository(),
            queue=InMemoryRuntimeQueue(),
            policy=AllowPolicy(),
            connections=OwnedConnections(),
            outputs=MemoryOutputStore(),
        )
    return RuntimeControlPlane(coordinator, ExistingGatewayPorts(), enabled)


runtime_control_plane = build_runtime_control_plane()


async def require_runtime_principal(
    principal: Principal = Depends(require_principal),
) -> RuntimePrincipal:
    if not runtime_control_plane.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Runtime control plane is disabled pending migration and rollout approval.",
        )
    return RuntimePrincipal(actor_id=principal.profile_id, organization_id=principal.organization_id)


async def require_runtime_mutation(_csrf: None = Depends(require_csrf)) -> None:
    if not runtime_control_plane.enabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Runtime control plane is disabled.")


router = create_runtime_router(
    runtime_control_plane.coordinator,
    require_runtime_principal,
    require_runtime_mutation,
)
