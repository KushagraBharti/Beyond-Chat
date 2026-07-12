from __future__ import annotations

import inspect
import hashlib
import os
import secrets
from dataclasses import dataclass
from typing import Annotated, Any, Awaitable, Callable

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status

from ..authorization.policy import OrganizationRole, Principal, ResourcePermission
from ..identity.authkit import require_csrf, require_principal
from ..product_persistence import (
    ConflictError, ProductRepository, ProjectDirectory, Scope,
    configured_project_directory, schema_manifest,
)
from .authorization import ScopeAuthorizer
from .schemas import (
    ActionRequest, AutomationCreate, CapabilityResolveRequest, CommentCreate, MemoryProposal, ModelRunRequest, ProjectCreate, QueryRequest, ResourceCreate,
    ResourcePatch, ReviewCreate, StateTransition, VersionCreate,
)
from .automation_service import (
    AutomationLifecycle, AutomationTriggerError, OwnerGuard, WebhookSignatureError,
    automation_webhook_secret, supabase_owner_guard, verify_signed_trigger,
)
from .capability_gateway import CapabilityGateway
from .service import DisabledProviderRegistry, ProductService, ProviderRegistry
from .providers import ProviderCallError, ProviderScope

PrincipalDependency = Callable[[], Principal | Awaitable[Principal]]
MutationDependency = Callable[[], None | Awaitable[None]]
IdempotencyKey = Annotated[str, Header(alias="Idempotency-Key", min_length=8, max_length=255)]
ExpectedVersion = Annotated[int, Header(alias="If-Match", ge=1)]


@dataclass(frozen=True)
class ProductApiDependencies:
    repository: ProductRepository
    authorize_scope: ScopeAuthorizer
    principal: PrincipalDependency = require_principal
    mutation_guard: MutationDependency = require_csrf
    providers: ProviderRegistry = DisabledProviderRegistry()
    # Project directory defaults from the configured Supabase service so the
    # composition root does not need to change; tests inject an in-memory one.
    projects: ProjectDirectory | None = None
    # Owner-offboarding guard for automation service principals; tests inject
    # a deterministic one, production defaults to the canonical membership
    # lookup.
    owner_guard: OwnerGuard | None = None


async def _maybe(value: Any) -> Any:
    return await value if inspect.isawaitable(value) else value


