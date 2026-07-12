"""Private sandbox sidecar: readiness, durable event replay, and gateway boundary."""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import signal
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from .capability import CapabilityError, verify_capability

LOGGER = logging.getLogger("beyond_modal_runtime.sidecar")
FORBIDDEN_CREDENTIALS = {
    "COMPOSIO_API_KEY",
    "MODAL_TOKEN_ID",
    "MODAL_TOKEN_SECRET",
    "OPENROUTER_API_KEY",
    "STRIPE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "WORKOS_API_KEY",
}


class DurableEventLog:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def append(self, event: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            events = self.replay(0)
            sequence = len(events) + 1
            envelope = {
                "sequence": sequence,
                "occurred_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "event": event,
            }
            encoded = (json.dumps(envelope, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
            with self.path.open("ab", buffering=0) as stream:
                stream.write(encoded)
                os.fsync(stream.fileno())
            return envelope

    def replay(self, after: int) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []
        entries: list[dict[str, Any]] = []
        with self.path.open("r", encoding="utf-8") as stream:
            for line in stream:
                if line.strip():
                    value = json.loads(line)
                    if value["sequence"] > after:
                        entries.append(value)
        return entries


class RuntimeServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], handler: type[BaseHTTPRequestHandler], *, run_id: str, public_key: str, event_log: DurableEventLog) -> None:
        super().__init__(address, handler)
        self.run_id = run_id
        self.public_key = public_key
        self.event_log = event_log
        self.cancelled = threading.Event()


class RuntimeHandler(BaseHTTPRequestHandler):
    server: RuntimeServer

    def log_message(self, format_string: str, *args: object) -> None:
        LOGGER.info("request method=%s path=%s status=%s", self.command, self.path.split("?", 1)[0], args[1] if len(args) > 1 else "unknown")

    def _json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(encoded)))
        self.send_header("cache-control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def _body(self) -> dict[str, Any]:
        length = int(self.headers.get("content-length", "0"))
        if length > 1_048_576:
            raise ValueError("request body exceeds 1 MiB")
        value = json.loads(self.rfile.read(length) or b"{}")
        if not isinstance(value, dict):
            raise ValueError("request body must be an object")
        return value

    def _authorize(self, capability: str) -> None:
        authorization = self.headers.get("authorization", "")
        if not authorization.startswith("Bearer "):
            raise CapabilityError("bearer capability required")
        verify_capability(
            authorization.removeprefix("Bearer "),
            self.server.public_key,
            expected_run_id=self.server.run_id,
            required_capability=capability,
        )

    def do_GET(self) -> None:  # noqa: N802
        try:
            route, _, query = self.path.partition("?")
            if route == "/readyz":
                self._json(HTTPStatus.OK, {"ready": True, "run_id": self.server.run_id, "credential_policy": "ephemeral-capability-only"})
                return
            if route == "/v1/events":
                self._authorize("events:read")
                after = int(dict(part.split("=", 1) for part in query.split("&") if "=" in part).get("after", "0"))
                self._json(HTTPStatus.OK, {"events": self.server.event_log.replay(after)})
                return
            self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
        except CapabilityError as exc:
            self._json(HTTPStatus.UNAUTHORIZED, {"error": "authorization_denied", "message": str(exc)})
        except (ValueError, json.JSONDecodeError) as exc:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "invalid_request", "message": str(exc)})

    def do_POST(self) -> None:  # noqa: N802
        try:
            if self.path == "/v1/events":
                self._authorize("events:append")
                self._json(HTTPStatus.CREATED, self.server.event_log.append(self._body()))
                return
            if self.path == "/v1/tool/echo":
                self._authorize("tool:echo")
                body = self._body()
                self._json(HTTPStatus.OK, {"output": body, "digest": f"sha256:{hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()}"})
                return
            if self.path == "/v1/model/fake":
                self._authorize("model:fake")
                body = self._body()
                self._json(HTTPStatus.OK, {"model": "deterministic-fake", "text": f"completed:{body.get('prompt', '')}", "usage": {"input_tokens": 1, "output_tokens": 1}})
                return
            if self.path == "/v1/cancel":
                self._authorize("run:cancel")
                self.server.cancelled.set()
                self._json(HTTPStatus.ACCEPTED, {"cancelled": True, "run_id": self.server.run_id})
                return
            self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
        except CapabilityError as exc:
            self._json(HTTPStatus.UNAUTHORIZED, {"error": "authorization_denied", "message": str(exc)})
        except (ValueError, json.JSONDecodeError) as exc:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "invalid_request", "message": str(exc)})


def assert_safe_environment(environment: dict[str, str]) -> None:
    exposed = sorted(key for key in FORBIDDEN_CREDENTIALS if environment.get(key))
    if exposed:
        raise RuntimeError(f"forbidden master credentials present: {','.join(exposed)}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=int(os.environ.get("BEYOND_SIDECAR_PORT", "8765")))
    parser.add_argument("--event-log", default=os.environ.get("BEYOND_EVENT_LOG", "/workspace/.beyond/events.ndjson"))
    args = parser.parse_args()
    logging.basicConfig(level=os.environ.get("BEYOND_LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(name)s %(message)s")
    assert_safe_environment(dict(os.environ))
    run_id = os.environ.get("BEYOND_RUN_ID", "")
    public_key = os.environ.get("BEYOND_RUN_PUBLIC_KEY", "")
    if not run_id or not public_key:
        raise RuntimeError("BEYOND_RUN_ID and BEYOND_RUN_PUBLIC_KEY are required")
    server = RuntimeServer((args.host, args.port), RuntimeHandler, run_id=run_id, public_key=public_key, event_log=DurableEventLog(Path(args.event_log)))
    signal.signal(signal.SIGTERM, lambda *_: threading.Thread(target=server.shutdown, daemon=True).start())
    LOGGER.info("runtime_started run_id=%s port=%d", run_id, args.port)
    server.serve_forever(poll_interval=0.25)


if __name__ == "__main__":
    main()
