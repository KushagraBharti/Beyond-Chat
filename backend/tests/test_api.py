from __future__ import annotations

from fastapi.testclient import TestClient

from src.artifact_drafts import build_run_artifact_payload
from src.providers import EXA_NOT_CONFIGURED


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


def test_protected_endpoint_rejects_missing_auth(unauthenticated_client: TestClient):
    response = unauthenticated_client.get("/api/artifact/search")
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
            "content_json": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Artifact body"}]}]},
            "metadata": {"source": "pytest"},
            "tags": ["test"],
            "preview_image": None,
        },
    )
    assert create_response.status_code == 200
    artifact = create_response.json()["data"]
    assert artifact["contentJson"]["type"] == "doc"

    get_response = client.get(f"/api/artifact/{artifact['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["data"]["title"] == "API Test Artifact"
    assert get_response.json()["data"]["contentJson"]["type"] == "doc"

    export_response = client.post(
        f"/api/artifact/{artifact['id']}/export",
        json={"format": "markdown"},
    )
    assert export_response.status_code == 200
    assert export_response.headers["content-type"].startswith("text/markdown")


def test_storage_signed_url_requires_supabase_configuration(client: TestClient, monkeypatch):
    monkeypatch.setattr("src.main.supabase_service.create_signed_artifact_url", lambda *args, **kwargs: None)
    workspace_id = client.app.state.test_workspace_id

    response = client.post(
        "/api/storage/artifacts/signed-url",
        json={"path": f"{workspace_id}/example/file.txt", "expires_in": 600},
    )
    assert response.status_code == 503


# ── Studio E2E integration tests ──────────────────────────────────────────────
# OpenRouter is not configured in CI, so runs may succeed or fail depending on
# env. Either outcome is valid — we assert shape and HTTP contract only.

def test_run_writing_studio_shape(client: TestClient):
    response = client.post(
        "/api/runs",
        json={
            "studio": "writing",
            "title": "Writing E2E test",
            "prompt": "Document:\n\nHello world.\n\nInstruction:\nExpand this into two sentences.",
            "model": "openai/gpt-4o-mini",
        },
    )
    assert response.status_code == 200
    run = response.json()["run"]
    assert run["studio"] == "writing"
    assert run["status"] in ("completed", "failed")
    assert isinstance(run["output"], dict)
    assert isinstance(run["steps"], list)
    assert len(run["steps"]) >= 1


def test_run_research_studio_shape(client: TestClient):
    response = client.post(
        "/api/runs",
        json={
            "studio": "research",
            "title": "Research E2E test",
            "prompt": "What is the impact of AI on software engineering?",
            "model": "openai/gpt-4o-mini",
        },
    )
    assert response.status_code == 200
    run = response.json()["run"]
    assert run["studio"] == "research"
    assert run["status"] in ("completed", "failed")
    assert isinstance(run["steps"], list)


def test_run_finance_studio_shape(client: TestClient):
    response = client.post(
        "/api/runs",
        json={
            "studio": "finance",
            "title": "Finance E2E test",
            "prompt": "Analyze Q4 revenue trends for a SaaS company.",
            "model": "openai/gpt-4o-mini",
        },
    )
    assert response.status_code == 200
    run = response.json()["run"]
    assert run["studio"] == "finance"
    assert run["status"] == "running"
    run = client.get(f"/api/runs/{run['id']}").json()["run"]
    assert run["status"] in ("completed", "failed")
    assert isinstance(run["steps"], list)
    if run["status"] == "completed":
        assert run["output"]["engine"] == "dexter"


def test_run_data_studio_shape(client: TestClient):
    response = client.post(
        "/api/runs",
        json={
            "studio": "data",
            "title": "Data E2E test",
            "prompt": "Summarize this dataset and highlight trends.",
            "model": "openai/gpt-4o-mini",
            "options": {"data_summary": "CSV with 50 rows and 4 columns: date, revenue, users, region"},
        },
    )
    assert response.status_code == 200
    run = response.json()["run"]
    assert run["studio"] == "data"
    assert run["status"] in ("completed", "failed")
    assert isinstance(run["output"], dict)
    assert isinstance(run["steps"], list)
    assert len(run["steps"]) >= 1


def test_run_image_studio_shape(client: TestClient):
    response = client.post(
        "/api/runs",
        json={
            "studio": "image",
            "title": "Image E2E test",
            "prompt": "A futuristic city at sunset",
            "model": "openai/dall-e-3",
            "options": {"ratio": "1:1", "style": "photorealistic", "quality": "High"},
        },
    )
    assert response.status_code == 200
    run = response.json()["run"]
    assert run["studio"] == "image"
    assert run["status"] in ("completed", "failed")
    assert isinstance(run["steps"], list)


def test_run_and_save_artifact_full_cycle(client: TestClient):
    """Run writing studio → save output as artifact → read it back."""
    run_resp = client.post(
        "/api/runs",
        json={
            "studio": "writing",
            "title": "Artifact cycle test",
            "prompt": "Document:\n\nTest content.\n\nInstruction:\nExpand.",
            "model": "openai/gpt-4o-mini",
        },
    )
    assert run_resp.status_code == 200
    run = run_resp.json()["run"]

    artifact_resp = client.post(
        "/api/artifact",
        json={
            "title": "Cycle Test Artifact",
            "type": "document",
            "studio": "writing",
            "content": "Expanded document content.",
            "content_format": "markdown",
            "summary": "Test summary",
            "metadata": {"runId": run["id"]},
            "tags": ["writing", "test"],
        },
    )
    assert artifact_resp.status_code == 200
    artifact = artifact_resp.json()["data"]
    assert artifact["studio"] == "writing"
    assert artifact["type"] == "document"

    get_resp = client.get(f"/api/artifact/{artifact['id']}")
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["id"] == artifact["id"]


def test_run_unsupported_studio_returns_400(client: TestClient):
    response = client.post(
        "/api/runs",
        json={"studio": "unknown_studio", "title": "Bad studio", "prompt": "Test"},
    )
    assert response.status_code == 400


def test_create_run_delegates_to_workflow_module(client: TestClient, monkeypatch):
    async def fake_run_studio_workflow(*, data_store, studio, run_id, workspace_id, prompt, model, options, access_token):
        assert data_store is not None
        assert studio == "writing"
        assert workspace_id
        assert run_id
        assert prompt == "Write a launch note."
        return {
            "format": "markdown",
            "content": "## Delegated\nWorkflow result.",
            "workflow": "writing",
            "artifactType": "document",
        }

    monkeypatch.setattr("src.main.run_studio_workflow", fake_run_studio_workflow)

    response = client.post(
        "/api/runs",
        json={
            "studio": "writing",
            "title": "Delegation test",
            "prompt": "Write a launch note.",
            "model": "openai/gpt-4o-mini",
        },
    )

    assert response.status_code == 200
    run = response.json()["run"]
    assert run["output"]["content"].startswith("## Delegated")
    assert run["output"]["workflow"] == "writing"
    assert [step["step_name"] for step in run["steps"]][:1] == ["prepare"]


def test_compare_endpoint_returns_normalized_results(client: TestClient, monkeypatch):
    async def fake_compare_models(prompt, models):
        assert prompt == "Compare these three models."
        assert models == ["a", "b", "c"]
        return [
            {"model": "a", "status": "completed", "content": "alpha", "latencyMs": 12, "error": None},
            {"model": "b", "status": "completed", "content": "beta", "latencyMs": 18, "error": None},
        ]

    monkeypatch.setattr("src.main.compare_models", fake_compare_models)

    response = client.post(
        "/api/compare",
        json={"prompt": "Compare these three models.", "models": ["a", "b", "c"], "context_ids": []},
    )

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload["results"], list)
    assert payload["results"][0]["model"] == "a"
    assert payload["results"][1]["content"] == "beta"


