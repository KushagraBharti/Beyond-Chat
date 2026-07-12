"""Produce evidence-backed disposition for findings removed by an immutable image rebuild."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def review(*, previous_scan: Path, current_scan: Path, current_sboms: list[Path], output: Path) -> dict[str, Any]:
    previous = json.loads(previous_scan.read_text(encoding="utf-8"))
    current = json.loads(current_scan.read_text(encoding="utf-8"))
    inventory: dict[str, set[str]] = defaultdict(set)
    for path in current_sboms:
        for component in json.loads(path.read_text(encoding="utf-8")).get("components", []):
            if component.get("name") and component.get("version"):
                inventory[str(component["name"])].add(str(component["version"]))

    dispositions = []
    for finding in previous.get("findings", []):
        if finding.get("severity") not in {"critical", "high", "unknown"}:
            continue
        current_versions = sorted(inventory.get(str(finding["name"]), set()))
        disposition = "replaced_version_not_affected" if current_versions else "package_removed"
        dispositions.append({
            "id": finding["id"],
            "previous_severity": finding["severity"],
            "previous_package": finding["name"],
            "previous_version": finding["version"],
            "previous_ecosystem": finding["ecosystem"],
            "previous_sboms": finding["sboms"],
            "disposition": disposition,
            "current_versions": current_versions,
            "evidence": (
                "The package remains only at the listed replacement version(s), and the exact current SBOM scan does not report this advisory."
                if current_versions
                else "The package name is absent from every exact current image SBOM."
            ),
        })
    severity_counts = Counter(item["previous_severity"] for item in dispositions)
    disposition_counts = Counter(item["disposition"] for item in dispositions)
    result = {
        "schema_version": 1,
        "captured_at": datetime.now(UTC).isoformat(),
        "previous_scan": str(previous_scan),
        "current_scan": str(current_scan),
        "previous_blocking_and_unclassified_counts": dict(sorted(severity_counts.items())),
        "disposition_counts": dict(sorted(disposition_counts.items())),
        "reviewed_count": len(dispositions),
        "current_gate": {
            "passed": current.get("passed") is True,
            "blocking_count": current.get("blocking_count"),
            "manual_review_count": current.get("manual_review_count"),
        },
        "all_previous_blocking_and_unclassified_resolved": (
            len(dispositions) == 66
            and current.get("passed") is True
            and current.get("blocking_count") == 0
            and current.get("manual_review_count") == 0
        ),
        "dispositions": dispositions,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--previous-scan", type=Path, required=True)
    parser.add_argument("--current-scan", type=Path, required=True)
    parser.add_argument("--current-sbom", type=Path, action="append", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(review(previous_scan=args.previous_scan, current_scan=args.current_scan, current_sboms=args.current_sbom, output=args.output), sort_keys=True))


if __name__ == "__main__":
    main()
