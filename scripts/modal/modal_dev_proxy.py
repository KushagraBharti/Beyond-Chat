"""Local HTTP bridge to the deployed Modal General Agent.

Run from services/modal-control-plane with uv so the authenticated Modal SDK is
available. The backend talks to this bridge exactly like it talks to the
production Modal web endpoint.
"""

from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os

import modal


HOST = "127.0.0.1"
PORT = int(os.getenv("MODAL_DEV_PROXY_PORT", "8799"))
SHARED_SECRET = os.environ["MODAL_RUNTIME_SHARED_SECRET"]
GENERAL_AGENT = modal.Function.from_name(
    "beyond-chat-runtime",
    "general-agent",
    environment_name="beyond-chat-production",
)


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/general-agent":
            self.send_error(404)
            return
        if self.headers.get("Authorization") != f"Bearer {SHARED_SECRET}":
            self.send_error(401)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))
            result = GENERAL_AGENT.remote(payload)
            body = json.dumps(result).encode()
        except Exception as exc:
            body = json.dumps({"detail": str(exc)[-1000:]}).encode()
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        print(f"modal-dev-proxy: {format % args}")


if __name__ == "__main__":
    print(f"Modal dev proxy listening on http://{HOST}:{PORT}/general-agent")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