def test_writing_workflow_records_brief_and_draft_steps(client: TestClient, monkeypatch):
    async def fake_call_openrouter(*, model, messages, temperature, max_tokens):
        assert model == "openai/gpt-4o-mini"
        return "## Draft\nPolished writing output."

    monkeypatch.setattr("src.workflows.call_openrouter", fake_call_openrouter)

    response = client.post(
        "/api/runs",
        json={
            "studio": "writing",
            "title": "Writing workflow test",
            "prompt": "Write a launch note.",
            "model": "openai/gpt-4o-mini",
            "options": {"tone": "confident", "audience": "customers", "format": "announcement"},
        },
    )

    assert response.status_code == 200
    run = response.json()["run"]
    assert run["status"] == "completed"
    assert run["output"]["workflow"] == "writing"
    assert run["output"]["content"].startswith("## Draft")
    assert [step["step_name"] for step in run["steps"]] == ["prepare", "prepare_brief", "draft", "draft"]
    assert [step["status"] for step in run["steps"]] == ["completed", "completed", "running", "completed"]


def test_research_workflow_records_tool_runner_steps_without_exa(client: TestClient, monkeypatch):
    async def fake_exa_search(_query: str):
        raise RuntimeError(EXA_NOT_CONFIGURED)

    async def fake_call_openrouter(*, model, messages, temperature, max_tokens):
        return "## Executive Summary\nFallback report."

    monkeypatch.setattr("src.workflows.exa_search", fake_exa_search)
    monkeypatch.setattr("src.workflows.call_openrouter", fake_call_openrouter)

    response = client.post(
        "/api/runs",
        json={
            "studio": "research",
            "title": "Research workflow test",
            "prompt": "Summarize the state of agentic coding tools.",
            "model": "openai/gpt-4o-mini",
        },
    )

    assert response.status_code == 200
    run = response.json()["run"]
    assert run["status"] == "completed"
    assert run["output"]["workflow"] == "research"
    assert "warning" in run["output"]
    assert [step["step_name"] for step in run["steps"]] == [
        "prepare",
        "plan",
        "search",
        "search",
        "synthesize",
        "synthesize",
    ]


