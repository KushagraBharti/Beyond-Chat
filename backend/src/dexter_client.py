from __future__ import annotations

import asyncio
import json
import logging
import os
import subprocess
import sys
import threading
from pathlib import Path
from shutil import which
from typing import Any, Awaitable, Callable

import httpx

from .config import settings


BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEXTER_ROOT = BACKEND_ROOT / "dexter"
LOGGER = logging.getLogger("beyond_chat.dexter")


def _tail(value: str, limit: int = 4000) -> str:
    if len(value) <= limit:
        return value
    return value[-limit:]


def _describe_exception(exc: BaseException) -> str:
    message = str(exc).strip()
    exc_type = type(exc).__name__
    return message or f"{exc_type}: {exc!r}"


EventCallback = Callable[[dict[str, Any]], Awaitable[None]]


def _parse_json_line(line: str) -> dict[str, Any] | None:
    if not line.strip():
        return None
    try:
        payload = json.loads(line)
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _parse_json_lines(stdout: str, *, stderr: str = "", returncode: int | None = None, command: list[str] | None = None) -> dict[str, Any]:
    final: dict[str, Any] | None = None
    events: list[dict[str, Any]] = []

    for line in stdout.splitlines():
        if not line.strip():
            continue
        payload = _parse_json_line(line)
        if payload is None:
            continue
        if payload.get("type") == "event" and isinstance(payload.get("event"), dict):
            events.append(payload["event"])
        elif payload.get("type") in {"final", "error"}:
            final = payload

    if final is None:
        raise RuntimeError(
            "Dexter did not return a final JSON payload. "
            f"returncode={returncode} command={command!r} "
            f"stdout_tail={_tail(stdout)!r} stderr_tail={_tail(stderr)!r}"
        )
    if final.get("type") == "error":
        raise RuntimeError(str(final.get("error") or "Dexter failed."))
    final.setdefault("events", events)
    return final


async def _handle_runner_json_line(
    line: str,
    *,
    events: list[dict[str, Any]],
    on_event: EventCallback | None,
) -> dict[str, Any] | None:
    payload = _parse_json_line(line)
    if payload is None:
        return None
    if payload.get("type") == "event" and isinstance(payload.get("event"), dict):
        event = payload["event"]
        events.append(event)
        if on_event is not None:
            await on_event(event)
        return None
    if payload.get("type") in {"final", "error"}:
        return payload
    return None


