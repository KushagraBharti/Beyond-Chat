"""Readiness probe without external dependencies."""

from __future__ import annotations

import os
import sys
import urllib.request


def main() -> None:
    port = int(os.environ.get("BEYOND_SIDECAR_PORT", "8765"))
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/readyz", timeout=2) as response:  # noqa: S310 - loopback only
        if response.status != 200:
            raise RuntimeError(f"readiness returned {response.status}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"not ready: {type(exc).__name__}", file=sys.stderr)
        raise SystemExit(1) from exc
