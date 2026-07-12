"""Verify vendor-managed runtime components against primary release metadata."""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

CHROME_RELEASES = "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json"


def scan(sbom: Path, output: Path) -> dict[str, Any]:
    payload = json.loads(sbom.read_text(encoding="utf-8"))
    components = [item for item in payload.get("components", []) if item.get("name") == "chrome-for-testing"]
    if len(components) != 1:
        raise RuntimeError(f"expected exactly one chrome-for-testing component; found {len(components)}")
    component = components[0]
    request = urllib.request.Request(CHROME_RELEASES, headers={"user-agent": "beyond-chat-phase4-vendor-scan/1"})
    with urllib.request.urlopen(request, timeout=30) as response:  # noqa: S310 - fixed official Google endpoint
        releases = json.loads(response.read())
    stable = releases["channels"]["Stable"]
    linux_downloads = [item["url"] for item in stable["downloads"]["chrome"] if item["platform"] == "linux64"]
    distribution_urls = [item["url"] for item in component.get("externalReferences", []) if item.get("type") == "distribution"]
    digests = [item["content"] for item in component.get("hashes", []) if item.get("alg") == "SHA-256"]
    checks = {
        "exact_latest_stable_version": component.get("version") == stable["version"],
        "official_linux_distribution_url": len(distribution_urls) == 1 and distribution_urls[0] in linux_downloads,
        "download_sha256_recorded": len(digests) == 1 and re.fullmatch(r"[0-9a-f]{64}", digests[0]) is not None,
    }
    result = {
        "schema_version": 1,
        "captured_at": datetime.now(UTC).isoformat(),
        "source": CHROME_RELEASES,
        "component": {
            "name": component["name"],
            "installed_version": component["version"],
            "latest_stable_version": stable["version"],
            "distribution_url": distribution_urls[0] if distribution_urls else None,
            "download_sha256": digests[0] if digests else None,
        },
        "checks": checks,
        "passed": all(checks.values()),
        "limitations": [
            "Chrome for Testing publishes current channel/download metadata but no checksum in this feed; the captured SHA-256 identifies the downloaded artifact rather than proving a vendor signature.",
            "Version currency is point-in-time evidence and must be regenerated before promotion.",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sbom", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = scan(args.sbom, args.output)
    print(json.dumps(result, sort_keys=True))
    if not result["passed"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
