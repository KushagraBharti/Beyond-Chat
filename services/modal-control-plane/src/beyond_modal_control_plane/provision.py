"""Idempotently provision only fresh Beyond-prefixed durable Modal resources."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

import modal

from .config import ENVIRONMENT, VOLUME_NAMES


def provision(output: Path) -> dict[str, object]:
    volumes: dict[str, dict[str, str]] = {}
    for purpose, name in VOLUME_NAMES.items():
        if not name.startswith("beyond-chat-runtime-"):
            raise RuntimeError(f"refusing non-Beyond resource name: {name}")
        volume = modal.Volume.from_name(name, environment_name=ENVIRONMENT, create_if_missing=True)
        volume.hydrate()
        info = volume.info()
        volumes[purpose] = {
            "name": name,
            "object_id": volume.object_id,
            "dashboard_url": volume.get_dashboard_url(),
            "created_at": info.created_at.isoformat() if info.created_at else "unknown",
        }
    result = {
        "schema_version": 1,
        "captured_at": datetime.now(UTC).isoformat(),
        "environment": ENVIRONMENT,
        "volumes": volumes,
        "rollback": {
            "precondition": "all Beyond runtime sandboxes terminated and artifacts exported",
            "commands": [f"modal volume delete --env {ENVIRONMENT} {name}" for name in VOLUME_NAMES.values()],
            "automatic": False,
        },
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(provision(args.output), sort_keys=True))


if __name__ == "__main__":
    main()
