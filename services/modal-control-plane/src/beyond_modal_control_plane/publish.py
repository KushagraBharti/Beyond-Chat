"""Build and publish the exact image release names used by the provider."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

import modal

from .app import app
from .config import ENVIRONMENT, IMAGE_NAMES
from .images import IMAGES


def publish(output: Path) -> dict[str, object]:
    published: dict[str, dict[str, str]] = {}
    with modal.enable_output(), app.run(environment_name=ENVIRONMENT, detach=True):
        for kind, image in IMAGES.items():
            built = image.build(app)
            built.publish(IMAGE_NAMES[kind], environment_name=ENVIRONMENT)
            published[kind] = {"name": IMAGE_NAMES[kind], "object_id": built.object_id}
    result = {
        "schema_version": 1,
        "captured_at": datetime.now(UTC).isoformat(),
        "environment": ENVIRONMENT,
        "images": published,
        "rollback": {
            "strategy": "deploy previous pinned image-name mapping; never delete an image referenced by a checkpoint",
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
    print(json.dumps(publish(args.output), sort_keys=True))


if __name__ == "__main__":
    main()
