"""Immutable names and policy defaults for the Beyond production Modal plane."""

from __future__ import annotations

APP_NAME = "beyond-chat-runtime"
ENVIRONMENT = "beyond-chat-production"
IMAGE_RELEASE = "2026-07-11.4"
IMAGE_NAMES = {
    "base": f"beyond-chat-runtime-base:{IMAGE_RELEASE}",
    "documents": f"beyond-chat-runtime-documents:{IMAGE_RELEASE}",
    "research": f"beyond-chat-runtime-research:{IMAGE_RELEASE}",
    "data-finance": f"beyond-chat-runtime-data-finance:{IMAGE_RELEASE}",
}
VOLUME_NAMES = {
    "cache": "beyond-chat-runtime-cache-v1",
    "workspaces": "beyond-chat-runtime-workspaces-v1",
    "artifacts": "beyond-chat-runtime-artifacts-v1",
}
RESOURCE_POLICY = {
    "cpu": 1.0,
    "memory_mb": 1024,
    "timeout_seconds": 900,
    "idle_timeout_seconds": 300,
    "snapshot_ttl_seconds": 30 * 24 * 60 * 60,
    "max_concurrent_smoke_sandboxes": 1,
}
MODAL_PRICES = {
    "cpu_core_second_usd": 0.00003942,
    "memory_gib_second_usd": 0.00000672,
}
