"""List or terminate only Phase 4 smoke sandboxes in the Beyond Modal app."""

from __future__ import annotations

import argparse
import json
from typing import Any

import modal

from .config import APP_NAME, ENVIRONMENT

SMOKE_TAGS = {"product": "beyond-chat", "phase": "4", "smoke": "true"}


def cleanup(*, execute: bool) -> dict[str, Any]:
    app = modal.App.lookup(APP_NAME, environment_name=ENVIRONMENT, create_if_missing=False)
    candidates = list(modal.Sandbox.list(app_id=app.app_id, tags=SMOKE_TAGS))
    terminated: list[str] = []
    if execute:
        for sandbox in candidates:
            sandbox.terminate(wait=True)
            terminated.append(sandbox.object_id)
    return {
        "environment": ENVIRONMENT,
        "app": APP_NAME,
        "app_id": app.app_id,
        "filter": SMOKE_TAGS,
        "execute": execute,
        "candidate_ids": [sandbox.object_id for sandbox in candidates],
        "terminated_ids": terminated,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="Terminate exact-tag matches; default is dry-run.")
    args = parser.parse_args()
    print(json.dumps(cleanup(execute=args.execute), sort_keys=True))


if __name__ == "__main__":
    main()
