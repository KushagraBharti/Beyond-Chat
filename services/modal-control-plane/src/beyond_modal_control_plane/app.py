"""Deployed Modal App. Probe functions pin every release image to the App."""

from __future__ import annotations

import importlib.metadata

import modal

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
