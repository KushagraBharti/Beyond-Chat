"""Capture identities from the already-deployed immutable image probes."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import modal

from .config import APP_NAME, ENVIRONMENT, IMAGE_RELEASE

PROBES = {
    "base": "image-probe-base",
    "documents": "image-probe-documents",
    "research": "image-probe-research",
    "data-finance": "image-probe-data-finance",
}


def capture(output: Path) -> dict[str, Any]:
    """Invoke probes sequentially to stay below Modal app-creation rate limits."""

    probes: dict[str, dict[str, str]] = {}
    for kind, function_name in PROBES.items():
        function = modal.Function.from_name(
            APP_NAME,
            function_name,
            environment_name=ENVIRONMENT,
        )
        identity = function.remote()
        expected = {
            "app": APP_NAME,
            "image_kind": kind,
            "release": IMAGE_RELEASE,
        }
        probes[kind] = {
            **identity,
            "ok": all(identity.get(key) == value for key, value in expected.items()),
        }

    result = {
        "schema_version": 1,
        "captured_at": datetime.now(UTC).isoformat(),
        "environment": ENVIRONMENT,
        "app": APP_NAME,
        "release": IMAGE_RELEASE,
        "probes": probes,
        "all_passed": all(item["ok"] is True for item in probes.values()),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = capture(args.output)
    print(json.dumps(result, sort_keys=True))
    if not result["all_passed"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
