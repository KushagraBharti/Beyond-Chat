"""Remote smoke matrix for the governed Modal execution plane."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import modal

from beyond_modal_runtime.capability import generate_keypair, issue_capability

from .config import APP_NAME, ENVIRONMENT, IMAGE_NAMES, RESOURCE_POLICY, VOLUME_NAMES
from .cost import estimate_sandbox_cost


def _exec(sandbox: modal.Sandbox, *argv: str, timeout: int = 120, env: dict[str, str] | None = None) -> tuple[int, str, str]:
    process = sandbox.exec(*argv, timeout=timeout, env=env or {}, text=True)
    stdout = process.stdout.read()
    stderr = process.stderr.read()
    process.wait()
    return process.returncode or 0, stdout, stderr


def _prepare_subpath(volume: modal.Volume, run_id: str) -> modal.Volume:
    marker = io.BytesIO(b"beyond-chat-runtime-v1\n")
    with volume.batch_upload(force=True) as upload:
        upload.put_file(marker, f"runs/{run_id}/.beyond-volume-marker")
    return volume.with_mount_options(sub_path=f"runs/{run_id}")


def _volumes(run_id: str) -> dict[str, modal.Volume]:
    workspaces = modal.Volume.from_name(VOLUME_NAMES["workspaces"], environment_name=ENVIRONMENT, create_if_missing=False)
    artifacts = modal.Volume.from_name(VOLUME_NAMES["artifacts"], environment_name=ENVIRONMENT, create_if_missing=False)
    cache = modal.Volume.from_name(VOLUME_NAMES["cache"], environment_name=ENVIRONMENT, create_if_missing=False)
    return {
        "/workspace": _prepare_subpath(workspaces, run_id),
        "/artifacts": _prepare_subpath(artifacts, run_id),
        "/cache": cache.with_mount_options(read_only=True),
    }


def _create(kind: str, run_id: str, public_key: str, *, timeout: int = 600) -> modal.Sandbox:
    app = modal.App.lookup(APP_NAME, environment_name=ENVIRONMENT, create_if_missing=False)
    image = modal.Image.from_name(IMAGE_NAMES[kind], environment_name=ENVIRONMENT)
    sandbox = modal.Sandbox.create(
        "python",
        "-m",
        "beyond_modal_runtime.sidecar",
        app=app,
        name=f"beyond-phase4-{kind}-{run_id[-12:]}",
        tags={"product": "beyond-chat", "phase": "4", "smoke": "true", "run_id": run_id, "image_kind": kind},
        image=image,
        env={
            "BEYOND_RUN_ID": run_id,
            "BEYOND_RUN_PUBLIC_KEY": public_key,
            "BEYOND_EVENT_LOG": "/workspace/.beyond/events.ndjson",
        },
        volumes=_volumes(run_id),
        cpu=RESOURCE_POLICY["cpu"],
        memory=RESOURCE_POLICY["memory_mb"],
        timeout=timeout,
        idle_timeout=RESOURCE_POLICY["idle_timeout_seconds"],
        workdir="/workspace",
        block_network=True,
        readiness_probe=modal.Probe.with_exec("python", "-m", "beyond_modal_runtime.healthcheck", interval_ms=500),
    )
    sandbox.wait_until_ready(timeout=120)
    return sandbox


def _sidecar(sandbox: modal.Sandbox, token: str, method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    script = """
import json, os, urllib.request
payload = json.loads(os.environ['BODY'])
request = urllib.request.Request('http://127.0.0.1:8765' + os.environ['PATH_INFO'], data=None if os.environ['METHOD']=='GET' else json.dumps(payload).encode(), method=os.environ['METHOD'], headers={'authorization':'Bearer '+os.environ['TOKEN'], 'content-type':'application/json'})
with urllib.request.urlopen(request, timeout=10) as response:
    print(response.read().decode())
