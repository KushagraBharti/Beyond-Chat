from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from src.main import app


class ApiContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health_endpoint(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_provider_status_contract(self) -> None:
        response = self.client.get("/api/status/providers")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("providers", payload)
        self.assertIn("openrouter", payload["providers"])
        self.assertIn("googleCalendar", payload["providers"])

    def test_artifact_list_returns_seeded_items(self) -> None:
        response = self.client.get("/api/artifacts")
        self.assertEqual(response.status_code, 200)
        items = response.json()["items"]
        self.assertGreaterEqual(len(items), 1)
        self.assertIn("title", items[0])


if __name__ == "__main__":
    unittest.main()
