from __future__ import annotations

from contextlib import contextmanager

from fastapi.testclient import TestClient

from src.config import settings


@contextmanager
def override_auth_settings(*, environment: str, allow_local_auth_bypass: bool):
    original_environment = settings.environment
    original_bypass = settings.allow_local_auth_bypass
    object.__setattr__(settings, "environment", environment)
    object.__setattr__(settings, "allow_local_auth_bypass", allow_local_auth_bypass)
    try:
        yield
    finally:
        object.__setattr__(settings, "environment", original_environment)
        object.__setattr__(settings, "allow_local_auth_bypass", original_bypass)


def test_health_endpoint(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_provider_status_contract(client: TestClient):
    response = client.get("/api/status/providers")
    assert response.status_code == 200
    payload = response.json()
    assert "providers" in payload
    assert "openrouter" in payload["providers"]
    assert "googleCalendar" in payload["providers"]


def test_bootstrap_auth_returns_workspace_payload(client: TestClient):
    response = client.post("/api/auth/bootstrap")
    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["workspace"]["id"]
    assert payload["role"] == "admin"


def test_artifact_search_returns_seeded_items(client: TestClient):
    response = client.get("/api/artifact/search")
    assert response.status_code == 200
    items = response.json()["data"]
    assert len(items) >= 1
    assert "title" in items[0]


def test_protected_endpoint_rejects_missing_auth_when_bypass_disabled(
    client: TestClient,
):
    with override_auth_settings(
        environment="production", allow_local_auth_bypass=False
    ):
        response = client.get("/api/artifact/search")
    assert response.status_code == 401


def test_artifact_create_read_and_export_cycle(client: TestClient):
    create_response = client.post(
        "/api/artifact",
        json={
            "title": "API Test Artifact",
            "type": "document",
            "studio": "writing",
            "content": "Artifact body",
            "summary": "Short summary",
            "content_format": "markdown",
            "metadata": {"source": "pytest"},
            "tags": ["test"],
            "preview_image": None,
        },
    )
    assert create_response.status_code == 200
    artifact = create_response.json()["data"]

    get_response = client.get(f"/api/artifact/{artifact['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["data"]["title"] == "API Test Artifact"

    export_response = client.post(
        f"/api/artifact/{artifact['id']}/export",
        json={"format": "markdown"},
    )
    assert export_response.status_code == 200
    assert export_response.headers["content-type"].startswith("text/markdown")


def test_storage_signed_url_requires_supabase_configuration(client: TestClient):
    response = client.post(
        "/api/storage/artifacts/signed-url",
        json={"path": "local-workspace/example/file.txt", "expires_in": 600},
    )
    assert response.status_code == 503