"""
    code, stdout, stderr = _exec(
        sandbox,
        "python",
        "-c",
        script,
        env={"TOKEN": token, "METHOD": method, "PATH_INFO": path, "BODY": json.dumps(body or {})},
    )
    if code != 0:
        raise RuntimeError(f"sidecar call failed: {stderr[-500:]}")
    return json.loads(stdout)


def _capture_sbom(sandbox: modal.Sandbox, kind: str, output_directory: Path) -> dict[str, Any]:
    remote = f"/artifacts/sbom-{kind}.cdx.json"
    code, _, stderr = _exec(sandbox, "python", "-m", "beyond_modal_runtime.sbom", remote)
    if code != 0:
        raise RuntimeError(f"SBOM generation failed for {kind}: {stderr[-500:]}")
    encoded = sandbox.filesystem.read_bytes(remote)
    payload = json.loads(encoded)
    target = output_directory / f"sbom-{kind}.cdx.json"
    target.write_bytes(encoded)
    return {
        "ok": payload.get("bomFormat") == "CycloneDX" and len(payload.get("components", [])) > 0,
        "components": len(payload.get("components", [])),
        "digest": f"sha256:{hashlib.sha256(encoded).hexdigest()}",
        "path": str(target),
    }


def run_smoke(output: Path) -> dict[str, Any]:
    started = time.monotonic()
    stamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    results: dict[str, Any] = {}
    sandboxes: list[modal.Sandbox] = []
    private_key, public_key = generate_keypair()
    base_run = f"run_{uuid.uuid4().hex}"
    capability = issue_capability(
        private_key,
        run_id=base_run,
        organization_id=f"org_{uuid.uuid4().hex}",
        project_id=f"prj_{uuid.uuid4().hex}",
        actor_id=f"act_{uuid.uuid4().hex}",
        agent_version_id=f"agv_{uuid.uuid4().hex}",
        nonce=uuid.uuid4().hex,
        capabilities=["events:append", "events:read", "model:fake", "run:cancel", "tool:echo"],
        lifetime_seconds=900,
    )
    checkpoint_id = ""
    output.parent.mkdir(parents=True, exist_ok=True)
    try:
        base = _create("base", base_run, public_key)
        sandboxes.append(base)
        results["create"] = {"ok": True, "sandbox_id": base.object_id, "dashboard_url": base.get_dashboard_url()}
        results["sbom_base"] = _capture_sbom(base, "base", output.parent)
        code, stdout, _ = _exec(base, "python", "-c", "print('exec-ok')")
        results["exec"] = {"ok": code == 0 and stdout.strip() == "exec-ok"}
        inventory_code, inventory_out, inventory_err = _exec(
            base,
            "python",
            "-c",
            "import json,platform,shutil; print(json.dumps({'python':platform.python_version(),'curl':shutil.which('curl'),'perl':shutil.which('perl'),'system_python':shutil.which('python3.11'),'pip':shutil.which('pip'),'uv':shutil.which('uv')}))",
        )
        results["base_surface"] = {"ok": inventory_code == 0, "inventory": json.loads(inventory_out), "diagnostic": inventory_err[-500:]}
        results["tool"] = {"ok": _sidecar(base, capability, "POST", "/v1/tool/echo", {"hello": "modal"})["output"] == {"hello": "modal"}}
        results["model"] = {"ok": _sidecar(base, capability, "POST", "/v1/model/fake", {"prompt": "smoke"})["model"] == "deterministic-fake"}
        appended = _sidecar(base, capability, "POST", "/v1/events", {"type": "smoke.started", "stamp": stamp})
        replayed = _sidecar(base, capability, "GET", "/v1/events?after=0")
        results["durable_events"] = {"ok": appended["sequence"] >= 1 and len(replayed["events"]) >= 1, "sequence": appended["sequence"]}
        results["cancel"] = {"ok": _sidecar(base, capability, "POST", "/v1/cancel")["cancelled"] is True}
        try:
            timeout_code, _, _ = _exec(base, "python", "-c", "import time; time.sleep(10)", timeout=1)
            timed_out = timeout_code != 0
        except Exception as exc:
            timed_out = "timeout" in type(exc).__name__.lower() or "timeout" in str(exc).lower()
        results["timeout"] = {"ok": timed_out}
        snapshot = base.snapshot_filesystem(timeout=55, ttl=RESOURCE_POLICY["snapshot_ttl_seconds"])
        snapshot.hydrate()
        checkpoint_id = snapshot.object_id
        checkpoint_manifest = {
            "schema_version": 1,
            "run_id": base_run,
            "snapshot_image_id": checkpoint_id,
            "fallback_image": IMAGE_NAMES["base"],
            "workspace_volume": VOLUME_NAMES["workspaces"],
            "artifact_volume": VOLUME_NAMES["artifacts"],
            "event_sequence": appended["sequence"],
            "snapshot_kind": "filesystem",
            "memory_snapshot": False,
        }
        encoded_manifest = json.dumps(checkpoint_manifest, sort_keys=True, separators=(",", ":"))
        base.filesystem.write_text(encoded_manifest, "/artifacts/checkpoint-manifest.json")
        manifest_digest = f"sha256:{hashlib.sha256(encoded_manifest.encode()).hexdigest()}"
        results["checkpoint"] = {
            "ok": checkpoint_id.startswith("im-") and manifest_digest.startswith("sha256:"),
            "image_id": checkpoint_id,
            "kind": "filesystem",
            "memory_snapshot": False,
            "manifest_digest": manifest_digest,
            "logical_fallback": True,
        }
        base.terminate(wait=True)
        sandboxes.remove(base)

        restored = modal.Sandbox.create(
            "python", "-m", "beyond_modal_runtime.sidecar",
            app=modal.App.lookup(APP_NAME, environment_name=ENVIRONMENT, create_if_missing=False),
            name=f"beyond-phase4-restore-{base_run[-12:]}",
            tags={"product": "beyond-chat", "phase": "4", "smoke": "true", "restore": "true", "run_id": base_run},
            image=modal.Image.from_id(checkpoint_id),
            env={"BEYOND_RUN_ID": base_run, "BEYOND_RUN_PUBLIC_KEY": public_key, "BEYOND_EVENT_LOG": "/workspace/.beyond/events.ndjson"},
            volumes=_volumes(base_run),
            cpu=1, memory=1024, timeout=600, idle_timeout=300, workdir="/workspace", block_network=True,
            readiness_probe=modal.Probe.with_exec("python", "-m", "beyond_modal_runtime.healthcheck", interval_ms=500),
        )
        sandboxes.append(restored)
        restored.wait_until_ready(timeout=120)
        replayed_after_restore = _sidecar(restored, capability, "GET", "/v1/events?after=0")
        results["delete_restore_replay"] = {"ok": len(replayed_after_restore["events"]) >= 1, "sandbox_id": restored.object_id}
        restored.terminate(wait=True)
        sandboxes.remove(restored)

        logical = _create("base", base_run, public_key)
        sandboxes.append(logical)
        logical_replay = _sidecar(logical, capability, "GET", "/v1/events?after=0")
        logical_manifest = json.loads(logical.filesystem.read_text("/artifacts/checkpoint-manifest.json"))
        results["logical_volume_restore"] = {
            "ok": len(logical_replay["events"]) >= 1 and logical_manifest["snapshot_image_id"] == checkpoint_id,
            "uses_snapshot_image": False,
            "uses_memory_snapshot": False,
        }
        logical.terminate(wait=True)
        sandboxes.remove(logical)

        document_run = f"run_{uuid.uuid4().hex}"
        document = _create("documents", document_run, public_key)
        sandboxes.append(document)
        results["sbom_documents"] = _capture_sbom(document, "documents", output.parent)
        create_code, create_out, create_err = _exec(document, "python", "-m", "beyond_modal_runtime.jobs", "presentation", "/artifacts/generated.pptx", "--title", "Beyond Modal Smoke", "--bullet", "Generated in an isolated sandbox")
        edit_code, edit_out, edit_err = _exec(document, "python", "-m", "beyond_modal_runtime.jobs", "edit-presentation", "/artifacts/generated.pptx", "/artifacts/edited.pptx")
        render_code, render_out, render_err = _exec(document, "python", "-m", "beyond_modal_runtime.jobs", "render-presentation", "/artifacts/edited.pptx", "/artifacts/rendered", timeout=180)
        pptx_size = len(document.filesystem.read_bytes("/artifacts/edited.pptx"))
        pdf_size = len(document.filesystem.read_bytes("/artifacts/rendered/edited.pdf"))
        results["document"] = {
            "ok": create_code == edit_code == render_code == 0 and pptx_size > 0 and pdf_size > 0,
            "pptx_bytes": pptx_size,
            "pdf_bytes": pdf_size,
            "diagnostic": (create_err + edit_err + render_err)[-500:],
            "outputs": [json.loads(create_out), json.loads(edit_out), json.loads(render_out)],
        }
        doc_surface_code, doc_surface_out, doc_surface_err = _exec(
            document,
            "python",
            "-c",
            "import json,shutil,subprocess; print(json.dumps({'libreoffice':subprocess.check_output(['libreoffice','--version'],text=True).strip(),'pandoc':subprocess.check_output(['pandoc','--version'],text=True).splitlines()[0],'perl':shutil.which('perl'),'system_python':shutil.which('python3.11'),'curl':shutil.which('curl')}))",
        )
        results["document_surface"] = {"ok": doc_surface_code == 0, "inventory": json.loads(doc_surface_out), "diagnostic": doc_surface_err[-500:]}
        document.terminate(wait=True)
        sandboxes.remove(document)

        finance_run = f"run_{uuid.uuid4().hex}"
        finance = _create("data-finance", finance_run, public_key)
        sandboxes.append(finance)
        results["sbom_data_finance"] = _capture_sbom(finance, "data-finance", output.parent)
        finance.filesystem.write_text("name,amount\na,10\nb,20\n", "/workspace/amounts.csv")
        finance_code, finance_out, finance_err = _exec(finance, "python", "-m", "beyond_modal_runtime.jobs", "finance-summary", "/workspace/amounts.csv", "/artifacts/finance.json")
        finance_payload = json.loads(finance.filesystem.read_text("/artifacts/finance.json"))
        results["finance"] = {"ok": finance_code == 0 and finance_payload["sum"] == 30, "output": json.loads(finance_out), "diagnostic": finance_err[-500:]}
        data_import_code, data_import_out, data_import_err = _exec(
            finance,
            "python",
            "-c",
            "import duckdb,matplotlib,numpy,openpyxl,pandas,polars,pyarrow,xlsxwriter; print('data-pack-ok')",
        )
        results["data_finance_surface"] = {"ok": data_import_code == 0 and data_import_out.strip() == "data-pack-ok", "diagnostic": data_import_err[-500:]}
        finance.terminate(wait=True)
        sandboxes.remove(finance)

        research_run = f"run_{uuid.uuid4().hex}"
        research = _create("research", research_run, public_key)
        sandboxes.append(research)
        results["sbom_research"] = _capture_sbom(research, "research", output.parent)
        research_code, research_out, research_err = _exec(
            research,
            "python",
            "-c",
            "import bs4,httpx,lxml,playwright,pypdf; print('research-ok')",
        )
        chromium_code, chromium_out, chromium_err = _exec(research, "chromium", "--version")
        browser_code, browser_out, browser_err = _exec(
            research,
            "chromium",
            "--headless=new",
            "--no-sandbox",
            "--disable-gpu",
            "--dump-dom",
            "data:text/html,<title>beyond-smoke</title><main>ok</main>",
            timeout=60,
        )
        vendor_code, vendor_out, vendor_err = _exec(
            research,
            "python",
            "-c",
            "import json,pathlib; root=pathlib.Path('/opt/chrome-for-testing'); print(json.dumps({name:(root/name).read_text().strip() for name in ['VERSION','SHA256','SOURCE_URL']}))",
        )
        results["research"] = {
            "ok": research_code == 0 and research_out.strip() == "research-ok" and chromium_code == 0 and "150.0.7871.114" in chromium_out and browser_code == 0 and "<main>ok</main>" in browser_out and vendor_code == 0,
            "chromium": chromium_out.strip(),
            "vendor": json.loads(vendor_out),
            "diagnostic": (research_err + chromium_err + browser_err + vendor_err)[-5000:],
        }
        research.terminate(wait=True)
        sandboxes.remove(research)
    finally:
        for sandbox in sandboxes:
            try:
                sandbox.terminate(wait=True)
            except Exception:
                pass
    elapsed = time.monotonic() - started
    estimate = estimate_sandbox_cost(1, 1024, elapsed)
    result = {
        "schema_version": 1,
        "captured_at": datetime.now(UTC).isoformat(),
        "environment": ENVIRONMENT,
        "app": APP_NAME,
        "results": results,
        "all_passed": bool(results) and all(item.get("ok") is True for item in results.values()),
        "elapsed_seconds": round(elapsed, 3),
        "single_sandbox_cost_floor": estimate.to_dict(),
        "checkpoint_image_id": checkpoint_id,
        "cleanup": "all tagged transient smoke sandboxes terminated",
        "secrets_in_sandbox": False,
        "memory_snapshots_used": False,
    }
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if not result["all_passed"]:
        raise RuntimeError("one or more remote smoke checks failed")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(run_smoke(args.output), sort_keys=True))


if __name__ == "__main__":
    main()
