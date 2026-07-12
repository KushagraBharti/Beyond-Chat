from __future__ import annotations

import pytest

from beyond_modal_control_plane.config import IMAGE_NAMES, IMAGE_RELEASE, VOLUME_NAMES
from beyond_modal_control_plane.cost import estimate_sandbox_cost


def test_resource_names_are_scoped_and_images_are_pinned() -> None:
    assert all(name.startswith("beyond-chat-runtime-") for name in VOLUME_NAMES.values())
    assert all(name.startswith("beyond-chat-runtime-") and f":{IMAGE_RELEASE}" in name for name in IMAGE_NAMES.values())


def test_cost_estimate_uses_cpu_and_memory_seconds() -> None:
    estimate = estimate_sandbox_cost(1, 1024, 60)
    assert estimate.cpu_cost_usd == pytest.approx(0.0023652)
    assert estimate.memory_cost_usd == pytest.approx(0.0004032)
    assert estimate.total_cost_usd == pytest.approx(0.0027684)


def test_invalid_cost_input_is_rejected() -> None:
    with pytest.raises(ValueError):
        estimate_sandbox_cost(0, 1024, 60)
