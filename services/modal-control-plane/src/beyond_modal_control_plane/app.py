"""Deployed Modal App. Probe functions pin every release image to the App."""

from __future__ import annotations

import importlib.metadata
import json
import os
import subprocess

import modal
from fastapi import Header, HTTPException

from .config import APP_NAME, IMAGE_RELEASE
from .images import IMAGES

app = modal.App(APP_NAME)


def _identity(kind: str) -> dict[str, str]:
    return {
        "app": APP_NAME,
        "image_kind": kind,
        "release": IMAGE_RELEASE,
        "runtime": importlib.metadata.version("cryptography"),
    }


@app.function(image=IMAGES["base"], cpu=0.25, memory=128, timeout=30, max_containers=1, block_network=True, name="image-probe-base")
def image_probe_base() -> dict[str, str]:
    return _identity("base")


@app.function(image=IMAGES["documents"], cpu=0.25, memory=128, timeout=30, max_containers=1, block_network=True, name="image-probe-documents")
def image_probe_documents() -> dict[str, str]:
    return _identity("documents")


@app.function(image=IMAGES["research"], cpu=0.25, memory=128, timeout=30, max_containers=1, block_network=True, name="image-probe-research")
def image_probe_research() -> dict[str, str]:
    return _identity("research")


@app.function(image=IMAGES["data-finance"], cpu=0.25, memory=128, timeout=30, max_containers=1, block_network=True, name="image-probe-data-finance")
def image_probe_data_finance() -> dict[str, str]:
    return _identity("data-finance")


def _run_general_agent(payload: dict[str, object]) -> dict[str, object]:
    prompt = str(payload.get("prompt", "")).strip()
    if not prompt:
        raise ValueError("prompt is required")
    completed = subprocess.run(
        ["node", "--experimental-strip-types", "/opt/beyond/packages/pi-runtime-adapter/pi_runner.ts"],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        timeout=840,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(f"Pi agent execution failed: {completed.stderr[-2000:]}")
    result = json.loads(completed.stdout)
    if not isinstance(result, dict) or not str(result.get("text", "")).strip():
        raise RuntimeError("Pi agent returned no output")
    return result


@app.function(
    image=IMAGES["pi-agent"],
    secrets=[modal.Secret.from_name("beyond-chat-runtime")],
    cpu=1,
    memory=1024,
    timeout=900,
    name="general-agent",
)
def general_agent(payload: dict[str, object]) -> dict[str, object]:
    return _run_general_agent(payload)


@app.function(
    image=IMAGES["pi-agent"],
    secrets=[modal.Secret.from_name("beyond-chat-runtime")],
    cpu=1,
    memory=1024,
    timeout=900,
    name="general-agent-api",
)
@modal.fastapi_endpoint(method="POST")
def general_agent_api(
    payload: dict[str, object],
    authorization: str | None = Header(default=None),
) -> dict[str, object]:
    expected = os.environ.get("MODAL_RUNTIME_SHARED_SECRET", "")
    if not expected or authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Authentication required")
    return _run_general_agent(payload)
