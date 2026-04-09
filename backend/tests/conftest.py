from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.auth import RequestContext, require_request_context
from src.main import app
from src.store import get_local_store


def pytest_configure() -> None:
    app.dependency_overrides = {}


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    store = get_local_store()
    workspace = store.get_workspace()

    context = RequestContext(
        user_id="test-user",
        workspace_id=workspace["id"],
        email="test@example.com",
        source="supabase_jwt",
        access_token="test-token",
    )

    async def fake_require_request_context() -> RequestContext:
        return context

    def fake_resolve_request_context(*_args, **_kwargs) -> RequestContext:
        return context

    def fake_get_workspace_payload(_context: RequestContext, bootstrap: bool = False) -> dict[str, object]:
        return {
            "workspace": workspace,
            "role": "admin",
            "created": bootstrap,
            "source": "supabase_jwt",
        }

    app.dependency_overrides[require_request_context] = fake_require_request_context
    monkeypatch.setattr("src.main.resolve_request_context", fake_resolve_request_context)
    monkeypatch.setattr("src.main.get_runtime_store", lambda _context: store)
    monkeypatch.setattr("src.main.get_workspace_payload", fake_get_workspace_payload)
    try:
        return TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client() -> TestClient:
    app.dependency_overrides.clear()
    return TestClient(app)
