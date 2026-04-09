from __future__ import annotations

def test_health_endpoint() -> None:
    from fastapi.testclient import TestClient
    from src.main import app

    client = TestClient(app)
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_workspace_bootstrap_contract(client: TestClient) -> None:
    response = client.post("/api/auth/bootstrap")

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["workspace"]["id"]
    assert payload["data"]["source"] == "supabase_jwt"
