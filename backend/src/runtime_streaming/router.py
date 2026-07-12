from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from .models import CursorAhead, CursorInvalid, CursorStale, RunNotFound, RunScope, RunSnapshot
from .service import RuntimeStreamingService

ScopeAuthorizer = Callable[..., RunScope | Awaitable[RunScope]]


def create_runtime_streaming_router(
    service: RuntimeStreamingService,
    authorize_scope: ScopeAuthorizer,
) -> APIRouter:
    """Build a mountable router with a mandatory authenticated scope dependency."""

    if not callable(authorize_scope):
        raise TypeError("authorize_scope must be a callable FastAPI dependency")
    router = APIRouter(
        prefix="/v1/organizations/{organization_id}/projects/{project_id}/runs/{run_id}",
        tags=["runtime-streaming"],
    )

    @router.get("/snapshot")
    async def snapshot(scope: RunScope = Depends(authorize_scope)) -> dict[str, object]:
        try:
            return _snapshot_body(await service.snapshot(scope))
        except (RunNotFound, CursorInvalid, CursorAhead, CursorStale) as exc:
            raise _http_error(exc) from exc

    @router.get("/events")
    async def events(
        request: Request,
        after: Annotated[str | None, Query()] = None,
        last_event_id: Annotated[str | None, Header(alias="Last-Event-ID")] = None,
        scope: RunScope = Depends(authorize_scope),
    ) -> StreamingResponse:
        try:
            cursor = service.parse_cursor(last_event_id, after)
            initial_snapshot = await service.preflight(scope, cursor=cursor)
        except (RunNotFound, CursorInvalid, CursorAhead, CursorStale) as exc:
            raise _http_error(exc) from exc

        async def body() -> AsyncIterator[bytes]:
            stream = service.stream(
                scope,
                cursor=cursor,
                disconnected=request.is_disconnected,
                initial_snapshot=initial_snapshot,
            )
            try:
                async for frame in stream:
                    yield frame
            finally:
                await stream.aclose()

        return StreamingResponse(
            body(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    return router


def _snapshot_body(snapshot: RunSnapshot) -> dict[str, object]:
    return {
        "organization_id": snapshot.scope.organization_id,
        "project_id": snapshot.scope.project_id,
        "run_id": snapshot.scope.run_id,
        "state": snapshot.state,
        "latest_sequence": snapshot.latest_sequence,
        "minimum_available_sequence": snapshot.minimum_available_sequence,
        "projection": dict(snapshot.projection),
    }


def _http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, CursorInvalid):
        return HTTPException(400, detail={"code": exc.code, "message": str(exc)})
    if isinstance(exc, RunNotFound):
        return HTTPException(404, detail={"code": exc.code, "message": "run was not found"})
    if isinstance(exc, CursorAhead):
        return HTTPException(
            409,
            detail={"code": exc.code, "message": str(exc), "latest_cursor": exc.latest_cursor},
        )
    if isinstance(exc, CursorStale):
        return HTTPException(
            410,
            detail={"code": exc.code, "message": str(exc), "minimum_cursor": exc.minimum_cursor},
        )
    raise TypeError("unsupported runtime stream error")
