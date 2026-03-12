from __future__ import annotations

from fastapi.testclient import TestClient

from src.main import app


def test_health_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_local_bypass_workspace_bootstrap_contract() -> None:
    client = TestClient(app)
    response = client.post("/api/auth/bootstrap", headers={"X-MVP-Bypass": "true"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["workspace"]["id"]
    assert payload["data"]["source"] in {"local_bypass", "supabase_jwt"}
