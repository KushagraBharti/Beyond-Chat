from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request
from starlette.responses import StreamingResponse

from src.runtime_streaming.models import RunEvent, RunScope, RunSnapshot, StreamConfig
from src.runtime_streaming.router import create_runtime_streaming_router
from src.runtime_streaming.service import RuntimeStreamingService


class Repository:
    def __init__(self) -> None:
        self.scope = RunScope("org-a", "project-a", "run-a")
        self.snapshot_value = RunSnapshot(
            self.scope, "completed", 2, 1, {"answer": "done"}
        )
        self.events = [
            RunEvent("event-1", 1, "message.delta", datetime(2026, 7, 12, tzinfo=UTC), {"text": "a"}),
            RunEvent("event-2", 2, "run.completed", datetime(2026, 7, 12, tzinfo=UTC), {}),
        ]

    async def get_snapshot(self, scope: RunScope):
        return self.snapshot_value if scope == self.scope else None

    async def read_events_after(self, scope: RunScope, *, after_sequence: int, limit: int):
        return [item for item in self.events if item.sequence > after_sequence][:limit]


def app_client(repository: Repository) -> TestClient:
    async def authorize_scope(
        organization_id: str,
        project_id: str,
        run_id: str,
        authorization: str | None = Header(default=None),
    ) -> RunScope:
        if authorization != "Bearer valid":
            raise HTTPException(401, "authentication required")
        scope = RunScope(organization_id, project_id, run_id)
        if scope.organization_id != "org-a" or scope.project_id != "project-a":
            # Deliberately hides whether the run exists in another organization.
            raise HTTPException(404, "run was not found")
        return scope

    app = FastAPI()
    app.include_router(
        create_runtime_streaming_router(
            RuntimeStreamingService(repository, StreamConfig(batch_size=1)), authorize_scope
        )
    )
    return TestClient(app)


def url(suffix: str, *, organization: str = "org-a") -> str:
    return f"/v1/organizations/{organization}/projects/project-a/runs/run-a/{suffix}"


def test_snapshot_requires_auth_and_two_org_guess_is_hidden() -> None:
    client = app_client(Repository())
    assert client.get(url("snapshot")).status_code == 401
    denied = client.get(url("snapshot", organization="org-b"), headers={"Authorization": "Bearer valid"})
    assert denied.status_code == 404
    assert denied.json() == {"detail": "run was not found"}
    allowed = client.get(url("snapshot"), headers={"Authorization": "Bearer valid"})
    assert allowed.json()["projection"] == {"answer": "done"}


def test_sse_header_cursor_precedence_replay_terminal_close_and_headers() -> None:
    response = app_client(Repository()).get(
        url("events") + "?after=0",
        headers={"Authorization": "Bearer valid", "Last-Event-ID": "1"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["cache-control"] == "no-cache, no-transform"
    assert response.headers["connection"] == "keep-alive"
    assert response.headers["x-accel-buffering"] == "no"
    assert "id: 1" not in response.text
    assert "id: 2\nevent: run.completed" in response.text


def test_fresh_terminal_stream_returns_snapshot_and_closes() -> None:
    response = app_client(Repository()).get(url("events"), headers={"Authorization": "Bearer valid"})
    assert response.status_code == 200
    assert response.text.count("event: snapshot") == 1
    assert "id: 2" in response.text


def test_stable_cursor_error_mapping_happens_before_stream_headers() -> None:
    repository = Repository()
    repository.snapshot_value = RunSnapshot(repository.scope, "running", 3, 3, {})
    client = app_client(repository)
    auth = {"Authorization": "Bearer valid"}
    invalid = client.get(url("events") + "?after=01", headers=auth)
    stale = client.get(url("events") + "?after=0", headers=auth)
    ahead = client.get(url("events") + "?after=4", headers=auth)
    assert (invalid.status_code, invalid.json()["detail"]["code"]) == (400, "runtime_stream.cursor_invalid")
    assert (stale.status_code, stale.json()["detail"]["minimum_cursor"]) == (410, 2)
    assert (ahead.status_code, ahead.json()["detail"]["latest_cursor"]) == (409, 3)
    assert not invalid.headers["content-type"].startswith("text/event-stream")


def test_request_disconnect_probe_is_passed_to_service() -> None:
    class ProbeService:
        called = False

        @staticmethod
        def parse_cursor(_header, _query):
            return 0

        async def preflight(self, scope, *, cursor):
            return RunSnapshot(scope, "completed", 0, 1, {})

        async def stream(self, _scope, *, cursor, disconnected, initial_snapshot):
            assert cursor == 0
            assert initial_snapshot.latest_sequence == 0
            self.called = isinstance(await disconnected(), bool)
            if False:
                yield b""

        async def snapshot(self, _scope):  # pragma: no cover - endpoint not used
            raise AssertionError

    async def authorize_scope(organization_id: str, project_id: str, run_id: str) -> RunScope:
        return RunScope(organization_id, project_id, run_id)

    service = ProbeService()
    app = FastAPI()
    app.include_router(create_runtime_streaming_router(service, authorize_scope))  # type: ignore[arg-type]
    response = TestClient(app).get(url("events") + "?after=0")
    assert response.status_code == 200
    assert service.called


def test_quiet_running_reconnect_constructs_response_without_waiting_for_body() -> None:
    class QuietService:
        preflight_called = False
        body_started = False

        @staticmethod
        def parse_cursor(_header, _query):
            return 0

        async def preflight(self, scope, *, cursor):
            assert cursor == 0
            self.preflight_called = True
            return RunSnapshot(scope, "running", 0, 1, {})

        async def stream(self, _scope, *, cursor, disconnected, initial_snapshot):
            self.body_started = True
            await asyncio.Event().wait()
            if False:
                yield b""

        async def snapshot(self, _scope):  # pragma: no cover - endpoint not used
            raise AssertionError

    async def authorize_scope(organization_id: str, project_id: str, run_id: str) -> RunScope:
        return RunScope(organization_id, project_id, run_id)

    service = QuietService()
    router = create_runtime_streaming_router(service, authorize_scope)  # type: ignore[arg-type]
    endpoint = next(route.endpoint for route in router.routes if route.path.endswith("/events"))
    request = Request({"type": "http", "method": "GET", "path": url("events"), "headers": []})

    async def construct() -> StreamingResponse:
        return await endpoint(
            request=request,
            after="0",
            last_event_id=None,
            scope=RunScope("org-a", "project-a", "run-a"),
        )

    response = asyncio.run(asyncio.wait_for(construct(), timeout=0.1))
    assert isinstance(response, StreamingResponse)
    assert service.preflight_called
    assert not service.body_started
