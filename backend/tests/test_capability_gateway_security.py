from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from src.authorization.policy import OrganizationRole, Principal
from src.product_api.capability_gateway import CapabilityGateway
from src.product_api.schemas import CapabilityApprovalClaim, CapabilityResolveRequest
from src.product_persistence import (
    CapabilityRun,
    ConflictError,
    InMemoryProductRepository,
    ProductPersistenceUnavailable,
    Scope,
    SupabaseProductRepository,
)


SCOPE = Scope("org-a", "project-a")
PRINCIPAL = Principal("profile-a", "user-a", "issuer", "org-a", "workos-org-a", OrganizationRole.MEMBER)


def create(repository: InMemoryProductRepository, kind: str, state: str, payload: dict) -> str:
    return repository.create_once(
        kind=kind, scope=SCOPE, actor_id="profile-a", idempotency_key=f"{kind}-{len(repository._records)}",
        request_digest=f"digest-{kind}-{len(repository._records)}", state=state, payload=payload,
    ).id


def gateway_fixture(*, risk: str = "read", decision: str = "allow", source: str = "native",
                    connection_state: str = "active", ownership: str = "project",
                    owner_id: str = "project-a", binding: dict | None = None,
                    tool_extra: dict | None = None):
    repository = InMemoryProductRepository()
    connection_id = None
    if source == "app":
        connection_id = create(repository, "connection", connection_state, {
            "ownership": ownership, "owner_id": owner_id,
            "credentials": {"access_token": "must-never-project"},
        })
    tool_id = "tool.test.action"
    source_id = connection_id if source == "app" else ("skill-v1" if source == "skill" else None)
    definition = {"id": tool_id, "version": "1.2.3", "risk": risk, "source": source,
                  "source_id": source_id, **(tool_extra or {})}
    create(repository, "tool", "active", {"definition": definition})
    tool_binding = {"id": tool_id, "decision": decision, **(binding or {})}
    agent_version_id = create(repository, "agent_version", "published", {
        "agent_id": "agent-a", "config": {"tools": [tool_binding], "capabilities": ["files.read"]},
    })
    repository.add_capability_run(CapabilityRun(
        "run-a", "org-a", "project-a", "profile-a", agent_version_id, "running"))
    body = CapabilityResolveRequest(
        agent_version_id=agent_version_id,
        selected_connection_ids=[connection_id] if connection_id else [],
        selected_skill_version_ids=["skill-v1"] if source == "skill" else [],
    )
    return repository, CapabilityGateway(repository), body, tool_id, connection_id


@pytest.mark.parametrize(
    ("run", "principal", "version", "error", "message"),
    [
        (CapabilityRun("run-a", "org-b", "project-a", "profile-a", "version-a", "running"),
         Principal("profile-a", "user-a", "issuer", "org-a", "wo", OrganizationRole.MEMBER),
         "version-a", KeyError, "run_not_found"),
        (CapabilityRun("run-a", "org-a", "project-a", "profile-b", "version-a", "running"),
         PRINCIPAL, "version-a", PermissionError, "run_actor_mismatch"),
        (CapabilityRun("run-a", "org-a", "project-a", "profile-a", "version-a", "completed"),
         PRINCIPAL, "version-a", ConflictError, "run_is_terminal"),
        (CapabilityRun("run-a", "org-a", "project-a", "profile-a", "version-a", "running"),
         PRINCIPAL, "version-b", ConflictError, "agent_version_mismatch"),
    ],
)
def test_run_org_actor_state_and_version_are_bound(run, principal, version, error, message) -> None:
    repository = InMemoryProductRepository()
    repository.add_capability_run(run)
    with pytest.raises(error, match=message):
        CapabilityGateway(repository).resolve(
            run_id="run-a", principal=principal, body=CapabilityResolveRequest(agent_version_id=version))