async def _run_local_dexter(*, prompt: str, model: str, on_event: EventCallback | None = None) -> dict[str, Any]:
    if not DEXTER_ROOT.exists():
        raise RuntimeError(f"Dexter runtime is missing at {DEXTER_ROOT}.")

    node_command = which("node") or ("node.exe" if sys.platform.startswith("win") else "node")
    tsx_cli = DEXTER_ROOT / "node_modules" / "tsx" / "dist" / "cli.mjs"
    if not tsx_cli.exists():
        raise RuntimeError(f"Dexter tsx runtime is missing at {tsx_cli}. Run npm install in {DEXTER_ROOT}.")
    env = os.environ.copy()
    if settings.openrouter_api_key:
        env["OPENROUTER_API_KEY"] = settings.openrouter_api_key
    if settings.exasearch_api_key:
        env["EXASEARCH_API_KEY"] = settings.exasearch_api_key
    if settings.financial_datasets_api_key:
        env["FINANCIAL_DATASETS_API_KEY"] = settings.financial_datasets_api_key
    if settings.x_bearer_token:
        env["X_BEARER_TOKEN"] = settings.x_bearer_token
    env["OPENROUTER_HTTP_REFERER"] = settings.openrouter_http_referer
    env["OPENROUTER_APP_TITLE"] = settings.app_title
    env["OPENROUTER_DEFAULT_MODEL"] = settings.openrouter_default_model
    env["OPENROUTER_FAST_MODEL"] = settings.openrouter_fast_model

    env_status = {
        "OPENROUTER_API_KEY": bool(env.get("OPENROUTER_API_KEY")),
        "EXASEARCH_API_KEY": bool(env.get("EXASEARCH_API_KEY")),
        "FINANCIAL_DATASETS_API_KEY": bool(env.get("FINANCIAL_DATASETS_API_KEY")),
        "X_BEARER_TOKEN": bool(env.get("X_BEARER_TOKEN")),
    }
    LOGGER.info(
        "launching local dexter model=%s cwd=%s env=%s prompt_chars=%s",
        model,
        DEXTER_ROOT,
        env_status,
        len(prompt),
    )

    command_args = [
        node_command,
        str(tsx_cli),
        "src/run.ts",
        "--prompt",
        prompt,
        "--model",
        model,
        "--json",
    ]

    loop = asyncio.get_running_loop()

    def emit_event(event: dict[str, Any]) -> None:
        if on_event is None:
            return
        future = asyncio.run_coroutine_threadsafe(on_event(event), loop)
        future.result()

    def run_command() -> tuple[int, str, str]:
        process = subprocess.Popen(
            command_args,
            cwd=DEXTER_ROOT,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.DEVNULL,
            encoding="utf-8",
            errors="replace",
            text=True,
        )
        stdout_lines: list[str] = []
        stderr_lines: list[str] = []

        def read_stdout() -> None:
            if process.stdout is None:
                return
            for stdout_line in process.stdout:
                stdout_lines.append(stdout_line)
                payload = _parse_json_line(stdout_line)
                if payload and payload.get("type") == "event" and isinstance(payload.get("event"), dict):
                    emit_event(payload["event"])

        def read_stderr() -> None:
            if process.stderr is None:
                return
            for stderr_line in process.stderr:
                stderr_lines.append(stderr_line)

        stdout_thread = threading.Thread(target=read_stdout, daemon=True)
        stderr_thread = threading.Thread(target=read_stderr, daemon=True)
        stdout_thread.start()
        stderr_thread.start()

        try:
            returncode = process.wait(timeout=settings.dexter_runner_timeout_seconds)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
            raise
        finally:
            stdout_thread.join(timeout=2)
            stderr_thread.join(timeout=2)

        return returncode, "".join(stdout_lines), "".join(stderr_lines)

    try:
        returncode, stdout, stderr = await asyncio.to_thread(run_command)
    except subprocess.TimeoutExpired as exc:
        LOGGER.exception("local dexter timed out after %ss", settings.dexter_runner_timeout_seconds)
        raise RuntimeError(f"Local Dexter timed out after {settings.dexter_runner_timeout_seconds}s.") from exc
    except Exception as exc:
        LOGGER.exception("failed to launch local dexter command=%s cwd=%s", command_args, DEXTER_ROOT)
        raise RuntimeError(f"Failed to launch local Dexter: {_describe_exception(exc)}") from exc

    if returncode != 0:
        LOGGER.error(
            "local dexter exited with code=%s stderr_tail=%r stdout_tail=%r",
            returncode,
            _tail(stderr),
            _tail(stdout),
        )
        raise RuntimeError(
            f"Local Dexter exited with {returncode}. "
            f"stderr_tail={_tail(stderr)!r} stdout_tail={_tail(stdout)!r}"
        )

    result = _parse_json_lines(
        stdout,
        stderr=stderr,
        returncode=returncode,
        command=command_args,
    )
    LOGGER.info(
        "local dexter completed answer_chars=%s events=%s tool_calls=%s stderr_tail=%r",
        len(str(result.get("answer") or "")),
        len(result.get("events") or []),
        len(result.get("toolCalls") or []),
        _tail(stderr, 1000),
    )
    result["sandbox"] = {
        "provider": "local",
        "mode": "direct",
        "cwd": str(DEXTER_ROOT),
    }
    return result


async def run_dexter_finance(
    *,
    prompt: str,
    model: str,
    workspace_id: str,
    run_id: str,
    options: dict[str, Any],
    on_event: EventCallback | None = None,
) -> dict[str, Any]:
    if not settings.dexter_runner_url:
        return await _run_local_dexter(prompt=prompt, model=model, on_event=on_event)

    LOGGER.info("dispatching dexter to runner url=%s model=%s run_id=%s", settings.dexter_runner_url, model, run_id)
    headers = {"Content-Type": "application/json", "Accept": "application/x-ndjson"}
    if settings.dexter_runner_shared_secret:
        headers["Authorization"] = f"Bearer {settings.dexter_runner_shared_secret}"

    payload = {
        "prompt": prompt,
        "model": model,
        "workspaceId": workspace_id,
        "runId": run_id,
        "options": options,
    }

    timeout = httpx.Timeout(
        connect=10.0,
        write=30.0,
        read=settings.dexter_runner_timeout_seconds,
        pool=30.0,
    )
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", settings.dexter_runner_url, headers=headers, json=payload) as response:
            LOGGER.info("dexter runner responded status=%s run_id=%s", response.status_code, run_id)
            response.raise_for_status()
            content_type = response.headers.get("Content-Type", "")
            if "application/x-ndjson" not in content_type:
                body = await response.aread()
                data = json.loads(body.decode("utf-8", errors="replace") or "{}")
                result = data if isinstance(data, dict) else {}
                if on_event is not None:
                    for event in result.get("events", []):
                        if isinstance(event, dict):
                            await on_event(event)
                return result

            events: list[dict[str, Any]] = []
            final: dict[str, Any] | None = None
            async for line in response.aiter_lines():
                parsed_final = await _handle_runner_json_line(line, events=events, on_event=on_event)
                if parsed_final is not None:
                    final = parsed_final

            if final is None:
                raise RuntimeError("Dexter runner stream ended without a final payload.")
            if final.get("type") == "error":
                raise RuntimeError(str(final.get("error") or "Dexter runner failed."))
            final.setdefault("events", events)
            return final
