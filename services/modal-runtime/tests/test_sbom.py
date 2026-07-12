from __future__ import annotations

from pathlib import Path

from beyond_modal_runtime.sbom import _os_release, _osv_ecosystem, _vendor_components


def test_os_release_maps_supported_distributions(tmp_path: Path) -> None:
    release = tmp_path / "os-release"
    release.write_text('ID="ubuntu"\nVERSION_ID="26.04"\n', encoding="utf-8")
    parsed = _os_release(release)
    assert _osv_ecosystem(parsed) == "Ubuntu:26.04:LTS"
    assert _osv_ecosystem({"ID": "debian", "VERSION_ID": "12"}) == "Debian:12"


def test_vendor_component_is_content_addressed(tmp_path: Path) -> None:
    (tmp_path / "VERSION").write_text("150.0.7871.114\n", encoding="utf-8")
    (tmp_path / "SHA256").write_text("a" * 64 + "\n", encoding="utf-8")
    (tmp_path / "SOURCE_URL").write_text("https://example.invalid/chrome.zip\n", encoding="utf-8")
    [component] = _vendor_components(tmp_path)
    assert component["version"] == "150.0.7871.114"
    assert component["hashes"][0]["content"] == "a" * 64