def test_finance_workflow_records_dexter_steps(client: TestClient, monkeypatch):
    async def fake_run_dexter_finance(*, prompt, model, workspace_id, run_id, options, on_event=None):
        assert prompt == "Analyze SaaS revenue trends."
        assert model == "openai/gpt-4o-mini"
        assert workspace_id
        assert run_id
        assert options == {}
        events = [
            {"type": "tool_start", "tool": "get_financials", "args": {"query": prompt}, "toolCallId": "tc_1"},
            {
                "type": "tool_end",
                "tool": "get_financials",
                "args": {"query": prompt},
                "result": "Revenue grew 18%. https://example.com/report",
                "duration": 12,
                "toolCallId": "tc_1",
            },
        ]
        if on_event is not None:
            for event in events:
                await on_event(event)
        return {
            "answer": "## Dexter Memo\nRevenue quality is improving.",
            "events": events,
            "toolCalls": [{"tool": "get_financials", "args": {"query": prompt}, "result": "Revenue grew 18%."}],
            "sources": [{"title": "Q4 report", "url": "https://example.com/report", "snippet": "Revenue grew 18%."}],
            "usage": {"inputTokens": 10, "outputTokens": 20, "totalTokens": 30},
            "sandbox": {"provider": "vercel", "sandboxId": "sbx_test"},
        }

    monkeypatch.setattr("src.workflows.run_dexter_finance", fake_run_dexter_finance)

    response = client.post(
        "/api/runs",
        json={
            "studio": "finance",
            "title": "Finance workflow test",
            "prompt": "Analyze SaaS revenue trends.",
            "model": "openai/gpt-4o-mini",
        },
    )

    assert response.status_code == 200
    run = response.json()["run"]
    assert run["status"] == "running"
    run = client.get(f"/api/runs/{run['id']}").json()["run"]
    assert run["status"] == "completed"
    assert run["output"]["workflow"] == "finance"
    assert run["output"]["engine"] == "dexter"
    assert run["output"]["sources"][0]["title"] == "Q4 report"
    assert [step["step_name"] for step in run["steps"]] == [
        "prepare",
        "dexter_dispatch",
        "get_financials",
        "get_financials",
        "dexter_dispatch",
        "dexter_complete",
    ]


def test_data_workflow_profiles_dataset_before_analysis(client: TestClient, monkeypatch):
    async def fake_call_openrouter(*, model, messages, temperature, max_tokens):
        return "## Overview\nDataset analysis."

    monkeypatch.setattr("src.workflows.call_openrouter", fake_call_openrouter)

    response = client.post(
        "/api/runs",
        json={
            "studio": "data",
            "title": "Data workflow test",
            "prompt": "Highlight trends in this dataset.",
            "model": "openai/gpt-4o-mini",
            "options": {
                "data_summary": "Monthly revenue by region.",
                "row_count": 12,
                "columns": ["month", "revenue", "region"],
            },
        },
    )

    assert response.status_code == 200
    run = response.json()["run"]
    assert run["status"] == "completed"
    assert run["output"]["workflow"] == "data"
    assert run["output"]["profile"]["rowCount"] == 12
    assert [step["step_name"] for step in run["steps"]] == ["prepare", "profile_dataset", "analyze", "analyze"]


def test_image_workflow_records_enhance_generate_and_upload_steps(client: TestClient, monkeypatch):
    async def fake_call_openrouter(*, model, messages, temperature, max_tokens):
        return "Enhanced futuristic city prompt"

    async def fake_call_openrouter_image(*, model, prompt, aspect_ratio, image_size):
        return [(b"image-bytes", "image/png")]

    def fake_upload_image_file(*, workspace_id, run_id, filename, content_type, image_bytes, access_token):
        return {
            "bucket": "artifacts",
            "path": f"{workspace_id}/images/{run_id}/{filename}",
            "signed_url": "https://example.com/signed-image",
        }

    monkeypatch.setattr("src.workflows.call_openrouter", fake_call_openrouter)
    monkeypatch.setattr("src.workflows.call_openrouter_image", fake_call_openrouter_image)
    monkeypatch.setattr("src.workflows.supabase_service.upload_image_file", fake_upload_image_file)

    response = client.post(
        "/api/runs",
        json={
            "studio": "image",
            "title": "Image workflow test",
            "prompt": "A futuristic city at sunset",
            "model": "openai/dall-e-3",
            "options": {"ratio": "16:9", "style": "photorealistic", "quality": "High"},
        },
    )

    assert response.status_code == 200
    run = response.json()["run"]
    assert run["status"] == "completed"
    assert run["output"]["workflow"] == "image"
    assert run["output"]["count"] == 1
    assert run["output"]["urls"] == ["https://example.com/signed-image"]
    assert [step["step_name"] for step in run["steps"]] == [
        "prepare",
        "collect_constraints",
        "enhance_prompt",
        "enhance_prompt",
        "generate",
        "generate",
        "upload",
        "upload",
    ]


