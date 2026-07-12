from __future__ import annotations

import json
from pathlib import Path

from beyond_modal_control_plane.remediation_review import review


def test_review_classifies_removed_and_replaced_findings(tmp_path: Path) -> None:
    previous = tmp_path / "previous.json"
    current = tmp_path / "current.json"
    sbom = tmp_path / "sbom.json"
    output = tmp_path / "review.json"
    previous.write_text(json.dumps({"findings": [
        {"id": "CVE-1", "severity": "critical", "name": "gone", "version": "1", "ecosystem": "Debian:12", "sboms": ["base"]},
        {"id": "CVE-2", "severity": "unknown", "name": "kept", "version": "1", "ecosystem": "Debian:12", "sboms": ["base"]},
    ]}), encoding="utf-8")
    current.write_text(json.dumps({"passed": True, "blocking_count": 0, "manual_review_count": 0}), encoding="utf-8")
    sbom.write_text(json.dumps({"components": [{"name": "kept", "version": "2"}]}), encoding="utf-8")
    result = review(previous_scan=previous, current_scan=current, current_sboms=[sbom], output=output)
    assert [item["disposition"] for item in result["dispositions"]] == ["package_removed", "replaced_version_not_affected"]