def test_duplicate_selected_sources_and_duplicate_tool_sources_fail_closed() -> None:
    repository, gateway, body, tool_id, _ = gateway_fixture(source="skill")
    with pytest.raises(ConflictError, match="duplicate_skill_source"):
        gateway.resolve(run_id="run-a", principal=PRINCIPAL,
                        body=body.model_copy(update={"selected_skill_version_ids": ["skill-v1", "skill-v1"]}))

    create(repository, "tool", "active", {"definition": {
        "id": tool_id, "version": "9.9.9", "risk": "read", "source": "skill", "source_id": "skill-v1"}})
    projection = gateway.resolve(run_id="run-a", principal=PRINCIPAL, body=body)
    assert projection["tools"] == []
    assert projection["withheld"] == [{"id": tool_id, "reason": "duplicate_source"}]


def test_run_project_cannot_resolve_an_agent_version_from_another_project() -> None:
    repository, gateway, body, _, _ = gateway_fixture()
    repository.add_capability_run(CapabilityRun(
        "run-a", "org-a", "project-b", "profile-a", body.agent_version_id, "running"))

    with pytest.raises(ConflictError, match="agent_version_unavailable"):
        gateway.resolve(run_id="run-a", principal=PRINCIPAL, body=body)


@pytest.mark.parametrize(
    ("state", "ownership", "owner_id", "reason"),
    [
        ("revoked", "project", "project-a", "connection_revoked_or_unavailable"),
        ("active", "project", "project-b", "connection_out_of_scope"),
        ("active", "user", "profile-b", "connection_out_of_scope"),
        ("active", "organization", "org-b", "connection_out_of_scope"),
    ],
)
def test_connections_must_be_active_and_owned_in_scope(state: str, ownership: str, owner_id: str, reason: str) -> None:
    _, gateway, body, tool_id, _ = gateway_fixture(
        source="app", connection_state=state, ownership=ownership, owner_id=owner_id)
    projection = gateway.resolve(run_id="run-a", principal=PRINCIPAL, body=body)
    assert projection["withheld"] == [{"id": tool_id, "reason": reason}]


def test_unselected_connection_is_unavailable_and_credentials_are_never_projected() -> None:
    _, gateway, body, tool_id, _ = gateway_fixture(
        source="app", tool_extra={"credential_reference": "vault://secret"})
    unavailable = gateway.resolve(
        run_id="run-a", principal=PRINCIPAL,
        body=body.model_copy(update={"selected_connection_ids": []}))
    assert unavailable["withheld"] == [{"id": tool_id, "reason": "source_unavailable"}]

    projection = gateway.resolve(run_id="run-a", principal=PRINCIPAL, body=body)
    assert projection["tools"][0]["id"] == tool_id
    assert "credential" not in str(projection).lower()
    assert "access_token" not in str(projection).lower()


@pytest.mark.parametrize(
    ("binding", "request_update", "reason"),
    [
        ({"max_calls": 2}, {"current_calls": 2}, "call_budget_exhausted"),
        ({"max_concurrency": 1}, {"current_concurrency": 1}, "concurrency_budget_exhausted"),
        ({"max_cost_cents": 10}, {"current_cost_cents": 10}, "cost_budget_exhausted"),
    ],
)
def test_each_capability_budget_exhaustion_withholds_tool(binding: dict, request_update: dict, reason: str) -> None:
    _, gateway, body, tool_id, _ = gateway_fixture(binding=binding)
    projection = gateway.resolve(
        run_id="run-a", principal=PRINCIPAL, body=body.model_copy(update=request_update))
    assert projection["withheld"] == [{"id": tool_id, "reason": reason}]


def approval(repository: InMemoryProductRepository, *, run_id: str, tool_id: str,
             digest: str, key: str | None, expires: datetime) -> str:
    return create(repository, "capability_approval", "approved", {"configuration": {
        "run_id": run_id, "tool_id": tool_id, "argument_digest": digest,
        "idempotency_key": key, "expires_at": expires.isoformat(),
    }})


