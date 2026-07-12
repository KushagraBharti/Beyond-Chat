from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ResourceCreate(StrictModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    configuration: dict[str, Any] = Field(default_factory=dict)
    team_id: str | None = Field(default=None, min_length=3, max_length=128)


class ResourcePatch(StrictModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    configuration: dict[str, Any] | None = None


class StateTransition(StrictModel):
    state: str = Field(min_length=2, max_length=64)
    reason: str | None = Field(default=None, max_length=2000)


class QueryRequest(StrictModel):
    query: str = Field(min_length=1, max_length=16000)
    source_ids: list[str] = Field(default_factory=list, max_length=100)
    limit: int = Field(default=10, ge=1, le=50)


class ModelMessage(StrictModel):
    role: Literal["system", "user", "assistant", "tool"]
    content: str = Field(min_length=1, max_length=100_000)


class ModelRunRequest(StrictModel):
    model: str = Field(min_length=3, max_length=200)
    messages: list[ModelMessage] = Field(min_length=1, max_length=100)
    max_completion_tokens: int = Field(ge=1, le=100_000)
    budget_cents: int = Field(ge=1, le=100_000)
    temperature: float | None = Field(default=None, ge=0, le=2)


class ActionRequest(StrictModel):
    tool_slug: str = Field(pattern=r"^[A-Z0-9_]+$", min_length=3, max_length=200)
    version: str = Field(min_length=3, max_length=100)
    arguments: dict[str, Any] = Field(default_factory=dict)
    approval_id: str | None = Field(default=None, min_length=3, max_length=128)


class MemoryProposal(StrictModel):
    content: str = Field(min_length=1, max_length=32000)
    sensitivity: Literal["normal", "sensitive"] = "normal"
    expires_at: str | None = None


class VersionCreate(StrictModel):
    content: dict[str, Any]
    parent_version_id: str | None = None
    change_summary: str | None = Field(default=None, max_length=2000)


class CommentCreate(StrictModel):
    body: str = Field(min_length=1, max_length=16000)
    anchor: dict[str, Any] | None = None


class ReviewCreate(StrictModel):
    reviewer_ids: list[str] = Field(min_length=1, max_length=100)
    instructions: str | None = Field(default=None, max_length=4000)


class AutomationCreate(ResourceCreate):
    agent_version_id: str = Field(min_length=3, max_length=128)
    trigger: dict[str, Any]
    max_cost_cents: int = Field(ge=0, le=10_000_000)
    max_actions: int = Field(ge=1, le=10_000)


class CapabilityApprovalClaim(StrictModel):
    approval_id: str = Field(min_length=3, max_length=128)
    tool_id: str = Field(pattern=r"^tool\.[a-z0-9._-]+$", max_length=200)
    argument_digest: str = Field(pattern=r"^sha256:[a-f0-9]{64}$")
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=255)


class CapabilityResolveRequest(StrictModel):
    schema_version: Literal["1.0"] = "1.0"
    agent_version_id: str = Field(min_length=3, max_length=128)
    selected_skill_version_ids: list[str] = Field(default_factory=list, max_length=100)
    selected_connection_ids: list[str] = Field(default_factory=list, max_length=100)
    selected_mcp_binding_ids: list[str] = Field(default_factory=list, max_length=100)
    approval_claims: list[CapabilityApprovalClaim] = Field(default_factory=list, max_length=100)
    current_calls: int = Field(default=0, ge=0, le=1_000_000)
    current_concurrency: int = Field(default=0, ge=0, le=100_000)
    current_cost_cents: int = Field(default=0, ge=0, le=1_000_000_000)
