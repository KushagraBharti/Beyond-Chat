from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator

from .config import settings


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def dump_json(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=True)


def load_json(value: str | None, default: Any) -> Any:
    if not value:
        return default
    return json.loads(value)


class LocalStore:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def _initialize(self) -> None:
        with self.connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS workspace (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS reminders (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    note TEXT NOT NULL,
                    due_at TEXT NOT NULL,
                    status TEXT NOT NULL,
                    source TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS integration_connections (
                    provider TEXT PRIMARY KEY,
                    workspace_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS chat_collections (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    title TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS chat_threads (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT NOT NULL,
                    collection_id TEXT,
                    collection_type TEXT NOT NULL,
                    studio TEXT NOT NULL,
                    title TEXT NOT NULL,
                    model TEXT NOT NULL,
                    prompt TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    FOREIGN KEY(collection_id) REFERENCES chat_collections(id) ON DELETE SET NULL
                );

                CREATE TABLE IF NOT EXISTS chat_messages (
                    id TEXT PRIMARY KEY,
                    thread_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    FOREIGN KEY(thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS artifacts (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT NOT NULL,
                    type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content_text TEXT NOT NULL,
                    content_json TEXT,
                    format TEXT NOT NULL,
                    summary TEXT,
                    preview_image TEXT,
                    tags_json TEXT NOT NULL,
                    studio TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS runs (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT NOT NULL,
                    studio TEXT NOT NULL,
                    title TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    status TEXT NOT NULL,
                    model TEXT NOT NULL,
                    options_json TEXT NOT NULL,
                    output_json TEXT NOT NULL,
                    error_message TEXT,
                    created_at TEXT NOT NULL,
                    completed_at TEXT,
                    metadata_json TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS run_steps (
                    id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    step_name TEXT NOT NULL,
                    tool_used TEXT NOT NULL,
                    status TEXT NOT NULL,
                    input_json TEXT NOT NULL,
                    output_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE CASCADE
                );
                """
            )
            self._seed(connection)

    def _seed(self, connection: sqlite3.Connection) -> None:
        if connection.execute("SELECT 1 FROM workspace LIMIT 1").fetchone():
            return

        now = utc_now()
        workspace_id = settings.local_workspace_id
        connection.execute(
            "INSERT INTO workspace (id, name, created_at) VALUES (?, ?, ?)",
            (workspace_id, settings.local_workspace_name, now),
        )

        reminders = [
            ("Morning review", "Skim research notes and prioritize the next artifact.", 2, "internal"),
            ("Calendar sync", "Reconnect Google Calendar after OAuth credentials are ready.", 6, "google_calendar"),
            ("Artifact cleanup", "Tag and organize recent documents before export.", 26, "internal"),
        ]
        for title, note, hours, source in reminders:
            connection.execute(
                """
                INSERT INTO reminders (id, workspace_id, title, note, due_at, status, source, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    workspace_id,
                    title,
                    note,
                    (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat(),
                    "open",
                    source,
                    now,
                ),
            )

        collections = [
            (str(uuid.uuid4()), "project", "Spring Launch"),
            (str(uuid.uuid4()), "group", "Marketing Sync"),
        ]
        for collection_id, kind, title in collections:
            connection.execute(
                """
                INSERT INTO chat_collections (id, workspace_id, kind, title, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (collection_id, workspace_id, kind, title, now, now),
            )

        seeded_threads = [
            ("Shipping checklist", collections[0][0], "project", "chat", "openai/gpt-4o-mini"),
            ("Q2 launch prep", collections[1][0], "group", "chat", "openai/gpt-4o-mini"),
            ("Daily workspace note", None, "chat", "chat", "openai/gpt-4o-mini"),
        ]
        for title, collection_id, collection_type, studio, model in seeded_threads:
            thread_id = str(uuid.uuid4())
            connection.execute(
                """
                INSERT INTO chat_threads
                (id, workspace_id, collection_id, collection_type, studio, title, model, prompt, created_at, updated_at, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    thread_id,
                    workspace_id,
                    collection_id,
                    collection_type,
                    studio,
                    title,
                    model,
                    f"Summarize the current status for {title.lower()}.",
                    now,
                    now,
                    dump_json({}),
                ),
            )
            for role, content in (
                ("user", f"Summarize the current status for {title.lower()}."),
                (
                    "assistant",
                    "This thread is ready for a live provider. For now it uses local persistence and disconnected-safe UI.",
                ),
            ):
                connection.execute(
                    """
                    INSERT INTO chat_messages (id, thread_id, role, content, created_at, metadata_json)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (str(uuid.uuid4()), thread_id, role, content, now, dump_json({})),
                )

        artifacts = [
            {
                "type": "document",
                "title": "Launch narrative draft",
                "content_text": "A long-form launch draft with positioning notes and rollout tasks.",
                "format": "rich_text",
                "summary": "A long-form launch draft with positioning notes and rollout tasks.",
                "preview_image": None,
                "tags": ["writing", "launch"],
                "studio": "writing",
                "metadata": {"wordCount": 620},
            },
            {
                "type": "report",
                "title": "Competitive research snapshot",
                "content_text": "Structured findings, sources, and action items for the current market.",
                "format": "markdown",
                "summary": "Structured findings, sources, and action items for the current market.",
                "preview_image": None,
                "tags": ["research", "sources"],
                "studio": "research",
                "metadata": {"sections": 5},
            },
            {
                "type": "image",
                "title": "Moodboard variants",
                "content_text": "Local placeholder image set pending provider configuration.",
                "format": "image_gallery",
                "summary": "Local placeholder image set pending provider configuration.",
                "preview_image": None,
                "tags": ["image", "concept"],
                "studio": "image",
                "metadata": {"imageUrls": []},
            },
        ]
        for artifact in artifacts:
            connection.execute(
                """
                INSERT INTO artifacts
                (id, workspace_id, type, title, content_text, content_json, format, summary, preview_image, tags_json, studio, metadata_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    workspace_id,
                    artifact["type"],
                    artifact["title"],
                    artifact["content_text"],
                    None,
                    artifact["format"],
                    artifact["summary"],
                    artifact["preview_image"],
                    dump_json(artifact["tags"]),
                    artifact["studio"],
                    dump_json(artifact["metadata"]),
                    now,
                    now,
                ),
            )

    def ensure_workspace(self, workspace_id: str, workspace_name: str) -> dict[str, Any]:
        with self.connect() as connection:
            row = connection.execute("SELECT * FROM workspace WHERE id = ?", (workspace_id,)).fetchone()
            if row is None:
                created_at = utc_now()
                connection.execute(
                    "INSERT INTO workspace (id, name, created_at) VALUES (?, ?, ?)",
                    (workspace_id, workspace_name, created_at),
                )
                row = connection.execute("SELECT * FROM workspace WHERE id = ?", (workspace_id,)).fetchone()
        assert row is not None
        return dict(row)

    def get_workspace(self, workspace_id: str | None = None) -> dict[str, Any]:
        with self.connect() as connection:
            if workspace_id:
                row = connection.execute("SELECT * FROM workspace WHERE id = ?", (workspace_id,)).fetchone()
            else:
                row = connection.execute("SELECT * FROM workspace LIMIT 1").fetchone()
        assert row is not None
        return dict(row)

    def list_reminders(self, workspace_id: str) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT * FROM reminders WHERE workspace_id = ? ORDER BY due_at ASC",
                (workspace_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def list_collections(self, workspace_id: str) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT * FROM chat_collections WHERE workspace_id = ? ORDER BY updated_at DESC",
                (workspace_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def list_threads(self, workspace_id: str) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT * FROM chat_threads WHERE workspace_id = ? ORDER BY updated_at DESC",
                (workspace_id,),
            ).fetchall()
        return [self._thread_from_row(dict(row)) for row in rows]

    def create_thread(
        self,
        workspace_id: str,
        title: str,
        collection_id: str | None,
        collection_type: str,
        studio: str,
        model: str,
        prompt: str | None,
    ) -> dict[str, Any]:
        thread_id = str(uuid.uuid4())
        now = utc_now()
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO chat_threads
                (id, workspace_id, collection_id, collection_type, studio, title, model, prompt, created_at, updated_at, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    thread_id,
                    workspace_id,
                    collection_id,
                    collection_type,
                    studio,
                    title,
                    model,
                    prompt,
                    now,
                    now,
                    dump_json({}),
                ),
            )
        return self.get_thread(workspace_id, thread_id) or {}

    def get_thread(self, workspace_id: str, thread_id: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            thread_row = connection.execute(
                "SELECT * FROM chat_threads WHERE id = ? AND workspace_id = ?",
                (thread_id, workspace_id),
            ).fetchone()
            if thread_row is None:
                return None
            message_rows = connection.execute(
                "SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC",
                (thread_id,),
            ).fetchall()
        thread = self._thread_from_row(dict(thread_row))
        thread["messages"] = [self._message_from_row(dict(row)) for row in message_rows]
        return thread

    def add_message(
        self,
        thread_id: str,
        role: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        message_id = str(uuid.uuid4())
        now = utc_now()
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO chat_messages (id, thread_id, role, content, created_at, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (message_id, thread_id, role, content, now, dump_json(metadata or {})),
            )
            connection.execute("UPDATE chat_threads SET updated_at = ? WHERE id = ?", (now, thread_id))
            row = connection.execute("SELECT * FROM chat_messages WHERE id = ?", (message_id,)).fetchone()
        assert row is not None
        return self._message_from_row(dict(row))

    def list_artifacts(
        self,
        workspace_id: str,
        query: str | None = None,
        studio: str | None = None,
        artifact_type: str | None = None,
        tags: list[str] | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 24,
    ) -> list[dict[str, Any]]:
        sql = "SELECT * FROM artifacts WHERE workspace_id = ?"
        params: list[Any] = [workspace_id]
        if query:
            sql += " AND (title LIKE ? OR summary LIKE ? OR content_text LIKE ?)"
            needle = f"%{query}%"
            params.extend([needle, needle, needle])
        if studio:
            sql += " AND studio = ?"
            params.append(studio)
        if artifact_type:
            sql += " AND type = ?"
            params.append(artifact_type)
        if date_from:
            sql += " AND created_at >= ?"
            params.append(date_from)
        if date_to:
            sql += " AND created_at <= ?"
            params.append(date_to)
        sql += " ORDER BY updated_at DESC LIMIT ?"
        params.append(limit)
        with self.connect() as connection:
            rows = connection.execute(sql, params).fetchall()
        artifacts = [self._artifact_from_row(dict(row)) for row in rows]
        if tags:
            normalized = {tag.lower() for tag in tags}
            artifacts = [
                artifact for artifact in artifacts if normalized.issubset({tag.lower() for tag in artifact["tags"]})
            ]
        return artifacts

    def get_artifact(self, workspace_id: str, artifact_id: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT * FROM artifacts WHERE id = ? AND workspace_id = ?",
                (artifact_id, workspace_id),
            ).fetchone()
        if row is None:
            return None
        return self._artifact_from_row(dict(row))

    def upsert_artifact(
        self,
        workspace_id: str,
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
    ) -> dict[str, Any]:
        record_id = artifact_id or str(uuid.uuid4())
        now = utc_now()
        serialized_content_json = json.dumps(content_json) if content_json is not None else None

        with self.connect() as connection:
            exists = connection.execute("SELECT 1 FROM artifacts WHERE id = ?", (record_id,)).fetchone()
            if exists:
                connection.execute(
                    """
                    UPDATE artifacts
                    SET type = ?, title = ?, content_text = ?, content_json = ?, format = ?, summary = ?, preview_image = ?, tags_json = ?, studio = ?, metadata_json = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        artifact_type,
                        title,
                        content,
                        serialized_content_json,
                        content_format,
                        summary,
                        preview_image,
                        dump_json(tags),
                        studio,
                        dump_json(metadata),
                        now,
                        record_id,
                    ),
                )
            else:
                connection.execute(
                    """
                    INSERT INTO artifacts
                    (id, workspace_id, type, title, content_text, content_json, format, summary, preview_image, tags_json, studio, metadata_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        record_id,
                        workspace_id,
                        artifact_type,
                        title,
                        content,
                        serialized_content_json,
                        content_format,
                        summary,
                        preview_image,
                        dump_json(tags),
                        studio,
                        dump_json(metadata),
                        now,
                        now,
                    ),
                )
        return self.get_artifact(workspace_id, record_id) or {}

    def create_run(
        self,
        workspace_id: str,
        studio: str,
        title: str,
        prompt: str,
        model: str,
        options: dict[str, Any],
    ) -> dict[str, Any]:
        run_id = str(uuid.uuid4())
        now = utc_now()
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO runs
                (id, workspace_id, studio, title, prompt, status, model, options_json, output_json, error_message, created_at, completed_at, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    workspace_id,
                    studio,
                    title,
                    prompt,
                    "running",
                    model,
                    dump_json(options),
                    dump_json({}),
                    None,
                    now,
                    None,
                    dump_json({}),
                ),
            )
        return self.get_run(workspace_id, run_id) or {}

    def add_run_step(
        self,
        run_id: str,
        step_name: str,
        tool_used: str,
        status: str,
        input_payload: Any,
        output_payload: Any,
    ) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO run_steps (id, run_id, step_name, tool_used, status, input_json, output_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    run_id,
                    step_name,
                    tool_used,
                    status,
                    dump_json(input_payload),
                    dump_json(output_payload),
                    utc_now(),
                ),
            )

    def complete_run(
        self,
        workspace_id: str,
        run_id: str,
        status: str,
        output: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> dict[str, Any]:
        now = utc_now()
        with self.connect() as connection:
            connection.execute(
                """
                UPDATE runs
                SET status = ?, output_json = ?, error_message = ?, completed_at = ?
                WHERE id = ?
                """,
                (status, dump_json(output or {}), error, now, run_id),
            )
        return self.get_run(workspace_id, run_id) or {}

    def get_run(self, workspace_id: str, run_id: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            run_row = connection.execute(
                "SELECT * FROM runs WHERE id = ? AND workspace_id = ?",
                (run_id, workspace_id),
            ).fetchone()
            if run_row is None:
                return None
            step_rows = connection.execute(
                "SELECT * FROM run_steps WHERE run_id = ? ORDER BY created_at ASC",
                (run_id,),
            ).fetchall()
        run = dict(run_row)
        run["options"] = load_json(run.pop("options_json"), {})
        run["output"] = load_json(run.pop("output_json"), {})
        run["metadata"] = load_json(run.pop("metadata_json"), {})
        run["steps"] = [self._step_from_row(dict(row)) for row in step_rows]
        return run

    def _thread_from_row(self, thread: dict[str, Any]) -> dict[str, Any]:
        thread["metadata"] = load_json(thread.pop("metadata_json"), {})
        return thread

    def _message_from_row(self, message: dict[str, Any]) -> dict[str, Any]:
        message["metadata"] = load_json(message.pop("metadata_json"), {})
        return message

    def _artifact_from_row(self, artifact: dict[str, Any]) -> dict[str, Any]:
        artifact["contentJson"] = load_json(artifact.pop("content_json"), None)
        artifact["tags"] = load_json(artifact.pop("tags_json"), [])
        artifact["metadata"] = load_json(artifact.pop("metadata_json"), {})
        artifact["content"] = artifact.pop("content_text")
        artifact["contentFormat"] = artifact.pop("format")
        artifact["previewImage"] = artifact.pop("preview_image")
        return artifact

    def _step_from_row(self, step: dict[str, Any]) -> dict[str, Any]:
        step["input"] = load_json(step.pop("input_json"), {})
        step["output"] = load_json(step.pop("output_json"), {})
        return step


store = LocalStore(Path(__file__).resolve().parent.parent / ".local" / "beyond_chat.db")