def test_build_run_artifact_payload_handles_text_and_image_runs():
    writing_run = {
        "id": "run-writing",
        "studio": "writing",
        "title": "Writing output",
        "prompt": "Write a launch note.",
        "model": "openai/gpt-4o-mini",
        "status": "completed",
        "options": {},
        "output": {
            "format": "markdown",
            "content": "## Draft\nPolished writing output.",
            "workflow": "writing",
            "artifactType": "document",
        },
    }
    writing_payload = build_run_artifact_payload(run=writing_run)
    assert writing_payload is not None
    assert writing_payload["type"] == "document"
    assert writing_payload["content_format"] == "markdown"
    assert writing_payload["content"].startswith("## Draft")

    image_run = {
        "id": "run-image",
        "studio": "image",
        "title": "Image output",
        "prompt": "A futuristic city at sunset",
        "model": "openai/dall-e-3",
        "status": "completed",
        "options": {},
        "output": {
            "format": "image",
            "workflow": "image",
            "enhanced_prompt": "Vivid futuristic city skyline",
            "urls": ["https://example.com/generated-image.png"],
            "paths": ["workspace/images/run-image/image_1.png"],
            "artifactType": "image",
        },
    }
    image_payload = build_run_artifact_payload(run=image_run)
    assert image_payload is not None
    assert image_payload["type"] == "image"
    assert image_payload["preview_image"] == "https://example.com/generated-image.png"
    assert image_payload["content_format"] == "plain"


def test_save_run_as_artifact_for_writing_run(client: TestClient, monkeypatch):
    async def fake_call_openrouter(*, model, messages, temperature, max_tokens):
        return "## Draft\nPolished writing output."

    monkeypatch.setattr("src.workflows.call_openrouter", fake_call_openrouter)

    run_response = client.post(
        "/api/runs",
        json={
            "studio": "writing",
            "title": "Artifact save test",
            "prompt": "Write a launch note.",
            "model": "openai/gpt-4o-mini",
        },
    )
    assert run_response.status_code == 200
    run = run_response.json()["run"]

    save_response = client.post(
        f"/api/runs/{run['id']}/artifact",
        json={"title": "Saved writing artifact"},
    )
    assert save_response.status_code == 200
    artifact = save_response.json()["data"]
    assert artifact["title"] == "Saved writing artifact"
    assert artifact["studio"] == "writing"
    assert artifact["type"] == "document"
    assert artifact["content"].startswith("## Draft")


def test_save_run_as_artifact_for_image_run_uses_preview_image(client: TestClient, monkeypatch):
    async def fake_call_openrouter(*, model, messages, temperature, max_tokens):
        return "Enhanced futuristic city prompt"

    async def fake_call_openrouter_image(*, model, prompt, aspect_ratio, image_size):
        return [(b"image-bytes", "image/png")]

    def fake_upload_image_file(*, workspace_id, run_id, filename, content_type, image_bytes, access_token):
        return {
            "bucket": "artifacts",
            "path": f"{workspace_id}/images/{run_id}/{filename}",
            "signed_url": "https://example.com/signed-image",
        }

    monkeypatch.setattr("src.workflows.call_openrouter", fake_call_openrouter)
    monkeypatch.setattr("src.workflows.call_openrouter_image", fake_call_openrouter_image)
    monkeypatch.setattr("src.workflows.supabase_service.upload_image_file", fake_upload_image_file)

    run_response = client.post(
        "/api/runs",
        json={
            "studio": "image",
            "title": "Image artifact save test",
            "prompt": "A futuristic city at sunset",
            "model": "openai/dall-e-3",
            "options": {"ratio": "16:9", "style": "photorealistic", "quality": "High"},
        },
    )
    assert run_response.status_code == 200
    run = run_response.json()["run"]

    save_response = client.post(f"/api/runs/{run['id']}/artifact", json={})
    assert save_response.status_code == 200
    artifact = save_response.json()["data"]
    assert artifact["studio"] == "image"
    assert artifact["type"] == "image"
    assert artifact["previewImage"] == "https://example.com/signed-image"
    assert artifact["contentFormat"] == "plain"
