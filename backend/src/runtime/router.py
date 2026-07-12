from __future__ import annotations

from collections.abc import Awaitable, Callable
import os
from typing import Annotated
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from .coordinator import RuntimeConflict, RuntimeCoordinator
from .models import DurableEvent, RuntimeRun


class RuntimePrincipal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    actor_id: str = Field(min_length=3, max_length=128)
    organization_id: str = Field(min_length=3, max_length=128)


class CreateRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    run_id: str = Field(min_length=3, max_length=128)
    project_id: str = Field(min_length=3, max_length=128)
    agent_version_id: str = Field(min_length=3, max_length=128)


class ResolveApprovalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: str = Field(pattern="^(approved|denied)$")
    reason: str | None = Field(default=None, max_length=1000)


class ExecuteGeneralAgentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(min_length=1, max_length=100_000)
    project_id: str = Field(min_length=3, max_length=128)
    run_id: str | None = Field(default=None, min_length=3, max_length=128)
    model: str | None = Field(default=None, min_length=3, max_length=200)
    agent_version_id: str = Field(default="general:v1", min_length=3, max_length=128)
    instructions: str | None = Field(default=None, min_length=1, max_length=32_000)


Authenticator = Callable[[], RuntimePrincipal | Awaitable[RuntimePrincipal]]
MutationGuard = Callable[[], None | Awaitable[None]]


def create_runtime_router(
    coordinator: RuntimeCoordinator,
    authenticate: Authenticator,
    mutation_guard: MutationGuard | None = None,
) -> APIRouter:
    """Return a deny-by-default integration router for the manager to mount in `main.py`."""

    router = APIRouter(prefix="/api/runtime", tags=["runtime"], dependencies=[Depends(authenticate)])
    guard = mutation_guard or (lambda: None)

    @router.post("/runs", status_code=status.HTTP_202_ACCEPTED)
    async def create_run(
        body: CreateRunRequest,
        idempotency_key: Annotated[str, Header(alias="Idempotency-Key", min_length=8, max_length=200)],
        principal: RuntimePrincipal = Depends(authenticate),
        _mutation: None = Depends(guard),
    ) -> dict:
        run = coordinator.accept(RuntimeRun(
            run_id=body.run_id,
            organization_id=principal.organization_id,
            project_id=body.project_id,
            actor_id=principal.actor_id,
            agent_version_id=body.agent_version_id,
        ), idempotency_key=idempotency_key)
        return {"run_id": run.run_id, "state": run.state, "version": run.version}

    @router.post("/agents/general:execute")
    async def execute_general_agent(
        body: ExecuteGeneralAgentRequest,
        principal: RuntimePrincipal = Depends(authenticate),
        _mutation: None = Depends(guard),
    ) -> dict:
        run_id = body.run_id or str(uuid4())
        effective_prompt = f"Agent instructions:\n{body.instructions}\n\nUser request:\n{body.prompt}" if body.instructions else body.prompt
        coordinator.accept(RuntimeRun(
            run_id=run_id,
            organization_id=principal.organization_id,
            project_id=body.project_id,
            actor_id=principal.actor_id,
            agent_version_id=body.agent_version_id,
        ), idempotency_key=f"general:{run_id}")
        coordinator.append_event(DurableEvent(
            run_id=run_id, sequence=None, event_type="input.accepted",
            payload={"prompt": effective_prompt, "agent": body.agent_version_id},
            idempotency_key=f"general:{run_id}:input",
        ))
        url = os.getenv("MODAL_RUNTIME_URL", "").strip()
        secret = os.getenv("MODAL_RUNTIME_SHARED_SECRET", "").strip()
        if not url or not secret:
            raise HTTPException(status_code=503, detail="Modal General Agent is not configured")
        payload = {
            "prompt": effective_prompt,
            "organization_id": principal.organization_id,
            "project_id": body.project_id,
            "run_id": run_id,
            **({"model": body.model} if body.model else {}),
        }
        try:
            async with httpx.AsyncClient(timeout=900) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Authorization": f"Bearer {secret}"},
                )
                response.raise_for_status()
                result = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            coordinator.append_event(DurableEvent(
                run_id=run_id, sequence=None, event_type="run.failed",
                payload={"reason": "modal_execution_failed"},
                idempotency_key=f"general:{run_id}:failed",
            ))
            raise HTTPException(status_code=502, detail="Modal General Agent execution failed") from exc
        if not isinstance(result, dict) or not str(result.get("text", "")).strip():
            raise HTTPException(status_code=502, detail="Modal General Agent returned no output")
        coordinator.append_event(DurableEvent(
            run_id=run_id, sequence=None, event_type="output.generated",
            payload={"text": str(result["text"]), "agent": body.agent_version_id},
            idempotency_key=f"general:{run_id}:output",
        ))
        return {**result, "run_id": run_id}

    @router.post("/runs/{run_id}/cancel", status_code=status.HTTP_202_ACCEPTED)
    async def cancel_run(
        run_id: str, principal: RuntimePrincipal = Depends(authenticate),
        _mutation: None = Depends(guard),
    ) -> dict:
        run = coordinator.repository.get_run(run_id)
        if run is None or run.organization_id != principal.organization_id:
            raise HTTPException(status_code=404, detail="run not found")
        if run.actor_id != principal.actor_id:
            raise HTTPException(status_code=403, detail="run actor mismatch")
        canceled = coordinator.cancel(run_id=run_id, actor_id=principal.actor_id)
        return {"run_id": canceled.run_id, "state": canceled.state, "version": canceled.version}

    @router.post("/approvals/{approval_id}/resolve")
    async def resolve_approval(
        approval_id: str, body: ResolveApprovalRequest,
        principal: RuntimePrincipal = Depends(authenticate),
        _mutation: None = Depends(guard),
    ) -> dict:
        try:
            run = coordinator.resolve_approval(
                approval_id=approval_id, organization_id=principal.organization_id, actor_id=principal.actor_id,
                decision=body.decision, reason=body.reason,
            )
        except (RuntimeConflict, RuntimeError) as exc:
            raise HTTPException(status_code=404, detail="approval not found") from exc
        if run.organization_id != principal.organization_id:
            raise HTTPException(status_code=404, detail="approval not found")
        return {"run_id": run.run_id, "state": run.state, "version": run.version}

    @router.get("/runs/{run_id}/events")
    async def replay_events(
        run_id: str,
        after: int = 0,
        principal: RuntimePrincipal = Depends(authenticate),
    ) -> dict:
        run = coordinator.repository.get_run(run_id)
        if run is None or run.organization_id != principal.organization_id:
            raise HTTPException(status_code=404, detail="run not found")
        events = coordinator.repository.events_after(run_id, after)
        return {"events": [{"sequence": item.sequence, "event_type": item.event_type, "payload": item.payload} for item in events], "cursor": events[-1].sequence if events else after}

    return router
