from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.auth import RequestContext, require_request_context
from src.main import app


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class FakeRuntimeStore:
    def __init__(self) -> None:
        self.workspaces: dict[str, dict[str, Any]] = {}
        self.reminders: dict[str, list[dict[str, Any]]] = {}
        self.collections: dict[str, list[dict[str, Any]]] = {}
        self.threads: dict[str, dict[str, Any]] = {}
        self.artifacts: dict[str, dict[str, Any]] = {}
        self.runs: dict[str, dict[str, Any]] = {}
        self.default_workspace_id = "test-workspace"
        self._seed_workspace(self.default_workspace_id, "Beyond Chat Test Workspace")

    def _ensure_workspace_buckets(self, workspace_id: str) -> None:
        self.reminders.setdefault(workspace_id, [])
        self.collections.setdefault(workspace_id, [])
        self.threads.setdefault(workspace_id, {})
        self.artifacts.setdefault(workspace_id, {})
        self.runs.setdefault(workspace_id, {})

    def _seed_workspace(self, workspace_id: str, workspace_name: str) -> None:
        if workspace_id not in self.workspaces:
            self.workspaces[workspace_id] = {
                "id": workspace_id,
                "name": workspace_name,
                "created_at": utc_now(),
            }
            self._ensure_workspace_buckets(workspace_id)
        now = utc_now()
        if not self.reminders[workspace_id]:
            for hours, title, note, source in (
                (2, "Morning review", "Skim research notes and prioritize the next artifact.", "internal"),
                (6, "Calendar sync", "Reconnect Google Calendar after OAuth credentials are ready.", "google_calendar"),
                (26, "Artifact cleanup", "Tag and organize recent documents before export.", "internal"),
            ):
                self.reminders[workspace_id].append(
                    {
                        "id": str(uuid4()),
                        "workspace_id": workspace_id,
                        "title": title,
                        "note": note,
                        "due_at": (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat(),
                        "status": "open",
                        "source": source,
                        "created_at": now,
                    }
                )
        if not self.collections[workspace_id]:
            for kind, title in (("project", "Spring Launch"), ("group", "Marketing Sync")):
                self.collections[workspace_id].append(
                    {
                        "id": str(uuid4()),
                        "workspace_id": workspace_id,
                        "kind": kind,
                        "title": title,
                        "created_at": now,
                        "updated_at": now,
                    }
                )
        if not self.threads[workspace_id]:
            seeded = [
                ("Shipping checklist", self.collections[workspace_id][0]["id"], "project", "chat", "openai/gpt-4o-mini"),
                ("Q2 launch prep", self.collections[workspace_id][1]["id"], "group", "chat", "openai/gpt-4o-mini"),
                ("Daily workspace note", None, "chat", "chat", "openai/gpt-4o-mini"),
            ]
            for title, collection_id, collection_type, studio, model in seeded:
                thread_id = str(uuid4())
                self.threads[workspace_id][thread_id] = {
                    "id": thread_id,
                    "workspace_id": workspace_id,
                    "collection_id": collection_id,
                    "collection_type": collection_type,
                    "studio": studio,
                    "title": title,
                    "model": model,
                    "prompt": f"Summarize the current status for {title.lower()}.",
                    "created_at": now,
                    "updated_at": now,
                    "metadata": {},
                    "messages": [
                        {
                            "id": str(uuid4()),
                            "thread_id": thread_id,
                            "role": "user",
                            "content": f"Summarize the current status for {title.lower()}.",
                            "created_at": now,
                            "metadata": {},
                        },
                        {
                            "id": str(uuid4()),
                            "thread_id": thread_id,
                            "role": "assistant",
                            "content": "This thread is ready for a live provider. For now it uses in-memory local data and disconnected-safe UI.",
                            "created_at": now,
                            "metadata": {},
                        },
                    ],
                }
        if not self.artifacts[workspace_id]:
            for artifact in (
                {
                    "type": "document",
                    "title": "Launch narrative draft",
                    "content": "A long-form launch draft with positioning notes and rollout tasks.",
                    "summary": "A long-form launch draft with positioning notes and rollout tasks.",
                    "preview_image": None,
                    "tags": ["writing", "launch"],
                    "studio": "writing",
                    "metadata": {"wordCount": 620},
                },
                {
                    "type": "image",
                    "title": "Hero image concept",
                    "content": "A cinematic hero image concept for the homepage.",
                    "summary": "Homepage hero concept",
                    "preview_image": "https://images.unsplash.com/photo-1527430253228-e93688616381?w=1200",
                    "tags": ["image", "hero"],
                    "studio": "image",
                    "metadata": {"model": "google/gemini-2.5-flash-image", "ratio": "4:3", "quality": "High"},
                },
                {
                    "type": "report",
                    "title": "Research synthesis",
                    "content": "A compact research summary with citations and next steps.",
                    "summary": "A compact research summary with citations and next steps.",
                    "preview_image": None,
                    "tags": ["research"],
                    "studio": "research",
                    "metadata": {"sources": 4},
                },
            ):
                self.upsert_artifact(
                    workspace_id,
                    title=artifact["title"],
                    artifact_type=artifact["type"],
                    studio=artifact["studio"],
                    content=artifact["content"],
                    summary=artifact["summary"],
                    content_format="plain",
                    metadata=artifact["metadata"],
                    tags=artifact["tags"],
                    preview_image=artifact["preview_image"],
                )

    def _workspace_or_none(self, workspace_id: str | None) -> dict[str, Any] | None:
        if workspace_id is None:
            workspace_id = next(iter(self.workspaces), None)
        if workspace_id is None or workspace_id not in self.workspaces:
            return None
        return deepcopy(self.workspaces[workspace_id])

    def get_workspace(self, workspace_id: str | None = None) -> dict[str, Any] | None:
        return self._workspace_or_none(workspace_id)

    def ensure_workspace(self, workspace_id: str, workspace_name: str) -> dict[str, Any]:
        if workspace_id not in self.workspaces:
            self.workspaces[workspace_id] = {
                "id": workspace_id,
                "name": workspace_name,
                "created_at": utc_now(),
            }
            self._ensure_workspace_buckets(workspace_id)
            self._seed_workspace(workspace_id, workspace_name)
        return deepcopy(self.workspaces[workspace_id])

    def list_reminders(self, workspace_id: str) -> list[dict[str, Any]]:
        return [deepcopy(item) for item in sorted(self.reminders.get(workspace_id, []), key=lambda item: item["due_at"])]

    def list_collections(self, workspace_id: str) -> list[dict[str, Any]]:
        items = self.collections.get(workspace_id, [])
        return [deepcopy(item) for item in sorted(items, key=lambda item: item["updated_at"], reverse=True)]

    def list_threads(self, workspace_id: str) -> list[dict[str, Any]]:
        threads = self.threads.get(workspace_id, {})
        items = sorted(threads.values(), key=lambda item: item["updated_at"], reverse=True)
        return [{k: deepcopy(v) for k, v in thread.items() if k != "messages"} for thread in items]

    def create_thread(
        self,
        workspace_id: str,
        *,
        title: str,
        collection_id: str | None,
        collection_type: str,
        studio: str,
        model: str,
        prompt: str | None,
    ) -> dict[str, Any]:
        self.ensure_workspace(workspace_id, self.workspaces.get(workspace_id, {}).get("name", "Beyond Chat Workspace"))
        thread_id = str(uuid4())
        now = utc_now()
        self.threads[workspace_id][thread_id] = {
            "id": thread_id,
            "workspace_id": workspace_id,
            "collection_id": collection_id,
            "collection_type": collection_type,
            "studio": studio,
            "title": title,
            "model": model,
            "prompt": prompt,
            "created_at": now,
            "updated_at": now,
            "metadata": {},
            "messages": [],
        }
        return deepcopy(self.threads[workspace_id][thread_id])

    def get_thread(self, workspace_id: str, thread_id: str) -> dict[str, Any] | None:
        thread = self.threads.get(workspace_id, {}).get(thread_id)
        return deepcopy(thread) if thread is not None else None

    def add_message(
        self,
        workspace_id: str,
        thread_id: str,
        role: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        thread = self.threads.get(workspace_id, {}).get(thread_id)
        if thread is None:
            raise RuntimeError("Thread not found.")
        message = {
            "id": str(uuid4()),
            "thread_id": thread_id,
            "role": role,
            "content": content,
            "created_at": utc_now(),
            "metadata": metadata or {},
        }
        thread["messages"].append(message)
        thread["updated_at"] = message["created_at"]
        return deepcopy(message)

    def list_artifacts(
        self,
        workspace_id: str,
        *,
        query: str | None = None,
        studio: str | None = None,
        artifact_type: str | None = None,
        tags: list[str] | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 24,
    ) -> list[dict[str, Any]]:
        items = [artifact for artifact in self.artifacts.get(workspace_id, {}).values()]
        if studio:
            items = [item for item in items if item["studio"] == studio]
        if artifact_type:
            items = [item for item in items if item["type"] == artifact_type]
        if date_from:
            items = [item for item in items if item["created_at"] >= date_from]
        if date_to:
            items = [item for item in items if item["created_at"] <= date_to]
        if query:
            needle = query.casefold()
            items = [
                item
                for item in items
                if needle in item["title"].casefold()
                or needle in item["content"].casefold()
                or (item.get("summary") or "").casefold().find(needle) >= 0
            ]
        if tags:
            normalized = {tag.casefold() for tag in tags}
            items = [
                item
                for item in items
                if normalized.issubset({tag.casefold() for tag in item.get("tags", [])})
            ]
        items = sorted(items, key=lambda item: item["updated_at"], reverse=True)[:limit]
        return [deepcopy(item) for item in items]

    def get_artifact(self, workspace_id: str, artifact_id: str) -> dict[str, Any] | None:
        artifact = self.artifacts.get(workspace_id, {}).get(artifact_id)
        return deepcopy(artifact) if artifact is not None else None

    def upsert_artifact(
        self,
        workspace_id: str,
        *,
        title: str,
        artifact_type: str,
        studio: str,
        content: str,
        summary: str | None,
        content_format: str,
        metadata: dict[str, Any],
        tags: list[str],
        preview_image: str | None,
        artifact_id: str | None = None,
        content_json: Any | None = None,
        source_run_id: str | None = None,
        storage_path: str | None = None,
    ) -> dict[str, Any]:
        self.ensure_workspace(workspace_id, self.workspaces.get(workspace_id, {}).get("name", "Beyond Chat Workspace"))
        now = utc_now()
        existing = self.artifacts[workspace_id].get(artifact_id) if artifact_id else None
        artifact = {
            "id": artifact_id or str(uuid4()),
            "workspace_id": workspace_id,
            "type": artifact_type,
            "title": title,
            "content": content,
            "contentJson": content_json,
            "contentFormat": content_format,
            "summary": summary,
            "previewImage": preview_image,
            "tags": list(tags),
            "studio": studio,
            "metadata": dict(metadata),
            "created_at": existing["created_at"] if existing else now,
            "updated_at": now,
            "storage_path": storage_path,
            "source_run_id": source_run_id,
        }
        self.artifacts[workspace_id][artifact["id"]] = artifact
        return deepcopy(artifact)

    def create_run(
        self,
        workspace_id: str,
        *,
        studio: str,
        title: str,
        prompt: str,
        model: str,
        options: dict[str, Any],
    ) -> dict[str, Any]:
        self.ensure_workspace(workspace_id, self.workspaces.get(workspace_id, {}).get("name", "Beyond Chat Workspace"))
        run_id = str(uuid4())
        run = {
            "id": run_id,
            "workspace_id": workspace_id,
            "studio": studio,
            "title": title,
            "prompt": prompt,
            "status": "running",
            "model": model,
            "options": dict(options),
            "output": {},
            "error_message": None,
            "created_at": utc_now(),
            "completed_at": None,
            "metadata": {},
            "steps": [],
        }
        self.runs[workspace_id][run_id] = run
        return deepcopy(run)

    def add_run_step(
        self,
        workspace_id: str,
        run_id: str,
        *,
        step_name: str,
        tool_used: str,
        status: str,
        input_payload: Any,
        output_payload: Any,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.ensure_workspace(workspace_id, self.workspaces.get(workspace_id, {}).get("name", "Beyond Chat Workspace"))
        run = self.runs[workspace_id].get(run_id)
        if run is None:
            run = {
                "id": run_id,
                "workspace_id": workspace_id,
                "studio": "chat",
                "title": "Untitled Run",
                "prompt": "",
                "status": "running",
                "model": "",
                "options": {},
                "output": {},
                "error_message": None,
                "created_at": utc_now(),
                "completed_at": None,
                "metadata": {},
                "steps": [],
            }
            self.runs[workspace_id][run_id] = run
        run["steps"].append(
            {
                "id": str(uuid4()),
                "run_id": run_id,
                "step_name": step_name,
                "tool_used": tool_used,
                "status": status,
                "input": input_payload if input_payload is not None else {},
                "output": output_payload if output_payload is not None else {},
                "created_at": utc_now(),
                "metadata": metadata or {},
            }
        )

    def complete_run(
        self,
        workspace_id: str,
        run_id: str,
        *,
        status: str,
        output: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> dict[str, Any]:
        self.ensure_workspace(workspace_id, self.workspaces.get(workspace_id, {}).get("name", "Beyond Chat Workspace"))
        run = self.runs[workspace_id].get(run_id)
        if run is None:
            run = {
                "id": run_id,
                "workspace_id": workspace_id,
                "studio": "chat",
                "title": "Untitled Run",
                "prompt": "",
                "status": status,
                "model": "",
                "options": {},
                "output": output or {},
                "error_message": error,
                "created_at": utc_now(),
                "completed_at": utc_now(),
                "metadata": {},
                "steps": [],
            }
            self.runs[workspace_id][run_id] = run
            return deepcopy(run)
        run["status"] = status
        run["output"] = output or {}
        run["error_message"] = error
        run["completed_at"] = utc_now()
        return deepcopy(run)

    def get_run(self, workspace_id: str, run_id: str) -> dict[str, Any] | None:
        run = self.runs.get(workspace_id, {}).get(run_id)
        if run is None:
            return None
        result = deepcopy(run)
        result["steps"] = sorted(result["steps"], key=lambda item: item["created_at"])
        return result


def pytest_configure() -> None:
    app.dependency_overrides = {}


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    store = FakeRuntimeStore()
    workspace = store.get_workspace()
    assert workspace is not None

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
    app.state.test_store = store
    app.state.test_workspace_id = workspace["id"]
    try:
        return TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client() -> TestClient:
    app.dependency_overrides.clear()
    return TestClient(app)
