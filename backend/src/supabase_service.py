from __future__ import annotations

from typing import Any

from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

from .config import settings


class SupabaseService:
    def __init__(self) -> None:
        self._client: Client | None = None

    @property
    def is_configured(self) -> bool:
        return bool(settings.supabase_url and (settings.supabase_anon_key or settings.supabase_service_role_key))

    @property
    def runtime_database_enabled(self) -> bool:
        return bool(settings.supabase_url and (settings.supabase_anon_key or settings.supabase_service_role_key))

    def client(self, access_token: str | None = None) -> Client | None:
        if not settings.supabase_url:
            return None
        if access_token:
            if not settings.supabase_anon_key:
                return None
            return create_client(
                settings.supabase_url,
                settings.supabase_anon_key,
                options=SyncClientOptions(headers={"Authorization": f"Bearer {access_token}"}),
            )
        if not settings.supabase_service_role_key:
            return None
        if self._client is None:
            self._client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        return self._client

    def ensure_workspace_for_user(
        self,
        user_id: str,
        email: str | None,
        access_token: str | None = None,
    ) -> dict[str, Any] | None:
        client = self.client(access_token)
        if client is None:
            return None

        display_name = email.split("@")[0] if email else "Beyond Chat User"
        response = (
            client.rpc(
                "ensure_workspace_for_user",
                {
                    "target_user_id": user_id,
                    "target_email": email,
                    "target_display_name": display_name,
                    "target_metadata": {"bootstrapped_by": "api/auth/bootstrap"},
                },
            )
            .execute()
            .data
        )

        if isinstance(response, list):
            payload = response[0] if response else None
        else:
            payload = response

        if not isinstance(payload, dict):
            raise RuntimeError("Workspace bootstrap did not return a valid payload.")

        workspace = payload.get("workspace")
        if not isinstance(workspace, dict) or not workspace.get("id"):
            raise RuntimeError("Workspace bootstrap did not return a workspace row.")

        return {
            "workspace": workspace,
            "role": payload.get("role", "admin"),
            "created": bool(payload.get("created")),
        }

    def resolve_workspace_for_user(
        self,
        user_id: str,
        requested_workspace_id: str | None = None,
        access_token: str | None = None,
    ) -> dict[str, Any] | None:
        client = self.client(access_token)
        if client is None:
            return None

        try:
            membership_query = client.table("workspace_members").select("workspace_id,role,created_at").eq("user_id", user_id)
            if requested_workspace_id:
                membership_query = membership_query.eq("workspace_id", requested_workspace_id)

            membership_rows = membership_query.execute().data or []
            if not membership_rows:
                return None

            role_order = {"admin": 0, "member": 1, "viewer": 2}
            membership = sorted(
                membership_rows,
                key=lambda row: (role_order.get(str(row.get("role")), 99), str(row.get("created_at") or "")),
            )[0]

            workspace_id = membership.get("workspace_id")
            if not isinstance(workspace_id, str) or not workspace_id:
                return None

            workspace = (
                client.table("workspaces")
                .select("id,name,created_at")
                .eq("id", workspace_id)
                .maybe_single()
                .execute()
                .data
            )
            if not isinstance(workspace, dict):
                return None
        except Exception:
            return None

        return {
            "workspace": workspace,
            "role": membership.get("role", "admin"),
            "created": False,
        }

    def upload_artifact_file(
        self,
        workspace_id: str,
        artifact_id: str,
        filename: str,
        content_type: str,
        file_bytes: bytes,
        access_token: str | None = None,
    ) -> dict[str, Any] | None:
        client = self.client(access_token)
        if client is None:
            return None

        try:
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
        except Exception:
            return None
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
        access_token: str | None = None,
    ) -> dict[str, Any] | None:
        client = self.client(access_token)
        if client is None:
            return None

        try:
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
        except Exception:
            return None
        return {
            "bucket": settings.supabase_storage_bucket,
            "path": storage_path,
            "signed_url": signed.get("signedURL") if isinstance(signed, dict) else None,
        }

    def create_signed_artifact_url(
        self,
        path: str,
        expires_in: int = 3600,
        access_token: str | None = None,
    ) -> dict[str, Any] | None:
        client = self.client(access_token)
        if client is None:
            return None

        try:
            signed = client.storage.from_(settings.supabase_storage_bucket).create_signed_url(path, expires_in)
        except Exception:
            return None
        return {
            "bucket": settings.supabase_storage_bucket,
            "path": path,
            "signed_url": signed.get("signedURL") if isinstance(signed, dict) else None,
            "expires_in": expires_in,
        }


supabase_service = SupabaseService()