def create_product_router(deps: ProductApiDependencies) -> APIRouter:
    """Create the unmounted Phase 5-12 aggregate router.

    Composition must provide canonical WorkOS principal resolution, current
    project/team authorization, durable persistence, and explicit provider gates.
    """
    router = APIRouter(prefix="/api/v2/product", tags=["product-v2"])
    service = ProductService(deps.repository, deps.providers)
    capability_gateway = CapabilityGateway(deps.repository)
    automation_lifecycle = AutomationLifecycle(service, deps.owner_guard or supabase_owner_guard())

    async def scope(principal: Principal, project_id: str | None, team_id: str | None,
                    permission: ResourcePermission) -> Scope:
        await _maybe(deps.authorize_scope(principal, project_id, team_id, permission))
        return Scope(principal.organization_id, project_id, team_id)

    async def mutation() -> None:
        await _maybe(deps.mutation_guard())

    def run(call: Callable[[], Any]) -> Any:
        try:
            return call()
        except PermissionError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc)) from exc
        except KeyError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Resource not found.") from exc
        except ConflictError as exc:
            raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
        except AutomationTriggerError as exc:
            if exc.code == "signing_unconfigured":
                raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
            raise HTTPException(status.HTTP_409_CONFLICT,
                                {"code": exc.code, "message": str(exc)}) from exc
        except RuntimeError as exc:
            if str(exc).startswith("provider_unavailable:"):
                raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
            raise

    async def provider_call(call: Callable[[], Any]) -> Any:
        try:
            return await _maybe(call())
        except ProviderCallError as exc:
            if exc.code in {"approval_required", "tool_not_allowed", "toolkit_not_allowed",
                            "model_not_allowed", "connection_not_in_scope"}:
                code = status.HTTP_403_FORBIDDEN
            elif exc.code in {"tool_version_not_allowed", "connection_not_active"}:
                code = status.HTTP_409_CONFLICT
            elif exc.code in {"token_budget_exceeded", "cost_budget_exceeded",
                              "estimated_cost_exceeds_budget"}:
                code = status.HTTP_422_UNPROCESSABLE_ENTITY
            else:
                code = status.HTTP_503_SERVICE_UNAVAILABLE
            raise HTTPException(code, {"provider": exc.provider, "code": exc.code,
                                       "retryable": exc.retryable}) from exc

    def provider_scope(principal: Principal, project_id: str) -> ProviderScope:
        return ProviderScope(principal.organization_id, project_id, principal.profile_id)

    @router.get("/schema-manifest")
    async def manifest(principal: Principal = Depends(deps.principal)):
        if principal.role not in {OrganizationRole.OWNER, OrganizationRole.ADMIN}:
            raise HTTPException(403, "Administrative role required.")
        return schema_manifest()

    @router.post("/runtime/runs/{run_id}/capabilities:resolve")
    async def resolve_run_capabilities(run_id: str, body: CapabilityResolveRequest,
                                       principal: Principal = Depends(deps.principal),
                                       _guard: None = Depends(mutation)):
        capability_run = deps.repository.get_capability_run(run_id=run_id)
        if capability_run is None or capability_run.organization_id != principal.organization_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Run not found.")
        await scope(principal, capability_run.project_id, None, ResourcePermission.USE)
        return run(lambda: capability_gateway.resolve(run_id=run_id, principal=principal, body=body))

    project_directory = deps.projects or configured_project_directory()

    @router.get("/projects")
    async def list_projects(principal: Principal = Depends(deps.principal)):
        await scope(principal, None, None, ResourcePermission.VIEW)
        return {"items": run(lambda: project_directory.list_projects(
            organization_id=principal.organization_id,
            profile_id=principal.profile_id, role=principal.role))}

    @router.post("/projects", status_code=status.HTTP_201_CREATED)
    async def create_project(body: ProjectCreate,
                             principal: Principal = Depends(deps.principal),
                             _guard: None = Depends(mutation)):
        await scope(principal, None, None, ResourcePermission.VIEW)

        def call():
            service.require_role(principal, OrganizationRole.MEMBER)
            return project_directory.create_project(
                organization_id=principal.organization_id, profile_id=principal.profile_id,
                name=body.name, description=body.description, visibility=body.visibility)

        return run(call)

    @router.get("/projects/{project_id}")
    async def get_project(project_id: str, principal: Principal = Depends(deps.principal)):
        await scope(principal, project_id, None, ResourcePermission.VIEW)
        project = run(lambda: project_directory.get_project(
            organization_id=principal.organization_id, project_id=project_id,
            profile_id=principal.profile_id, role=principal.role))
        if project is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Resource not found.")
        return project

    _ORGANIZATION_RECENT_KINDS = {
        "outputs": ("output", ()),
        "approvals": ("capability_approval", ("pending",)),
        "automations": ("automation", ()),
        "agents": ("agent_version", ("published",)),
    }

    @router.get("/organization/recent/{surface}")
    async def organization_recent(surface: str,
                                  limit: int = Query(default=20, ge=1, le=100),
                                  principal: Principal = Depends(deps.principal)):
        selected = _ORGANIZATION_RECENT_KINDS.get(surface)
        if selected is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Resource not found.")
        await scope(principal, None, None, ResourcePermission.VIEW)
        kind, states = selected
        return {"items": run(lambda: service.list_recent(
            kind, principal.organization_id, states=states, limit=limit))}

    @router.get("/workspace/capabilities")
    async def workspace_capabilities(principal: Principal = Depends(deps.principal)):
        """Truthful server-computed readiness for workspace surfaces.

        The UI must never imply live execution or connected providers from
        catalog records alone; it renders availability from this response.
        """
        await scope(principal, None, None, ResourcePermission.VIEW)

        def provider_state(capability: str) -> dict[str, Any]:
            try:
                value = dict(deps.providers.status(capability, organization_id=principal.organization_id))
            except Exception:
                return {"state": "unavailable", "externally_verified": False}
            return {"state": str(value.get("state", "unavailable")),
                    "externally_verified": value.get("externally_verified") is True}

        return {
            "runtime_execution": os.getenv(
                "BEYOND_RUNTIME_CONTROL_PLANE_ENABLED", "false").strip().lower() == "true",
            "providers": {capability: provider_state(capability)
                          for capability in ("models", "retrieval", "actions", "billing")},
        }

    @router.get("/catalog")
    async def catalog(principal: Principal = Depends(deps.principal)):
        org_scope = await scope(principal, None, None, ResourcePermission.VIEW)
        return {"built_in_agents": [
                    {"id": "general", "name": "General Agent", "state": "catalog_only"},
                    {"id": "research", "name": "Research Agent", "state": "catalog_only"},
                    {"id": "finance", "name": "Finance Agent", "state": "catalog_only"}],
                "skills": service.list("skill", org_scope), "tools": service.list("tool", org_scope),
                "apps": service.list("app", org_scope), "mcp_servers": service.list("mcp_server", org_scope)}

    @router.get("/models")
    async def models(principal: Principal = Depends(deps.principal)):
        await scope(principal, None, None, ResourcePermission.VIEW)
        method = getattr(service.providers, "model_catalog", None)
        if method is None:
            raise HTTPException(503, "provider_unavailable:models")
        return {"items": await provider_call(method)}

    @router.post("/models/run")
    async def run_model(body: ModelRunRequest, principal: Principal = Depends(deps.principal),
                        _guard: None = Depends(mutation)):
        await scope(principal, None, None, ResourcePermission.USE)
        method = getattr(service.providers, "run_model", None)
        if method is None:
            raise HTTPException(503, "provider_unavailable:models")
        return await provider_call(lambda: method(
            model=body.model, messages=[item.model_dump() for item in body.messages],
            max_completion_tokens=body.max_completion_tokens, budget_cents=body.budget_cents,
            temperature=body.temperature))

    @router.get("/slash")
    async def slash(q: str = Query(default="", max_length=200), principal: Principal = Depends(deps.principal)):
        data = await catalog(principal)
        commands = ["/skills", "/apps", "/mcp", "/source", "/file", "/document",
                    "/spreadsheet", "/presentation", "/image", "/schedule"]
        needle = q.casefold().lstrip("/")
        refs = [{"type": "command", "stable_id": item, "label": item} for item in commands if needle in item.casefold()]
        for kind in ("built_in_agents", "skills", "tools", "apps", "mcp_servers"):
            for item in data[kind]:
                label = item.get("name") or item.get("payload", {}).get("name") or item.get("id")
                if not needle or needle in str(label).casefold():
                    refs.append({"type": kind.rstrip("s"), "stable_id": item.get("id"), "label": label})
        return {"items": refs[:50]}

    async def list_kind(kind: str, project_id: str, principal: Principal, team_id: str | None = None):
        return {"items": service.list(kind, await scope(principal, project_id, team_id, ResourcePermission.VIEW))}

    @router.get("/projects/{project_id}/skills")
    async def skills(project_id: str, team_id: str | None = None, principal: Principal = Depends(deps.principal)):
        return await list_kind("skill", project_id, principal, team_id)

    @router.get("/projects/{project_id}/tools")
    async def tools(project_id: str, team_id: str | None = None, principal: Principal = Depends(deps.principal)):
        return await list_kind("tool", project_id, principal, team_id)

    @router.get("/projects/{project_id}/apps")
    async def apps(project_id: str, team_id: str | None = None, principal: Principal = Depends(deps.principal)):
        return await list_kind("app", project_id, principal, team_id)

    @router.get("/projects/{project_id}/mcp")
    async def mcp(project_id: str, team_id: str | None = None, principal: Principal = Depends(deps.principal)):
        return await list_kind("mcp_server", project_id, principal, team_id)

    @router.post("/projects/{project_id}/connections", status_code=201)
    async def create_connection(project_id: str, body: ResourceCreate, idempotency_key: IdempotencyKey,
                                principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, body.team_id, ResourcePermission.EDIT)
        payload = body.model_dump(exclude={"team_id"})
        payload["provider"] = service.providers.status("connections", organization_id=principal.organization_id)
        record = run(lambda: service.create(kind="connection", scope=target, principal=principal,
            idempotency_key=idempotency_key, payload=payload, state="requested"))
        toolkit = body.configuration.get("toolkit")
        method = getattr(service.providers, "connect_link", None)
        if not isinstance(toolkit, str) or not toolkit or method is None:
            return record
        if record["state"] != "requested" or "oauth_state_digest" in record["payload"]:
            return record
        raw_state = secrets.token_urlsafe(32)
        oauth = await provider_call(lambda: method(
            scope=provider_scope(principal, project_id), toolkit=toolkit,
            connection_record_id=record["id"], state=raw_state))
        connected_account_id = oauth.get("connected_account_id")
        updated_payload = {**record["payload"], "oauth_state_digest": hashlib.sha256(raw_state.encode()).hexdigest(),
                           "provider_version": oauth.get("provider_version")}
        if isinstance(connected_account_id, str) and connected_account_id:
            updated_payload["connected_account_id"] = connected_account_id
        updated = run(lambda: service.update(kind="connection", record_id=record["id"], scope=target,
            principal=principal, expected_version=record["version"], payload=updated_payload, state="authorizing"))
        return {**updated, "oauth": {"redirect_url": oauth["redirect_url"],
                                      "expires_at": oauth.get("expires_at")}}

    @router.get("/projects/{project_id}/connections/{connection_id}/callback")
    async def connection_callback(project_id: str, connection_id: str, state: str,
                                  provider_status: str = Query(alias="status"),
                                  connected_account_id: str | None = None,
                                  principal: Principal = Depends(deps.principal)):
        target = await scope(principal, project_id, None, ResourcePermission.EDIT)
        if provider_status != "success":
            raise HTTPException(400, "Provider OAuth did not complete successfully.")
        record = run(lambda: service.get("connection", connection_id, target))
        expected = record["payload"].get("oauth_state_digest")
        if not isinstance(expected, str) or not secrets.compare_digest(
            expected, hashlib.sha256(state.encode()).hexdigest()
        ):
            raise HTTPException(400, "Invalid OAuth state.")
        provider_account_id = connected_account_id or record["payload"].get("connected_account_id")
        method = getattr(service.providers, "connection_status", None)
        if method is None or not isinstance(provider_account_id, str):
            raise HTTPException(503, "provider_unavailable:connections")
        remote = await provider_call(lambda: method(scope=provider_scope(principal, project_id),
            connected_account_id=provider_account_id))
        if remote.get("status") != "active":
            raise HTTPException(409, "Provider connection is not active.")
        payload = {key: value for key, value in record["payload"].items() if key != "oauth_state_digest"}
        payload.update({"connected_account_id": provider_account_id,
                        "provider_version": remote.get("provider_version"), "toolkit": remote.get("toolkit")})
        return run(lambda: service.update(kind="connection", record_id=connection_id, scope=target,
            principal=principal, expected_version=record["version"], payload=payload, state="active"))

    @router.get("/projects/{project_id}/connections/{connection_id}/status")
    async def get_connection_status(project_id: str, connection_id: str,
                                    principal: Principal = Depends(deps.principal)):
        target = await scope(principal, project_id, None, ResourcePermission.VIEW)
        record = run(lambda: service.get("connection", connection_id, target))
        connected_account_id = record["payload"].get("connected_account_id")
        method = getattr(service.providers, "connection_status", None)
        if not isinstance(connected_account_id, str) or method is None:
            raise HTTPException(503, "provider_unavailable:connections")
        return await provider_call(lambda: method(scope=provider_scope(principal, project_id),
            connected_account_id=connected_account_id))

    @router.post("/projects/{project_id}/connections/{connection_id}/actions")
    async def execute_connection_action(project_id: str, connection_id: str, body: ActionRequest,
                                        principal: Principal = Depends(deps.principal),
                                        _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.USE)
        record = run(lambda: service.get("connection", connection_id, target))
        connected_account_id = record["payload"].get("connected_account_id")
        if not isinstance(connected_account_id, str):
            raise HTTPException(409, "Connection is not active.")
        approved = False
        if body.approval_id:
            approval = run(lambda: service.get("capability_approval", body.approval_id, target))
            config = approval["payload"].get("configuration", {})
            approved = (approval["state"] == "approved" and config.get("connection_id") == connection_id
                        and config.get("tool_slug") == body.tool_slug)
        method = getattr(service.providers, "execute_action", None)
        if method is None:
            raise HTTPException(503, "provider_unavailable:composio_actions")
        return await provider_call(lambda: method(scope=provider_scope(principal, project_id),
            connected_account_id=connected_account_id, tool_slug=body.tool_slug,
            arguments=body.arguments, version=body.version, approved=approved))

    @router.post("/projects/{project_id}/connections/{connection_id}/disconnect")
    async def disconnect_connection(project_id: str, connection_id: str,
                                    expected_version: ExpectedVersion,
                                    principal: Principal = Depends(deps.principal),
                                    _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.EDIT)
        record = run(lambda: service.get("connection", connection_id, target))
        connected_account_id = record["payload"].get("connected_account_id")
        method = getattr(service.providers, "revoke_connection", None)
        if not isinstance(connected_account_id, str) or method is None:
            raise HTTPException(503, "provider_unavailable:connections")
        result = await provider_call(lambda: method(scope=provider_scope(principal, project_id),
            connected_account_id=connected_account_id))
        if result.get("revocation_propagated") is not True:
            raise HTTPException(503, "Provider revocation has not propagated.")
        payload = {key: value for key, value in record["payload"].items()
                   if key not in {"connected_account_id", "oauth_state_digest"}}
        payload["revocation"] = result
        return run(lambda: service.update(kind="connection", record_id=connection_id, scope=target,
            principal=principal, expected_version=expected_version, payload=payload, state="disconnected"))

    @router.post("/projects/{project_id}/capability-approvals", status_code=201)
    async def request_capability_approval(project_id: str, body: ResourceCreate, idempotency_key: IdempotencyKey,
                                          principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, body.team_id, ResourcePermission.USE)
        return run(lambda: service.create(kind="capability_approval", scope=target, principal=principal,
            idempotency_key=idempotency_key, payload=body.model_dump(exclude={"team_id"}), state="pending"))

    @router.post("/projects/{project_id}/capability-approvals/{approval_id}/resolve")
    async def resolve_capability_approval(project_id: str, approval_id: str, body: StateTransition,
                                          expected_version: ExpectedVersion, principal: Principal = Depends(deps.principal),
                                          _guard: None = Depends(mutation)):
        if body.state not in {"approved", "denied"}:
            raise HTTPException(422, "State must be approved or denied.")
        target = await scope(principal, project_id, None, ResourcePermission.MANAGE)
        return run(lambda: service.update(kind="capability_approval", record_id=approval_id, scope=target,
            principal=principal, expected_version=expected_version, state=body.state,
            payload={"reason": body.reason}, minimum=OrganizationRole.ADMIN))

    @router.post("/projects/{project_id}/knowledge/connections", status_code=201)
    async def create_knowledge_connection(project_id: str, body: ResourceCreate, idempotency_key: IdempotencyKey,
                                           principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, body.team_id, ResourcePermission.EDIT)
        return run(lambda: service.create(kind="knowledge_connection", scope=target, principal=principal,
            idempotency_key=idempotency_key, payload=body.model_dump(exclude={"team_id"}), state="requested"))

    @router.get("/projects/{project_id}/knowledge/sources")
    async def sources(project_id: str, principal: Principal = Depends(deps.principal)):
        return await list_kind("source", project_id, principal)

    @router.post("/projects/{project_id}/knowledge/connections/{connection_id}/syncs", status_code=202)
    async def start_sync(project_id: str, connection_id: str, idempotency_key: IdempotencyKey,
                         principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.EDIT)
        run(lambda: service.require_provider("knowledge_sync", principal))
        return run(lambda: service.append(kind="sync", parent_kind="knowledge_connection", parent_id=connection_id,
            scope=target, principal=principal, idempotency_key=idempotency_key, payload={}, state="queued"))

    @router.post("/projects/{project_id}/knowledge/retrieval", status_code=201)
    async def retrieve(project_id: str, body: QueryRequest, idempotency_key: IdempotencyKey,
                       principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.USE)
        if body.source_ids:
            raise HTTPException(503, "Governed source retrieval requires an ACL-aware knowledge adapter.")
        method = getattr(service.providers, "retrieve", None)
        if method is None:
            raise HTTPException(503, "provider_unavailable:retrieval")
        result = await provider_call(lambda: method(query=body.query, limit=body.limit))
        return run(lambda: service.create(kind="retrieval", scope=target, principal=principal,
            idempotency_key=idempotency_key, payload={**body.model_dump(), "provider_result": result},
            state="completed"))

    @router.get("/projects/{project_id}/knowledge/citations")
    async def citations(project_id: str, principal: Principal = Depends(deps.principal)):
        return await list_kind("citation", project_id, principal)

    @router.get("/projects/{project_id}/memory")
    async def memories(project_id: str, principal: Principal = Depends(deps.principal)):
        return await list_kind("memory", project_id, principal)

    @router.post("/projects/{project_id}/memory", status_code=201)
    async def remember(project_id: str, body: MemoryProposal, idempotency_key: IdempotencyKey,
                       principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.EDIT)
        return run(lambda: service.create(kind="memory", scope=target, principal=principal,
            idempotency_key=idempotency_key, payload=body.model_dump(), state="active"))

    @router.get("/projects/{project_id}/memory/proposals")
    async def memory_proposals(project_id: str,
                               states: Annotated[list[str] | None, Query(alias="state")] = None,
                               principal: Principal = Depends(deps.principal)):
        target = await scope(principal, project_id, None, ResourcePermission.VIEW)
        return {"items": run(lambda: service.list(
            "memory_proposal", target, states=tuple(states or ())))}

    @router.post("/projects/{project_id}/memory/proposals", status_code=201)
    async def propose_memory(project_id: str, body: MemoryProposal, idempotency_key: IdempotencyKey,
                             principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.USE)
        return run(lambda: service.create(kind="memory_proposal", scope=target, principal=principal,
            idempotency_key=idempotency_key, payload=body.model_dump(), state="pending"))

    @router.post("/projects/{project_id}/memory/proposals/{proposal_id}/resolve")
    async def resolve_memory(project_id: str, proposal_id: str, body: StateTransition,
                             expected_version: ExpectedVersion, principal: Principal = Depends(deps.principal),
                             _guard: None = Depends(mutation)):
        if body.state not in {"accepted", "rejected"}:
            raise HTTPException(422, "State must be accepted or rejected.")
        target = await scope(principal, project_id, None, ResourcePermission.EDIT)
        return run(lambda: service.update(kind="memory_proposal", record_id=proposal_id, scope=target,
            principal=principal, expected_version=expected_version, state=body.state, payload={"reason": body.reason}))

    @router.patch("/projects/{project_id}/memory/{memory_id}")
    async def update_memory(project_id: str, memory_id: str, body: ResourcePatch,
                            expected_version: ExpectedVersion, principal: Principal = Depends(deps.principal),
                            _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.EDIT)
        return run(lambda: service.update(kind="memory", record_id=memory_id, scope=target, principal=principal,
            expected_version=expected_version, payload=body.model_dump(exclude_none=True)))

    @router.post("/projects/{project_id}/memory/{memory_id}/{operation}")
    async def memory_operation(project_id: str, memory_id: str, operation: str, expected_version: ExpectedVersion,
                               principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        states = {"disable": "disabled", "delete": "deleted", "restore": "active"}
        if operation not in states:
            raise HTTPException(404, "Unknown memory operation.")
        target = await scope(principal, project_id, None, ResourcePermission.EDIT)
        return run(lambda: service.update(kind="memory", record_id=memory_id, scope=target, principal=principal,
            expected_version=expected_version, state=states[operation]))

    @router.get("/projects/{project_id}/memory/export")
    async def export_memory(project_id: str, principal: Principal = Depends(deps.principal)):
        target = await scope(principal, project_id, None, ResourcePermission.VIEW)
        return {"format": "application/json", "items": service.list("memory", target)}

    @router.post("/projects/{project_id}/agents/drafts", status_code=201)
    async def create_agent_draft(project_id: str, body: ResourceCreate, idempotency_key: IdempotencyKey,
                                 principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, body.team_id, ResourcePermission.EDIT)
        return run(lambda: service.create(kind="agent_draft", scope=target, principal=principal,
            idempotency_key=idempotency_key, payload=body.model_dump(exclude={"team_id"}), state="draft"))

    @router.patch("/projects/{project_id}/agents/drafts/{draft_id}")
    async def update_agent_draft(project_id: str, draft_id: str, body: ResourcePatch,
                                 expected_version: ExpectedVersion, principal: Principal = Depends(deps.principal),
                                 _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.EDIT)
        return run(lambda: service.update(kind="agent_draft", record_id=draft_id, scope=target,
            principal=principal, expected_version=expected_version, payload=body.model_dump(exclude_none=True)))

    @router.post("/projects/{project_id}/agents/drafts/{draft_id}/publish", status_code=201)
    async def publish_agent(project_id: str, draft_id: str, idempotency_key: IdempotencyKey,
                            principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.MANAGE)
        draft = run(lambda: service.get("agent_draft", draft_id, target))
        return run(lambda: service.append(kind="agent_version", parent_kind="agent_draft", parent_id=draft_id,
            scope=target, principal=principal, idempotency_key=idempotency_key,
            payload={"manifest": draft["payload"], "source_version": draft["version"]}, state="published",
            minimum=OrganizationRole.BUILDER))

    @router.get("/projects/{project_id}/agents/{agent_id}/resolve")
    async def resolve_agent(project_id: str, agent_id: str, principal: Principal = Depends(deps.principal)):
        target = await scope(principal, project_id, None, ResourcePermission.USE)
        deployments = service.list("agent_deployment", target, ("active",))
        matches = [item for item in deployments if item["payload"].get("agent_id") == agent_id]
        if not matches:
            raise HTTPException(404, "No active deployment resolves for this scope.")
        return matches[0]

    @router.post("/projects/{project_id}/agents/{agent_id}/deployments", status_code=201)
    async def deploy_agent(project_id: str, agent_id: str, body: ResourceCreate,
                           idempotency_key: IdempotencyKey, principal: Principal = Depends(deps.principal),
                           _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, body.team_id, ResourcePermission.MANAGE)
        version_id = body.configuration.get("agent_version_id")
        if not isinstance(version_id, str) or not version_id:
            raise HTTPException(422, "configuration.agent_version_id is required.")
        run(lambda: service.get("agent_version", version_id, target))
        return run(lambda: service.create(kind="agent_deployment", scope=target, principal=principal,
            idempotency_key=idempotency_key,
            payload={"agent_id": agent_id, "agent_version_id": version_id,
                     "audience": body.configuration.get("audience", "private")},
            state="active", minimum=OrganizationRole.BUILDER))

    @router.get("/projects/{project_id}/outputs")
    async def outputs(project_id: str, principal: Principal = Depends(deps.principal)):
        return await list_kind("output", project_id, principal)

    @router.post("/projects/{project_id}/outputs", status_code=201)
    async def create_output(project_id: str, body: ResourceCreate, idempotency_key: IdempotencyKey,
                            principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, body.team_id, ResourcePermission.EDIT)
        return run(lambda: service.create(kind="output", scope=target, principal=principal,
            idempotency_key=idempotency_key, payload=body.model_dump(exclude={"team_id"}), state="draft"))

    @router.post("/projects/{project_id}/outputs/{output_id}/versions", status_code=201)
    async def create_output_version(project_id: str, output_id: str, body: VersionCreate,
                                    idempotency_key: IdempotencyKey, principal: Principal = Depends(deps.principal),
                                    _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.EDIT)
        return run(lambda: service.append(kind="output_version", parent_kind="output", parent_id=output_id,
            scope=target, principal=principal, idempotency_key=idempotency_key, payload=body.model_dump(), state="committed"))

    @router.post("/projects/{project_id}/outputs/{output_id}/comments", status_code=201)
    async def create_comment(project_id: str, output_id: str, body: CommentCreate,
                             idempotency_key: IdempotencyKey, principal: Principal = Depends(deps.principal),
                             _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.VIEW)
        return run(lambda: service.append(kind="comment", parent_kind="output", parent_id=output_id,
            scope=target, principal=principal, idempotency_key=idempotency_key, payload=body.model_dump(), state="active"))

    @router.post("/projects/{project_id}/outputs/{output_id}/reviews", status_code=201)
    async def create_review(project_id: str, output_id: str, body: ReviewCreate,
                            idempotency_key: IdempotencyKey, principal: Principal = Depends(deps.principal),
                            _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.EDIT)
        return run(lambda: service.append(kind="review", parent_kind="output", parent_id=output_id,
            scope=target, principal=principal, idempotency_key=idempotency_key, payload=body.model_dump(), state="pending"))

    @router.post("/projects/{project_id}/reviews/{review_id}/decisions", status_code=201)
    async def review_decision(project_id: str, review_id: str, body: StateTransition,
                              idempotency_key: IdempotencyKey, principal: Principal = Depends(deps.principal),
                              _guard: None = Depends(mutation)):
        if body.state not in {"approved", "changes_requested", "rejected"}:
            raise HTTPException(422, "Invalid review decision.")
        target = await scope(principal, project_id, None, ResourcePermission.VIEW)
        return run(lambda: service.append(kind="review_decision", parent_kind="review", parent_id=review_id,
            scope=target, principal=principal, idempotency_key=idempotency_key,
            payload=body.model_dump(), state=body.state))

    @router.post("/projects/{project_id}/outputs/{output_id}/realtime-hints", status_code=202)
    async def realtime_hint(project_id: str, output_id: str, body: StateTransition,
                            idempotency_key: IdempotencyKey, principal: Principal = Depends(deps.principal),
                            _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.VIEW)
        return run(lambda: service.append(kind="realtime_hint", parent_kind="output", parent_id=output_id,
            scope=target, principal=principal, idempotency_key=idempotency_key,
            payload=body.model_dump(), state="hint"))

    @router.post("/projects/{project_id}/automations", status_code=201)
    async def create_automation(project_id: str, body: AutomationCreate, idempotency_key: IdempotencyKey,
                                principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, body.team_id, ResourcePermission.MANAGE)
        return run(lambda: service.create(kind="automation", scope=target, principal=principal,
            idempotency_key=idempotency_key, payload=body.model_dump(exclude={"team_id"}), state="draft",
            minimum=OrganizationRole.BUILDER))

    @router.get("/projects/{project_id}/automations")
    async def automations(project_id: str, principal: Principal = Depends(deps.principal)):
        return await list_kind("automation", project_id, principal)

    @router.patch("/projects/{project_id}/automations/{automation_id}")
    async def update_automation(project_id: str, automation_id: str, body: ResourcePatch,
                                expected_version: ExpectedVersion, principal: Principal = Depends(deps.principal),
                                _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.MANAGE)
        return run(lambda: service.update(kind="automation", record_id=automation_id, scope=target,
            principal=principal, expected_version=expected_version,
            payload=body.model_dump(exclude_none=True), minimum=OrganizationRole.BUILDER))

    @router.post("/projects/{project_id}/automations/{automation_id}/state/{operation}")
    async def automation_operation(project_id: str, automation_id: str, operation: str,
                                   expected_version: ExpectedVersion, principal: Principal = Depends(deps.principal),
                                   _guard: None = Depends(mutation)):
        states = {"pause": "paused", "resume": "active", "archive": "archived"}
        if operation not in states:
            raise HTTPException(404, "Unknown automation operation.")
        target = await scope(principal, project_id, None, ResourcePermission.MANAGE)
        return run(lambda: service.update(kind="automation", record_id=automation_id, scope=target,
            principal=principal, expected_version=expected_version, state=states[operation],
            minimum=OrganizationRole.BUILDER))

    @router.post("/projects/{project_id}/automations/{automation_id}/trigger", status_code=202)
    async def trigger_automation(project_id: str, automation_id: str, idempotency_key: IdempotencyKey,
                                 principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.USE)
        run(lambda: service.require_provider("automations", principal))
        return run(lambda: automation_lifecycle.enqueue(
            scope=target, automation_id=automation_id, trigger_source="manual",
            trigger_key=f"manual:{automation_id}:{idempotency_key}", principal=principal))

    @router.post("/projects/{project_id}/automations/{automation_id}/test", status_code=202)
    async def test_automation(project_id: str, automation_id: str, idempotency_key: IdempotencyKey,
                              principal: Principal = Depends(deps.principal), _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.MANAGE)
        run(lambda: service.require_role(principal, OrganizationRole.BUILDER))
        return run(lambda: automation_lifecycle.enqueue(
            scope=target, automation_id=automation_id, trigger_source="test",
            trigger_key=f"test:{automation_id}:{idempotency_key}", principal=principal, test=True))

    @router.post("/projects/{project_id}/automations/{automation_id}/versions", status_code=201)
    async def publish_automation_version(project_id: str, automation_id: str, idempotency_key: IdempotencyKey,
                                         principal: Principal = Depends(deps.principal),
                                         _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.MANAGE)
        return run(lambda: automation_lifecycle.publish_version(
            scope=target, principal=principal, automation_id=automation_id,
            idempotency_key=idempotency_key))

    @router.get("/projects/{project_id}/automations/{automation_id}/versions")
    async def automation_versions(project_id: str, automation_id: str,
                                  principal: Principal = Depends(deps.principal)):
        target = await scope(principal, project_id, None, ResourcePermission.VIEW)
        return {"items": run(lambda: [
            item for item in service.list("automation_version", target)
            if item["payload"].get("parent_id") == automation_id])}

    @router.get("/projects/{project_id}/automations/{automation_id}/executions")
    async def automation_executions(project_id: str, automation_id: str,
                                    principal: Principal = Depends(deps.principal)):
        target = await scope(principal, project_id, None, ResourcePermission.VIEW)
        return {"items": run(lambda: [
            item for item in service.list("automation_execution", target)
            if item["payload"].get("parent_id") == automation_id])}

    @router.post("/projects/{project_id}/automations/{automation_id}/executions/{execution_id}/retry",
                 status_code=202)
    async def retry_automation_execution(project_id: str, automation_id: str, execution_id: str,
                                         principal: Principal = Depends(deps.principal),
                                         _guard: None = Depends(mutation)):
        target = await scope(principal, project_id, None, ResourcePermission.MANAGE)
        run(lambda: service.require_role(principal, OrganizationRole.BUILDER))
        return run(lambda: automation_lifecycle.retry(
            scope=target, principal=principal, automation_id=automation_id,
            execution_id=execution_id))

    @router.get("/projects/{project_id}/automations/{automation_id}/webhook-secret")
    async def automation_webhook_signing(project_id: str, automation_id: str,
                                         principal: Principal = Depends(deps.principal)):
        target = await scope(principal, project_id, None, ResourcePermission.MANAGE)
        run(lambda: service.require_role(principal, OrganizationRole.BUILDER))
        run(lambda: service.get("automation", automation_id, target))
        return {"scheme": "t=<unix>,v1=hmac_sha256(secret, t + '.' + body)",
                "secret": run(lambda: automation_webhook_secret(automation_id))}

    @router.get("/organization/automation-failures")
    async def automation_failures(limit: int = Query(default=50, ge=1, le=100),
                                  principal: Principal = Depends(deps.principal)):
        await scope(principal, None, None, ResourcePermission.VIEW)
        return {"items": run(lambda: service.list_recent(
            "automation_execution", principal.organization_id,
            states=("failed", "dead_letter"), limit=limit))}

    async def _ingest_signed_trigger(organization_id: str, automation_id: str, request: Request,
                                     source: str, secret: str, event_id_field: str):
        payload = await request.body()
        try:
            parsed = verify_signed_trigger(
                payload, request.headers.get("beyond-trigger-signature", ""), secret)
        except WebhookSignatureError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
        event_id = parsed.get(event_id_field)
        if not isinstance(event_id, str) or not event_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                f"The trigger payload requires a string '{event_id_field}'.")
        # Automations are project-scoped records; resolve the project from the
        # record itself rather than trusting the caller with a project ID.
        found = next((candidate for candidate in deps.repository.list_recent(
            kind="automation", organization_id=organization_id, limit=100)
            if candidate.id == automation_id), None)
        if found is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Resource not found.")
        record_scope = Scope(found.scope.organization_id, found.scope.project_id, found.scope.team_id)
        try:
            execution = automation_lifecycle.enqueue(
                scope=record_scope, automation_id=automation_id, trigger_source=source,
                trigger_key=f"{source}:{automation_id}:{event_id}", trigger_payload=parsed)
        except AutomationTriggerError as exc:
            # Deliberate non-run outcomes acknowledge with 200 so the sender
            # does not retry-storm; nothing external happened.
            return {"result": f"ignored_{exc.code}"}
        return {"result": "enqueued", "execution_id": execution["id"]}

    @router.post("/webhooks/automations/{organization_id}/{automation_id}", include_in_schema=False)
    async def automation_webhook(organization_id: str, automation_id: str, request: Request):
        secret = run(lambda: automation_webhook_secret(automation_id))
        return await _ingest_signed_trigger(organization_id, automation_id, request,
                                            "webhook", secret, "event_id")

    @router.post("/webhooks/composio-triggers/{organization_id}/{automation_id}", include_in_schema=False)
    async def composio_trigger_webhook(organization_id: str, automation_id: str, request: Request):
        secret = os.getenv("COMPOSIO_TRIGGER_SECRET", "")
        if not secret:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                                "COMPOSIO_TRIGGER_SECRET is not configured.")
        return await _ingest_signed_trigger(organization_id, automation_id, request,
                                            "composio", secret, "id")

    @router.post("/automations/scheduler/tick", include_in_schema=False)
    async def scheduler_tick(request: Request):
        expected = os.getenv("AUTOMATION_SCHEDULER_SECRET", "")
        provided = request.headers.get("x-scheduler-secret", "")
        if not expected:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                                "AUTOMATION_SCHEDULER_SECRET is not configured.")
        if not secrets.compare_digest(expected, provided):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Scheduler authentication failed.")
        import time as _time

        from .service import record_dict as _record_dict

        automations = [_record_dict(item) for item in deps.repository.list_global(
            kind="automation", states=("active",), limit=500)]
        return run(lambda: automation_lifecycle.scheduler_tick(
            automations, now_epoch=int(_time.time())))

    @router.get("/billing/status")
    async def billing_status(principal: Principal = Depends(deps.principal)):
        return await service.billing_status(principal)

    @router.get("/entitlements")
    async def entitlements(principal: Principal = Depends(deps.principal)):
        value = await service.billing_status(principal)
        return {"organization_id": principal.organization_id,
                "state": value["entitlement_state"], "externally_verified": value["externally_verified"],
                "source": value["source"]}

    return router
