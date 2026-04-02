from __future__ import annotations

import re
from typing import Any

from supabase import Client, create_client

from .config import settings


def slugify_workspace_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "workspace"


class SupabaseService:
    def __init__(self) -> None:
        self._client: Client | None = None

    @property
    def is_configured(self) -> bool:
        return bool(settings.supabase_url and settings.supabase_service_role_key)

    def client(self) -> Client | None:
        if not self.is_configured:
            return None
        if self._client is None:
            self._client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        return self._client

    def ensure_workspace_for_user(self, user_id: str, email: str | None) -> dict[str, Any] | None:
        client = self.client()
        if client is None:
            return None

        membership_rows = (
            client.table("workspace_members").select("workspace_id, role").eq("user_id", user_id).limit(1).execute().data
            or []
        )
        if membership_rows:
            membership = membership_rows[0]
            workspace_id = membership.get("workspace_id")
            workspace_rows = (
                client.table("workspaces").select("*").eq("id", workspace_id).limit(1).execute().data or []
            )
            workspace = workspace_rows[0] if workspace_rows else {"id": workspace_id, "name": "Beyond Chat Workspace"}
            return {
                "workspace": workspace,
                "role": membership.get("role", "admin"),
                "created": False,
            }

        profile_payload = {
            "id": user_id,
            "email": email,
            "display_name": email.split("@")[0] if email else "Beyond Chat User",
        }
        client.table("user_profiles").upsert(profile_payload).execute()

        workspace_name = f"{profile_payload['display_name']}'s Workspace"
        workspace_payload = {
            "owner_id": user_id,
            "name": workspace_name,
            "slug": slugify_workspace_name(workspace_name),
            "metadata": {"bootstrappedBy": "api/auth/bootstrap"},
        }
        created_workspace = client.table("workspaces").insert(workspace_payload).execute()
        workspace_rows = created_workspace.data or []
        if not workspace_rows:
            raise RuntimeError("Workspace bootstrap did not return a workspace row.")

        workspace = workspace_rows[0]
        client.table("workspace_members").insert(
            {
                "workspace_id": workspace["id"],
                "user_id": user_id,
                "role": "admin",
            }
        ).execute()
        return {
            "workspace": workspace,
            "role": "admin",
            "created": True,
        }

    def upload_artifact_file(
        self,
        workspace_id: str,
        artifact_id: str,
        filename: str,
        content_type: str,
        file_bytes: bytes,
    ) -> dict[str, Any] | None:
        client = self.client()
        if client is None:
            return None

        storage_path = f"{workspace_id}/{artifact_id}/{filename}"
        client.storage.from_(settings.supabase_storage_bucket).upload(
            path=storage_path,
            file=file_bytes,
            file_options={
                "content-type": content_type,
                "upsert": "true",
            },
        )
        signed = client.storage.from_(settings.supabase_storage_bucket).create_signed_url(storage_path, 3600)
        return {
            "bucket": settings.supabase_storage_bucket,
            "path": storage_path,
            "signed_url": signed.get("signedURL") if isinstance(signed, dict) else None,
        }

    def upload_image_file(
        self,
        workspace_id: str,
        run_id: str,
        filename: str,
        content_type: str,
        image_bytes: bytes,
    ) -> dict[str, Any] | None:
        client = self.client()
        if client is None:
            return None

        storage_path = f"{workspace_id}/images/{run_id}/{filename}"
        client.storage.from_(settings.supabase_storage_bucket).upload(
            path=storage_path,
            file=image_bytes,
            file_options={
                "content-type": content_type,
                "upsert": "true",
            },
        )
        signed = client.storage.from_(settings.supabase_storage_bucket).create_signed_url(storage_path, 86400)
        return {
            "bucket": settings.supabase_storage_bucket,
            "path": storage_path,
            "signed_url": signed.get("signedURL") if isinstance(signed, dict) else None,
        }

    def create_signed_artifact_url(self, path: str, expires_in: int = 3600) -> dict[str, Any] | None:
        client = self.client()
        if client is None:
            return None

        signed = client.storage.from_(settings.supabase_storage_bucket).create_signed_url(path, expires_in)
        return {
            "bucket": settings.supabase_storage_bucket,
            "path": path,
            "signed_url": signed.get("signedURL") if isinstance(signed, dict) else None,
            "expires_in": expires_in,
        }


supabase_service = SupabaseService()
