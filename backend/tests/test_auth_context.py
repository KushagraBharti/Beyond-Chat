from __future__ import annotations

import pytest
from fastapi import HTTPException

from src import auth
from src.supabase_service import SupabaseService


def test_requested_workspace_id_requires_membership_resolution(monkeypatch: pytest.MonkeyPatch) -> None:
    requested_workspace_id = "11111111-1111-1111-1111-111111111111"

    monkeypatch.setattr(
        auth,
        "_load_supabase_user",
        lambda _token: {"id": "user-1", "email": "user@example.com", "app_metadata": {}, "user_metadata": {}},
    )

    seen: dict[str, str | None] = {}

    def fake_resolve_workspace_for_user(
        user_id: str,
        requested_workspace_id: str | None = None,
        access_token: str | None = None,
    ) -> None:
        seen["user_id"] = user_id
        seen["requested_workspace_id"] = requested_workspace_id
        seen["access_token"] = access_token
        return None

    monkeypatch.setattr(auth.supabase_service, "resolve_workspace_for_user", fake_resolve_workspace_for_user)

    with pytest.raises(HTTPException) as exc_info:
        auth.resolve_request_context(f"Bearer token", requested_workspace_id)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "A workspace could not be resolved for the authenticated user."
    assert seen == {
        "user_id": "user-1",
        "requested_workspace_id": requested_workspace_id,
        "access_token": "token",
    }


def test_membership_resolution_supplies_workspace_context(monkeypatch: pytest.MonkeyPatch) -> None:
    requested_workspace_id = "11111111-1111-1111-1111-111111111111"
    resolved_workspace_id = "22222222-2222-2222-2222-222222222222"

    monkeypatch.setattr(
        auth,
        "_load_supabase_user",
        lambda _token: {"id": "user-1", "email": "user@example.com", "app_metadata": {}, "user_metadata": {}},
    )
    monkeypatch.setattr(
        auth.supabase_service,
        "resolve_workspace_for_user",
        lambda *_args, **_kwargs: {"workspace": {"id": resolved_workspace_id}, "role": "admin", "created": False},
    )

    context = auth.resolve_request_context("Bearer token", requested_workspace_id)

    assert context.user_id == "user-1"
    assert context.email == "user@example.com"
    assert context.workspace_id == resolved_workspace_id
    assert context.access_token == "token"


class _FakeExecute:
    def __init__(self, data: object) -> None:
        self.data = data


class _FakeQuery:
    def __init__(self, client: "_FakeSupabaseClient", table_name: str) -> None:
        self.client = client
        self.table_name = table_name
        self.filters: dict[str, str] = {}

    def select(self, *_args: object) -> "_FakeQuery":
        return self

    def eq(self, key: str, value: str) -> "_FakeQuery":
        self.filters[key] = value
        return self

    def maybe_single(self) -> "_FakeQuery":
        return self

    def execute(self) -> _FakeExecute:
        if self.table_name == "workspace_members":
            if self.filters.get("workspace_id") == "stale-workspace":
                return _FakeExecute([])
            return _FakeExecute([
                {"workspace_id": "real-workspace", "role": "admin", "created_at": "2026-01-01T00:00:00Z"}
            ])
        if self.table_name == "workspaces":
            return _FakeExecute({"id": self.filters["id"], "name": "Real Workspace", "created_at": "2026-01-01T00:00:00Z"})
        return _FakeExecute(None)


class _FakeSupabaseClient:
    def table(self, table_name: str) -> _FakeQuery:
        return _FakeQuery(self, table_name)


def test_workspace_resolution_falls_back_when_requested_workspace_is_stale(monkeypatch: pytest.MonkeyPatch) -> None:
    service = SupabaseService()
    monkeypatch.setattr(service, "client", lambda *_args, **_kwargs: _FakeSupabaseClient())

    resolved = service.resolve_workspace_for_user("user-1", requested_workspace_id="stale-workspace", access_token="token")

    assert resolved is not None
    assert resolved["workspace"]["id"] == "real-workspace"
    assert resolved["role"] == "admin"
