from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


class ProviderCallError(RuntimeError):
    """A normalized provider failure safe to return without credential material."""

    def __init__(self, provider: str, code: str, *, retryable: bool = False) -> None:
        super().__init__(f"{provider}:{code}")
        self.provider = provider
        self.code = code
        self.retryable = retryable


@dataclass(frozen=True)
class ProviderScope:
    organization_id: str
    project_id: str
    profile_id: str


def require_object(value: Any, provider: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise ProviderCallError(provider, "invalid_response")
    return value
