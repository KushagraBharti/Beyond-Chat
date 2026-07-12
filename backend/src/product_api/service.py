from __future__ import annotations

import hashlib
import json
from dataclasses import asdict
from typing import Any, Mapping, Protocol

from ..authorization.policy import OrganizationRole, Principal
from ..product_persistence.contracts import ConflictError, ProductRecord, ProductRepository, Scope


class ProviderRegistry(Protocol):
    def status(self, capability: str, *, organization_id: str) -> Mapping[str, Any]: ...

    async def billing_status(self, organization_id: str) -> Mapping[str, Any]: ...


class DisabledProviderRegistry:
    def status(self, capability: str, *, organization_id: str) -> Mapping[str, Any]:
        del organization_id
        return {"capability": capability, "state": "unavailable", "externally_verified": False}

    async def billing_status(self, organization_id: str) -> Mapping[str, Any]:
        del organization_id
        return {"capability": "billing", "state": "unavailable", "externally_verified": False,
                "entitlement_state": "disabled"}


def digest(value: Mapping[str, Any]) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()
    return hashlib.sha256(encoded).hexdigest()


def record_dict(record: ProductRecord) -> dict[str, Any]:
    value = asdict(record)
    value["scope"] = asdict(record.scope)
    return value


class ProductService:
    def __init__(self, repository: ProductRepository, providers: ProviderRegistry | None = None) -> None:
        self.repository = repository
        self.providers = providers or DisabledProviderRegistry()

    @staticmethod
    def require_role(principal: Principal, minimum: OrganizationRole) -> None:
        rank = {OrganizationRole.VIEWER: 10, OrganizationRole.MEMBER: 20,
                OrganizationRole.BUILDER: 30, OrganizationRole.ADMIN: 40, OrganizationRole.OWNER: 50}
        if rank[principal.role] < rank[minimum]:
            raise PermissionError(f"role_requires_{minimum.value}")

    def list(self, kind: str, scope: Scope, states: tuple[str, ...] = ()) -> list[dict[str, Any]]:
        return [record_dict(item) for item in self.repository.list(kind=kind, scope=scope, states=states)]

    def list_recent(self, kind: str, organization_id: str,
                    states: tuple[str, ...] = (), limit: int = 20) -> list[dict[str, Any]]:
        return [record_dict(item) for item in self.repository.list_recent(
            kind=kind, organization_id=organization_id, states=states, limit=limit)]

    def get(self, kind: str, record_id: str, scope: Scope) -> dict[str, Any]:
        item = self.repository.get(kind=kind, record_id=record_id, scope=scope)
        if item is None:
            raise KeyError("not_found")
        return record_dict(item)

    def create(self, *, kind: str, scope: Scope, principal: Principal, idempotency_key: str,
               payload: Mapping[str, Any], state: str = "draft", minimum: OrganizationRole = OrganizationRole.MEMBER) -> dict[str, Any]:
        self.require_role(principal, minimum)
        body = {"kind": kind, "scope": asdict(scope), "state": state, "payload": dict(payload)}
        return record_dict(self.repository.create_once(kind=kind, scope=scope, actor_id=principal.profile_id,
            idempotency_key=idempotency_key, request_digest=digest(body), state=state, payload=payload))

    def update(self, *, kind: str, record_id: str, scope: Scope, principal: Principal,
               expected_version: int, payload: Mapping[str, Any] | None = None, state: str | None = None,
               minimum: OrganizationRole = OrganizationRole.MEMBER) -> dict[str, Any]:
        self.require_role(principal, minimum)
        return record_dict(self.repository.update(kind=kind, record_id=record_id, scope=scope,
            actor_id=principal.profile_id, expected_version=expected_version, state=state, payload=payload))

    def append(self, *, kind: str, parent_kind: str, parent_id: str, scope: Scope,
               principal: Principal, idempotency_key: str, payload: Mapping[str, Any], state: str,
               minimum: OrganizationRole = OrganizationRole.MEMBER) -> dict[str, Any]:
        self.require_role(principal, minimum)
        body = {"kind": kind, "parent_kind": parent_kind, "parent_id": parent_id,
                "scope": asdict(scope), "state": state, "payload": dict(payload)}
        return record_dict(self.repository.append_once(kind=kind, parent_kind=parent_kind,
            parent_id=parent_id, scope=scope, actor_id=principal.profile_id,
            idempotency_key=idempotency_key, request_digest=digest(body), state=state, payload=payload))

    def require_provider(self, capability: str, principal: Principal) -> dict[str, Any]:
        value = dict(self.providers.status(capability, organization_id=principal.organization_id))
        if value.get("state") != "ready" or value.get("externally_verified") is not True:
            raise RuntimeError(f"provider_unavailable:{capability}")
        return value

    async def billing_status(self, principal: Principal) -> dict[str, Any]:
        resolver = getattr(self.providers, "billing_status", None)
        if resolver is None:
            value = dict(self.providers.status("billing", organization_id=principal.organization_id))
        else:
            value = dict(await resolver(principal.organization_id))
        verified = value.get("externally_verified") is True
        entitlement = value.get("entitlement_state") if verified else "disabled"
        if entitlement not in {"enabled", "grace", "disabled"}:
            entitlement = "disabled"
        return {**value, "organization_id": principal.organization_id,
                "externally_verified": verified, "entitlement_state": entitlement,
                "source": "server" if verified else "unverified_disabled"}
