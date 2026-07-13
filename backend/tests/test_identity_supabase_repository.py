from __future__ import annotations

from types import SimpleNamespace

import pytest

from src.authorization.policy import OrganizationRole
from src.identity.repository import SupabaseIdentityRepository

RAW_NONE = object()


class Query:
    def __init__(self, client: "Client", table: str) -> None:
        self.client = client
        self.table = table
        self.operation = "select"

    def select(self, *_args: object) -> "Query":
        return self

    def eq(self, *_args: object) -> "Query":
        return self

    def maybe_single(self) -> "Query":
        return self

    def insert(self, _payload: object) -> "Query":
        self.operation = "insert"
        return self

    def upsert(self, _payload: object, **_kwargs: object) -> "Query":
        self.operation = "upsert"
        return self

    def execute(self) -> SimpleNamespace | None:
        result = self.client.response(self.table, self.operation)
        return None if result is RAW_NONE else SimpleNamespace(data=result)


class Client:
    def __init__(self, overrides: dict[tuple[str, str], object] | None = None) -> None:
        self.overrides = overrides or {}

    def table(self, name: str) -> Query:
        return Query(self, name)

    def response(self, table: str, operation: str) -> object:
        override = self.overrides.get((table, operation), ...)
        if override is not ...:
            return override
        if operation == "select":
            return None
        if table == "profiles":
            return {"id": "profile-first"}
        if table == "organizations":
            return {"id": "org-first"}
        return None


class Repository(SupabaseIdentityRepository):
    def __init__(self, client: Client) -> None:
        self.client = client

    def _client(self) -> Client:
        return self.client

    def resolve_active_identity(self, **_kwargs: object):  # type: ignore[no-untyped-def]
        return SimpleNamespace(profile_id="profile-first", organization_id="org-first")


def test_first_user_sync_treats_maybe_single_none_as_absent() -> None:
    snapshot = Repository(Client()).sync_authenticated_identity(
        issuer="https://issuer.example/",
        subject="user-first",
        email="first@example.com",
        email_verified=True,
        display_name="First User",
        avatar_url=None,
        locale=None,
        workos_organization_id="org_workos_first",
        organization_name="First Org",
        organization_slug=None,
        workos_membership_id="membership-first",
        role=OrganizationRole.ADMIN,
    )

    assert snapshot.profile_id == "profile-first"
    assert snapshot.organization_id == "org-first"


def test_project_access_treats_missing_direct_membership_as_inherited_access() -> None:
    repository = Repository(
        Client(
            {
                (
                    "projects",
                    "select",
                ): {
                    "id": "proj-1",
                    "organization_id": "org-first",
                    "visibility": "organization",
                    "state": "active",
                },
                ("project_memberships", "select"): RAW_NONE,
                ("resource_grants", "select"): [],
            }
        )
    )

    access = repository.get_project_access(
        principal=SimpleNamespace(profile_id="profile-first"),  # type: ignore[arg-type]
        project_id="proj-1",
    )

    assert access is not None
    assert access.project_id == "proj-1"
    assert access.direct_role is None


@pytest.mark.parametrize("unexpected", ["opaque", ["not-a-row"], [{"id": "one"}, {"id": "two"}]])
def test_unexpected_maybe_single_response_shape_fails_visibly(unexpected: object) -> None:
    repository = Repository(Client({("external_identities", "select"): unexpected}))

    with pytest.raises(RuntimeError, match="unexpected single-row response shape"):
        repository.sync_authenticated_identity(
            issuer="https://issuer.example",
            subject="user-first",
            email=None,
            email_verified=False,
            display_name=None,
            avatar_url=None,
            locale=None,
            workos_organization_id="org_workos_first",
            organization_name=None,
            organization_slug=None,
            workos_membership_id=None,
            role=OrganizationRole.MEMBER,
        )