def test_approval_digest_idempotency_expiry_and_single_consumption_are_bound() -> None:
    repository, gateway, body, tool_id, _ = gateway_fixture(risk="write")
    digest = "sha256:" + "a" * 64
    approval_id = approval(repository, run_id="run-a", tool_id=tool_id, digest=digest,
                           key="idem-key", expires=datetime.now(UTC) + timedelta(minutes=5))
    claim = CapabilityApprovalClaim(
        approval_id=approval_id, tool_id=tool_id, argument_digest=digest, idempotency_key="idem-key")
    projection = gateway.resolve(
        run_id="run-a", principal=PRINCIPAL, body=body.model_copy(update={"approval_claims": [claim]}))
    assert projection["tools"][0]["approval_required"] is False
    assert repository.get(kind="capability_approval", record_id=approval_id, scope=SCOPE).state == "consumed"
    with pytest.raises(ConflictError, match="approval_expired_or_unavailable"):
        gateway.resolve(run_id="run-a", principal=PRINCIPAL,
                        body=body.model_copy(update={"approval_claims": [claim]}))

    for changed in [
        claim.model_copy(update={"argument_digest": "sha256:" + "b" * 64}),
        claim.model_copy(update={"idempotency_key": "other-key"}),
    ]:
        fresh = approval(repository, run_id="run-a", tool_id=tool_id, digest=digest,
                         key="idem-key", expires=datetime.now(UTC) + timedelta(minutes=5))
        with pytest.raises(ConflictError, match="approval_binding_mismatch"):
            gateway.resolve(run_id="run-a", principal=PRINCIPAL, body=body.model_copy(
                update={"approval_claims": [changed.model_copy(update={"approval_id": fresh})]}))

    expired = approval(repository, run_id="run-a", tool_id=tool_id, digest=digest,
                       key="idem-key", expires=datetime.now(UTC) - timedelta(seconds=1))
    with pytest.raises(ConflictError, match="approval_expired_or_unavailable"):
        gateway.resolve(run_id="run-a", principal=PRINCIPAL, body=body.model_copy(update={
            "approval_claims": [claim.model_copy(update={"approval_id": expired})]}))


def test_approval_consumption_is_atomic_when_one_claim_becomes_invalid() -> None:
    repository, gateway, body, tool_id, _ = gateway_fixture(risk="write")
    second_tool = "tool.test.second"
    create(repository, "tool", "active", {"definition": {
        "id": second_tool, "version": "1", "risk": "write", "source": "native"}})
    agent = repository.get(kind="agent_version", record_id=body.agent_version_id, scope=SCOPE)
    agent.payload["config"]["tools"].append({"id": second_tool, "decision": "allow"})
    repository._records[("agent_version", agent.id)] = agent
    digest = "sha256:" + "c" * 64
    first = approval(repository, run_id="run-a", tool_id=tool_id, digest=digest,
                     key=None, expires=datetime.now(UTC) + timedelta(minutes=5))
    second = approval(repository, run_id="run-a", tool_id=second_tool, digest=digest,
                      key=None, expires=datetime.now(UTC) + timedelta(minutes=5))
    repository.update(kind="capability_approval", record_id=second, scope=SCOPE, actor_id="profile-a",
                      expected_version=1, state="consumed")
    claims = [
        CapabilityApprovalClaim(approval_id=first, tool_id=tool_id, argument_digest=digest),
        CapabilityApprovalClaim(approval_id=second, tool_id=second_tool, argument_digest=digest),
    ]
    with pytest.raises(ConflictError, match="approval_expired_or_unavailable"):
        gateway.resolve(run_id="run-a", principal=PRINCIPAL,
                        body=body.model_copy(update={"approval_claims": claims}))
    assert repository.get(kind="capability_approval", record_id=first, scope=SCOPE).state == "approved"


def test_supabase_adapter_fails_closed_until_atomic_approval_rpc_exists() -> None:
    repository = SupabaseProductRepository(object())
    run = CapabilityRun("run-a", "org-a", "project-a", "profile-a", "version-a", "running")
    with pytest.raises(ProductPersistenceUnavailable, match="SELECT FOR UPDATE"):
        repository.record_capability_resolution(
            run=run, actor_id="profile-a", projection_digest="sha256:digest", metadata={},
            approval_claims=({"approval_id": "approval-a"},))
