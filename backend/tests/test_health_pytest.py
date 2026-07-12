from __future__ import annotations

def test_health_endpoint() -> None:
    from fastapi.testclient import TestClient
    from src.main import app

    client = TestClient(app)
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_workspace_bootstrap_requires_auth(unauthenticated_client: TestClient) -> None:
    response = unauthenticated_client.post("/api/auth/bootstrap")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication is required for this endpoint."
