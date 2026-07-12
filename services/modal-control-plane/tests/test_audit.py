from __future__ import annotations

import json
from pathlib import Path

import pytest

from beyond_modal_control_plane.audit import _release_fixtures


def test_release_fixtures_resolve_only_the_rollout_pinned_manifest(tmp_path: Path) -> None:
    active = tmp_path / "releases" / "2026-07-11.4"
    stale = tmp_path / "releases" / "2026-07-11.2"
    active.mkdir(parents=True)
    stale.mkdir(parents=True)
    (active / "modal-images.json").write_text(json.dumps({"release": "2026-07-11.4"}), encoding="utf-8")
    (stale / "modal-images.json").write_text(json.dumps({"release": "2026-07-11.2"}), encoding="utf-8")

    assert _release_fixtures(tmp_path, {"release": "2026-07-11.4"}) == active


@pytest.mark.parametrize("release", [None, "", "../2026-07-11.4", "2026-07-11"])
def test_release_fixtures_reject_invalid_rollout_release(tmp_path: Path, release: object) -> None:
    with pytest.raises(ValueError, match="missing or invalid"):
        _release_fixtures(tmp_path, {"release": release})


def test_release_fixtures_fail_when_pinned_manifest_is_missing(tmp_path: Path) -> None:
    (tmp_path / "modal-images.json").write_text(
        json.dumps({"release": "2026-07-11.2"}),
        encoding="utf-8",
    )
    with pytest.raises(FileNotFoundError, match="2026-07-11.4"):
        _release_fixtures(tmp_path, {"release": "2026-07-11.4"})
