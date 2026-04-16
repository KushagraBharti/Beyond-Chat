from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Protocol

from postgrest.exceptions import APIError

from .supabase_service import supabase_service

if TYPE_CHECKING:
    from .auth import RequestContext


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class RuntimeStoreError(RuntimeError):
    """Raised when the active runtime persistence layer cannot satisfy a request."""


class RuntimeDataStore(Protocol):
    def get_workspace(self, workspace_id: str) -> dict[str, Any] | None: ...

    def ensure_workspace(self, workspace_id: str, workspace_name: str) -> dict[str, Any]: ...

    def list_reminders(self, workspace_id: str) -> list[dict[str, Any]]: ...

    def create_reminder(
        self,
        workspace_id: str,
        *,
        title: str,
        note: str,
        due_at: str,
    ) -> dict[str, Any]: ...

    def delete_reminder(self, workspace_id: str, reminder_id: str) -> None: ...

    def list_collections(self, workspace_id: str) -> list[dict[str, Any]]: ...

    def list_threads(self, workspace_id: str) -> list[dict[str, Any]]: ...

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
    ) -> dict[str, Any]: ...

    def get_thread(self, workspace_id: str, thread_id: str) -> dict[str, Any] | None: ...

    def add_message(
        self,
        workspace_id: str,
        thread_id: str,
        role: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]: ...

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
    ) -> list[dict[str, Any]]: ...

    def get_artifact(self, workspace_id: str, artifact_id: str) -> dict[str, Any] | None: ...

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
    ) -> dict[str, Any]: ...

    def create_run(
        self,
        workspace_id: str,
        *,
        studio: str,
        title: str,
        prompt: str,
        model: str,
        options: dict[str, Any],
    ) -> dict[str, Any]: ...

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
    ) -> None: ...

    def complete_run(
        self,
        workspace_id: str,
        run_id: str,
        *,
        status: str,
        output: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> dict[str, Any]: ...

    def get_run(self, workspace_id: str, run_id: str) -> dict[str, Any] | None: ...


class SupabaseDataStore:
    def __init__(self, access_token: str | None, user_id: str | None) -> None:
        self.access_token = access_token
        self.user_id = user_id

    @property
    def client(self):
        client = supabase_service.client(self.access_token)
        if client is None:
            raise RuntimeStoreError("Supabase database access is not configured for the hosted runtime.")
        return client

    def _handle_api_error(self, action: str, exc: APIError) -> RuntimeStoreError:
        message = getattr(exc, "message", None) or str(exc)
        return RuntimeStoreError(f"{action} failed: {message}")

    def _normalize_workspace(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "name": row["name"],
            "created_at": row["created_at"],
        }

    def _normalize_reminder(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "workspace_id": row["workspace_id"],
            "title": row["title"],
            "note": row["note"],
            "due_at": row["due_at"],
            "status": row["status"],
            "source": row["source"],
            "created_at": row["created_at"],
        }

    def _normalize_collection(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "workspace_id": row["workspace_id"],
            "kind": row["kind"],
            "title": row["title"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def _normalize_thread(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "workspace_id": row["workspace_id"],
            "collection_id": row.get("collection_id"),
            "collection_type": row["collection_type"],
            "studio": row["studio"],
            "title": row["title"],
            "model": row["model"],
            "prompt": row.get("prompt"),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "metadata": row.get("metadata") or {},
        }

    def _normalize_message(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "thread_id": row["thread_id"],
            "role": row["role"],
            "content": row["content"],
            "created_at": row["created_at"],
            "metadata": row.get("metadata") or {},
        }

    def _normalize_artifact(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "workspace_id": row["workspace_id"],
            "type": row["type"],
            "title": row["title"],
            "content": row["content"],
            "contentJson": row.get("content_json"),
            "contentFormat": row.get("content_format") or "markdown",
            "summary": row.get("summary"),
            "previewImage": row.get("preview_image"),
            "tags": row.get("tags") or [],
            "studio": row["studio"],
            "metadata": row.get("metadata") or {},
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def _normalize_step(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "run_id": row["run_id"],
            "step_name": row["step_name"],
            "tool_used": row["tool_used"],
            "status": row["status"],
            "input": row.get("input") or {},
            "output": row.get("output") or {},
            "created_at": row["created_at"],
        }

    def _normalize_run(self, row: dict[str, Any], steps: list[dict[str, Any]]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "workspace_id": row["workspace_id"],
            "studio": row["studio"],
            "title": row.get("title") or "Untitled Run",
            "prompt": row["prompt"],
            "status": row["status"],
            "model": row.get("model") or "",
            "options": row.get("options") or {},
            "output": row.get("output") or {},
            "error_message": row.get("error_message"),
            "created_at": row["created_at"],
            "completed_at": row.get("completed_at"),
            "metadata": row.get("metadata") or {},
            "steps": steps,
        }

    def get_workspace(self, workspace_id: str) -> dict[str, Any] | None:
        try:
            response = (
                self.client.table("workspaces")
                .select("id,name,created_at")
                .eq("id", workspace_id)
                .maybe_single()
                .execute()
            )
        except APIError as exc:
            raise self._handle_api_error("Workspace lookup", exc) from exc

        row = response.data
        if not isinstance(row, dict):
            return None
        return self._normalize_workspace(row)

    def ensure_workspace(self, workspace_id: str, workspace_name: str) -> dict[str, Any]:
        workspace = self.get_workspace(workspace_id)
        if workspace is not None:
            return workspace
        raise RuntimeStoreError(
            f"Workspace '{workspace_name}' ({workspace_id}) could not be resolved in Supabase for the hosted runtime."
        )

    def list_reminders(self, workspace_id: str) -> list[dict[str, Any]]:
        try:
            response = (
                self.client.table("reminders")
                .select("id,workspace_id,title,note,due_at,status,source,created_at")
                .eq("workspace_id", workspace_id)
                .order("due_at")
                .execute()
            )
        except APIError as exc:
            raise self._handle_api_error("Reminder lookup", exc) from exc

        return [self._normalize_reminder(row) for row in response.data or []]

    def create_reminder(
        self,
        workspace_id: str,
        *,
        title: str,
        note: str,
        due_at: str,
    ) -> dict[str, Any]:
        payload = {
            "workspace_id": workspace_id,
            "created_by": self.user_id,
            "title": title,
            "note": note,
            "due_at": due_at,
            "status": "open",
            "source": "internal",
            "metadata": {},
        }
        try:
            response = self.client.table("reminders").insert(payload).execute()
        except APIError as exc:
            raise self._handle_api_error("Reminder creation", exc) from exc

        rows = response.data or []
        if not rows:
            raise RuntimeStoreError("Reminder creation did not return a row.")
        return self._normalize_reminder(rows[0])

    def delete_reminder(self, workspace_id: str, reminder_id: str) -> None:
        try:
            response = (
                self.client.table("reminders")
                .delete()
                .eq("workspace_id", workspace_id)
                .eq("id", reminder_id)
                .execute()
            )
        except APIError as exc:
            raise self._handle_api_error("Reminder deletion", exc) from exc

        if response.data is not None and len(response.data) == 0:
            raise RuntimeStoreError("Reminder not found.")

    def list_collections(self, workspace_id: str) -> list[dict[str, Any]]:
        try:
            response = (
                self.client.table("chat_collections")
                .select("id,workspace_id,kind,title,created_at,updated_at")
                .eq("workspace_id", workspace_id)
                .order("updated_at", desc=True)
                .execute()
            )
        except APIError as exc:
            raise self._handle_api_error("Chat collection lookup", exc) from exc

        return [self._normalize_collection(row) for row in response.data or []]

    def list_threads(self, workspace_id: str) -> list[dict[str, Any]]:
        try:
            response = (
                self.client.table("chat_threads")
                .select("id,workspace_id,collection_id,collection_type,studio,title,model,prompt,metadata,created_at,updated_at")
                .eq("workspace_id", workspace_id)
                .order("updated_at", desc=True)
                .execute()
            )
        except APIError as exc:
            raise self._handle_api_error("Chat thread lookup", exc) from exc

        return [self._normalize_thread(row) for row in response.data or []]

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
        payload = {
            "workspace_id": workspace_id,
            "collection_id": collection_id,
            "collection_type": collection_type,
            "studio": studio,
            "title": title,
            "model": model,
            "prompt": prompt,
            "metadata": {},
            "created_by": self.user_id,
        }
        try:
            response = (
                self.client.table("chat_threads")
                .insert(payload)
                .execute()
            )
        except APIError as exc:
            raise self._handle_api_error("Chat thread creation", exc) from exc

        rows = response.data or []
        if not rows:
            raise RuntimeStoreError("Chat thread creation did not return a row.")
        thread_id = rows[0]["id"]
        thread = self.get_thread(workspace_id, thread_id)
        if thread is None:
            raise RuntimeStoreError("Chat thread creation succeeded but the thread could not be reloaded.")
        return thread

    def get_thread(self, workspace_id: str, thread_id: str) -> dict[str, Any] | None:
        try:
            thread_response = (
                self.client.table("chat_threads")
                .select("id,workspace_id,collection_id,collection_type,studio,title,model,prompt,metadata,created_at,updated_at")
                .eq("workspace_id", workspace_id)
                .eq("id", thread_id)
                .maybe_single()
                .execute()
            )
        except APIError as exc:
            raise self._handle_api_error("Chat thread lookup", exc) from exc

        row = thread_response.data
        if not isinstance(row, dict):
            return None

        try:
            message_response = (
                self.client.table("chat_messages")
                .select("id,thread_id,role,content,metadata,created_at")
                .eq("workspace_id", workspace_id)
                .eq("thread_id", thread_id)
                .order("created_at")
                .execute()
            )
        except APIError as exc:
            raise self._handle_api_error("Chat message lookup", exc) from exc

        thread = self._normalize_thread(row)
        thread["messages"] = [self._normalize_message(item) for item in message_response.data or []]
        return thread

    def add_message(
        self,
        workspace_id: str,
        thread_id: str,
        role: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "workspace_id": workspace_id,
            "thread_id": thread_id,
            "role": role,
            "content": content,
            "metadata": metadata or {},
            "created_by": self.user_id,
        }
        try:
            response = self.client.table("chat_messages").insert(payload).execute()
            self.client.table("chat_threads").update({"updated_at": utc_now()}).eq("id", thread_id).eq(
                "workspace_id", workspace_id
            ).execute()
        except APIError as exc:
            raise self._handle_api_error("Chat message creation", exc) from exc

        rows = response.data or []
        if not rows:
            raise RuntimeStoreError("Chat message creation did not return a row.")
        return self._normalize_message(rows[0])

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
        statement = (
            self.client.table("artifacts")
            .select(
                "id,workspace_id,type,title,content,content_json,content_format,summary,preview_image,tags,studio,metadata,created_at,updated_at,storage_path,source_run_id"
            )
            .eq("workspace_id", workspace_id)
        )
        if studio:
            statement = statement.eq("studio", studio)
        if artifact_type:
            statement = statement.eq("type", artifact_type)
        if date_from:
            statement = statement.gte("created_at", date_from)
        if date_to:
            statement = statement.lte("created_at", date_to)
        if query:
            escaped = query.replace(",", "\\,")
            statement = statement.or_(f"title.ilike.%{escaped}%,summary.ilike.%{escaped}%,content.ilike.%{escaped}%")

        try:
            response = statement.order("updated_at", desc=True).limit(limit).execute()
        except APIError as exc:
            raise self._handle_api_error("Artifact lookup", exc) from exc

        items = [self._normalize_artifact(row) for row in response.data or []]
        if tags:
            normalized = {tag.lower() for tag in tags}
            items = [item for item in items if normalized.issubset({tag.lower() for tag in item["tags"]})]
        return items

    def get_artifact(self, workspace_id: str, artifact_id: str) -> dict[str, Any] | None:
        try:
            response = (
                self.client.table("artifacts")
                .select(
                    "id,workspace_id,type,title,content,content_json,content_format,summary,preview_image,tags,studio,metadata,created_at,updated_at,storage_path,source_run_id"
                )
                .eq("workspace_id", workspace_id)
                .eq("id", artifact_id)
                .maybe_single()
                .execute()
            )
        except APIError as exc:
            raise self._handle_api_error("Artifact lookup", exc) from exc

        row = response.data
        if not isinstance(row, dict):
            return None
        return self._normalize_artifact(row)

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
        payload = {
            "workspace_id": workspace_id,
            "created_by": self.user_id,
            "type": artifact_type,
            "title": title,
            "content": content,
            "summary": summary,
            "content_json": content_json,
            "content_format": content_format,
            "preview_image": preview_image,
            "tags": tags,
            "studio": studio,
            "metadata": metadata,
            "source_run_id": source_run_id,
            "storage_path": storage_path,
        }
        if artifact_id:
            payload["id"] = artifact_id

        try:
            if artifact_id and self.get_artifact(workspace_id, artifact_id):
                self.client.table("artifacts").update(payload).eq("id", artifact_id).eq("workspace_id", workspace_id).execute()
                row_id = artifact_id
            else:
                response = self.client.table("artifacts").insert(payload).execute()
                rows = response.data or []
                if not rows:
                    raise RuntimeStoreError("Artifact save did not return a row.")
                row_id = rows[0]["id"]
        except APIError as exc:
            raise self._handle_api_error("Artifact save", exc) from exc

        artifact = self.get_artifact(workspace_id, row_id)
        if artifact is None:
            raise RuntimeStoreError("Artifact save succeeded but the artifact could not be reloaded.")
        return artifact

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
        payload = {
            "workspace_id": workspace_id,
            "created_by": self.user_id,
            "studio": studio,
            "title": title,
            "prompt": prompt,
            "status": "running",
            "model": model,
            "options": options,
            "output": {},
            "metadata": {},
        }
        try:
            response = self.client.table("runs").insert(payload).execute()
        except APIError as exc:
            raise self._handle_api_error("Run creation", exc) from exc

        rows = response.data or []
        if not rows:
            raise RuntimeStoreError("Run creation did not return a row.")
        run_id = rows[0]["id"]
        run = self.get_run(workspace_id, run_id)
        if run is None:
            raise RuntimeStoreError("Run creation succeeded but the run could not be reloaded.")
        return run

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
        payload = {
            "workspace_id": workspace_id,
            "run_id": run_id,
            "step_name": step_name,
            "tool_used": tool_used,
            "status": status,
            "input": input_payload if input_payload is not None else {},
            "output": output_payload if output_payload is not None else {},
            "metadata": metadata or {},
        }
        try:
            self.client.table("run_steps").insert(payload).execute()
        except APIError as exc:
            raise self._handle_api_error("Run step creation", exc) from exc

    def complete_run(
        self,
        workspace_id: str,
        run_id: str,
        *,
        status: str,
        output: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> dict[str, Any]:
        payload = {
            "status": status,
            "output": output or {},
            "error_message": error,
            "completed_at": utc_now(),
        }
        try:
            self.client.table("runs").update(payload).eq("id", run_id).eq("workspace_id", workspace_id).execute()
        except APIError as exc:
            raise self._handle_api_error("Run completion", exc) from exc

        run = self.get_run(workspace_id, run_id)
        if run is None:
            raise RuntimeStoreError("Run completion succeeded but the run could not be reloaded.")
        return run

    def get_run(self, workspace_id: str, run_id: str) -> dict[str, Any] | None:
        try:
            run_response = (
                self.client.table("runs")
                .select("id,workspace_id,studio,title,prompt,status,model,options,output,error_message,created_at,completed_at,metadata")
                .eq("workspace_id", workspace_id)
                .eq("id", run_id)
                .maybe_single()
                .execute()
            )
        except APIError as exc:
            raise self._handle_api_error("Run lookup", exc) from exc

        row = run_response.data
        if not isinstance(row, dict):
            return None

        try:
            step_response = (
                self.client.table("run_steps")
                .select("id,run_id,step_name,tool_used,status,input,output,created_at")
                .eq("workspace_id", workspace_id)
                .eq("run_id", run_id)
                .order("created_at")
                .execute()
            )
        except APIError as exc:
            raise self._handle_api_error("Run step lookup", exc) from exc

        steps = [self._normalize_step(item) for item in step_response.data or []]
        return self._normalize_run(row, steps)

def get_runtime_store(context: "RequestContext | None" = None) -> RuntimeDataStore:
    if context is None:
        raise RuntimeStoreError("Authentication context is required.")
    if context.source != "supabase_jwt":
        raise RuntimeStoreError("Supabase authentication context is required.")
    if not supabase_service.runtime_database_enabled:
        raise RuntimeStoreError("Supabase database access is not configured for the hosted runtime.")
    return SupabaseDataStore(context.access_token, context.user_id)
