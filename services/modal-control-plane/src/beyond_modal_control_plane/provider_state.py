"""Capture authoritative Modal CLI/SDK identity and binding evidence."""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import modal

from .config import APP_NAME, ENVIRONMENT, IMAGE_NAMES, VOLUME_NAMES

EXPECTED_PROFILE = "kushagrabharti"


def _cli(*arguments: str) -> Any:
    completed = subprocess.run(  # noqa: S603 - fixed arguments to the pinned Modal CLI
        ["modal", *arguments],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(completed.stdout)


def _profile() -> str:
    completed = subprocess.run(  # noqa: S603 - fixed arguments to the pinned Modal CLI
        ["modal", "profile", "current"],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return completed.stdout.strip()


def _running_sandboxes(app_id: str) -> list[dict[str, Any]]:
    sandboxes = []
    for sandbox in modal.Sandbox.list(app_id=app_id, tags={"product": "beyond-chat", "phase": "4"}):
        sandboxes.append(
            {
                "object_id": sandbox.object_id,
                "name": getattr(sandbox, "name", None),
                "tags": getattr(sandbox, "tags", None),
            }
        )
    return sandboxes


def capture(output: Path, images_fixture: Path, rollout_fixture: Path) -> dict[str, Any]:
    profile = _profile()
    apps = _cli("app", "list", "--env", ENVIRONMENT, "--json")
    image_names = _cli("image", "names", "list", "--env", ENVIRONMENT, "--json")
    volumes = _cli("volume", "list", "--env", ENVIRONMENT, "--json")
    billing = _cli(
        "environment",
        "billing",
        "report",
        ENVIRONMENT,
        "--for",
        "today",
        "--resolution",
        "h",
        "--show-resources",
        "--json",
    )
    deployed_apps = [item for item in apps if item["description"] == APP_NAME and item["state"] == "deployed"]
    if len(deployed_apps) != 1:
        raise RuntimeError(f"expected exactly one deployed {APP_NAME!r} app; found {len(deployed_apps)}")
    deployed_app = deployed_apps[0]
    running_sandboxes = _running_sandboxes(deployed_app["app_id"])

    expected_images = json.loads(images_fixture.read_text(encoding="utf-8"))["images"]
    rollout = json.loads(rollout_fixture.read_text(encoding="utf-8"))
    expected_app_id = rollout["app"]["object_id"]
    published_by_tag = {item["tag"]: item["image_id"] for item in image_names}
    image_bindings = {
        kind: {
            "name": rollout["images"][kind]["name"],
            "expected_object_id": rollout["images"][kind]["object_id"],
            "actual_object_id": published_by_tag.get(rollout["images"][kind]["name"]),
            "release_fixture_object_id": expected_images[kind]["object_id"],
            "ok": (
                published_by_tag.get(rollout["images"][kind]["name"])
                == rollout["images"][kind]["object_id"]
                == expected_images[kind]["object_id"]
            ),
        }
        for kind in IMAGE_NAMES
    }
    volume_names = {item["name"] for item in volumes}
    volume_ids_by_name: dict[str, str] = {}
    for name in VOLUME_NAMES.values():
        volume = modal.Volume.from_name(name, environment_name=ENVIRONMENT, create_if_missing=False)
        volume.hydrate()
        volume_ids_by_name[name] = volume.object_id
    volume_bindings = {
        kind: {
            "name": name,
            "expected_object_id": rollout["volumes"][kind]["object_id"],
            "actual_object_id": volume_ids_by_name.get(name),
            "ok": volume_ids_by_name.get(name) == rollout["volumes"][kind]["object_id"],
        }
        for kind, name in VOLUME_NAMES.items()
    }
    app_billing = [item for item in billing if item["object_id"] == deployed_app["app_id"]]
    billed_by_resource: dict[str, Decimal] = {}
    for item in app_billing:
        billed_by_resource[item["resource"]] = billed_by_resource.get(item["resource"], Decimal(0)) + Decimal(item["cost"])
    billing_summary = {
        "currency": "USD",
        "by_resource": {key: str(value) for key, value in sorted(billed_by_resource.items())},
        "total": str(sum(billed_by_resource.values(), Decimal(0))),
        "scope": "current UTC provider day; build, probe, and smoke activity for the deployed app",
    }
    result = {
        "schema_version": 1,
        "captured_at": datetime.now(UTC).isoformat(),
        "profile": profile,
        "environment": ENVIRONMENT,
        "deployed_app": deployed_app,
        "app_binding": {
            "name": APP_NAME,
            "expected_object_id": expected_app_id,
            "actual_object_id": deployed_app["app_id"],
            "ok": deployed_app["app_id"] == expected_app_id,
        },
        "image_bindings": image_bindings,
        "volume_bindings": volume_bindings,
        "running_phase4_sandboxes": running_sandboxes,
        "legacy_volumes_observed_but_not_mutated": sorted(
            name for name in volume_names if name in {"beyond-chat-runtime-cache", "beyond-chat-workspaces", "beyond-chat-artifacts"}
        ),
        "billing": billing_summary,
        "ready": (
            profile == EXPECTED_PROFILE
            and deployed_app["app_id"] == expected_app_id
            and all(item["ok"] for item in image_bindings.values())
            and all(item["ok"] for item in volume_bindings.values())
            and not running_sandboxes
        ),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--images-fixture", type=Path, required=True)
    parser.add_argument("--rollout-fixture", type=Path, required=True)
    args = parser.parse_args()
    result = capture(args.output, args.images_fixture, args.rollout_fixture)
    summary = {
        "captured_at": result["captured_at"],
        "profile": result["profile"],
        "environment": result["environment"],
        "app_id": result["deployed_app"]["app_id"],
        "billing": result["billing"],
        "running_phase4_sandboxes": len(result["running_phase4_sandboxes"]),
        "ready": result["ready"],
    }
    print(json.dumps(summary, sort_keys=True))
    if not result["ready"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
