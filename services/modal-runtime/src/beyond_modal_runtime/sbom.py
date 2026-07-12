"""Emit deterministic CycloneDX inventory for the exact runtime filesystem."""

from __future__ import annotations

import argparse
import importlib.metadata
import json
import os
import shutil
import subprocess
import urllib.parse
from collections import defaultdict
from pathlib import Path
from typing import Any


def _os_release(path: Path = Path("/etc/os-release")) -> dict[str, str]:
    if not path.exists():
        return {}
    result: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        result[key] = value.strip().strip('"')
    return result


def _osv_ecosystem(release: dict[str, str]) -> str | None:
    identifier = release.get("ID", "").lower()
    version = release.get("VERSION_ID")
    if identifier == "ubuntu" and version:
        return f"Ubuntu:{version}:LTS" if version.endswith(".04") else f"Ubuntu:{version}"
    if identifier == "debian" and version:
        return f"Debian:{version.split('.', 1)[0]}"
    return None


def _python_components() -> list[dict[str, Any]]:
    components = []
    for distribution in importlib.metadata.distributions():
        name = distribution.metadata.get("Name")
        if not name:
            continue
        components.append(
            {
                "type": "library",
                "name": name,
                "version": distribution.version,
                "purl": f"pkg:pypi/{name.lower()}@{distribution.version}",
                "properties": [{"name": "beyond:ecosystem", "value": "PyPI"}],
            }
        )
    return components


def _dpkg_components(ecosystem: str | None) -> list[dict[str, Any]]:
    if ecosystem is None or shutil.which("dpkg-query") is None:
        return []
    query = subprocess.run(
        ["dpkg-query", "-W", "-f=${binary:Package}\t${source:Package}\t${Version}\n"],
        check=True,
        capture_output=True,
        text=True,
    )
    grouped: dict[tuple[str, str], set[str]] = defaultdict(set)
    for line in query.stdout.splitlines():
        binary, source, version = line.split("\t", 2)
        binary = binary.split(":", 1)[0]
        source = (source or binary).split(" ", 1)[0]
        grouped[(source, version)].add(binary)

    distribution = "ubuntu" if ecosystem.startswith("Ubuntu:") else "debian"
    components = []
    for (source, version), binaries in grouped.items():
        components.append(
            {
                "type": "library",
                "name": source,
                "version": version,
                "purl": f"pkg:deb/{distribution}/{source}@{urllib.parse.quote(version, safe='')}",
                "properties": [
                    {"name": "beyond:ecosystem", "value": ecosystem},
                    {"name": "beyond:binary-packages", "value": ",".join(sorted(binaries))},
                ],
            }
        )
    return components


def _vendor_components(root: Path = Path("/opt/chrome-for-testing")) -> list[dict[str, Any]]:
    version_path = root / "VERSION"
    digest_path = root / "SHA256"
    source_path = root / "SOURCE_URL"
    if not (version_path.exists() and digest_path.exists() and source_path.exists()):
        return []
    version = version_path.read_text(encoding="utf-8").strip()
    digest = digest_path.read_text(encoding="utf-8").strip()
    source = source_path.read_text(encoding="utf-8").strip()
    return [
        {
            "type": "application",
            "name": "chrome-for-testing",
            "version": version,
            "purl": f"pkg:generic/chrome-for-testing@{version}",
            "hashes": [{"alg": "SHA-256", "content": digest}],
            "externalReferences": [{"type": "distribution", "url": source}],
            "properties": [{"name": "beyond:vendor-review", "value": "chrome-for-testing-stable"}],
        }
    ]


def generate() -> dict[str, object]:
    release = _os_release()
    ecosystem = _osv_ecosystem(release)
    components = _python_components() + _dpkg_components(ecosystem) + _vendor_components()
    components.sort(key=lambda item: (str(item.get("purl", "")), str(item["name"]).lower(), str(item["version"])))
    return {
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "version": 1,
        "metadata": {
            "component": {"type": "container", "name": "beyond-chat-runtime"},
            "properties": [
                {"name": "beyond:os-id", "value": release.get("ID", os.name)},
                {"name": "beyond:os-version", "value": release.get("VERSION_ID", "unknown")},
                {"name": "beyond:osv-ecosystem", "value": ecosystem or "unsupported"},
            ],
        },
        "components": components,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(generate(), sort_keys=True, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()
