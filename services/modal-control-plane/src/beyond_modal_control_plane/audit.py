"""Aggregate Phase 4A evidence without overstating the full Phase 4 gate."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def _read(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def audit(fixtures: Path, rollout_path: Path, output: Path) -> dict[str, Any]:
    resources = _read(fixtures / "modal-resources.json")
    images = _read(fixtures / "modal-images.json")
    probes = _read(fixtures / "modal-image-probes.json")
    smoke = _read(fixtures / "modal-remote-smoke.json")
    provider = _read(fixtures / "modal-provider-state.json")
    security = _read(fixtures / "modal-osv-scan.json")
    rollout = _read(rollout_path)

    checks = {
        "provider_identity_and_bindings": provider.get("ready") is True,
        "fresh_scoped_volumes_exist": all(item.get("ok") is True for item in provider.get("volume_bindings", {}).values()),
        "immutable_images_published": all(item.get("ok") is True for item in provider.get("image_bindings", {}).values()),
        "deployed_image_probes": probes.get("all_passed") is True,
        "remote_lifecycle_and_output_smoke": smoke.get("all_passed") is True,
        "no_master_secret_in_sandbox": smoke.get("secrets_in_sandbox") is False,
        "memory_snapshots_not_used": smoke.get("memory_snapshots_used") is False,
        "durable_recovery_proven": all(
            smoke.get("results", {}).get(name, {}).get("ok") is True
            for name in ("durable_events", "checkpoint", "delete_restore_replay", "logical_volume_restore")
        ),
        "documents_finance_research_outputs": all(
            smoke.get("results", {}).get(name, {}).get("ok") is True
            for name in ("document", "finance", "research")
        ),
        "transient_sandboxes_cleaned": not provider.get("running_phase4_sandboxes"),
        "security_promotion_gate": security.get("passed") is True,
        "production_routing_remains_disabled": rollout.get("enabled") is False and rollout.get("traffic_percent") == 0,
        "legacy_runner_retained": rollout.get("legacy_runner", {}).get("state") == "retained",
    }
    provider_plane_checks = {key: value for key, value in checks.items() if key != "security_promotion_gate"}
    provider_plane_complete = all(provider_plane_checks.values())
    phase4_gate_satisfied = provider_plane_complete and checks["security_promotion_gate"] and rollout.get("enabled") is True

    result = {
        "schema_version": 1,
        "captured_at": datetime.now(UTC).isoformat(),
        "environment": provider.get("environment"),
        "app_id": provider.get("deployed_app", {}).get("app_id"),
        "release": probes.get("release"),
        "checks": checks,
        "provider_plane_complete": provider_plane_complete,
        "phase4_gate_satisfied": phase4_gate_satisfied,
        "status": "provider-plane-complete-rollout-blocked" if provider_plane_complete and not phase4_gate_satisfied else "incomplete",
        "security": {
            "passed": security.get("passed"),
            "blocking_count": security.get("blocking_count"),
            "manual_review_count": security.get("manual_review_count"),
            "severity_counts": security.get("severity_counts"),
        },
        "billing": provider.get("billing"),
        "remote_smoke": {
            "captured_at": smoke.get("captured_at"),
            "elapsed_seconds": smoke.get("elapsed_seconds"),
            "checkpoint_image_id": smoke.get("checkpoint_image_id"),
            "single_sandbox_cost_floor": smoke.get("single_sandbox_cost_floor"),
        },
        "resource_ids": {
            "images": {kind: item["object_id"] for kind, item in images["images"].items()},
            "volumes": {kind: item["object_id"] for kind, item in resources["volumes"].items()},
        },
        "phase4b_required": [
            "Resolve or explicitly risk-accept exact-image security findings, then produce a passing promotion scan.",
            "Wire the durable product coordinator and run identity issuer to ModalSandboxProvider.",
            "Replace deterministic fake model/tool probes with real policy-rechecked gateway traffic in controlled tests.",
            "Prove browser/API/worker failure injection, organization concurrency, actual usage finalization, and legacy Finance parity.",
            "Execute a controlled canary and rollback observation window before any legacy runner decommission."
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixtures", type=Path, required=True)
    parser.add_argument("--rollout", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = audit(args.fixtures, args.rollout, args.output)
    print(json.dumps({key: result[key] for key in ("captured_at", "status", "provider_plane_complete", "phase4_gate_satisfied", "security")}, sort_keys=True))
    if not result["provider_plane_complete"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
