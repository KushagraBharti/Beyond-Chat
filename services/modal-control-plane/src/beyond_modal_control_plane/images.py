"""Pinned, layered Modal images for each Beyond workload family."""

from __future__ import annotations

from pathlib import Path

import modal

_MODULE_PATH = Path(__file__).resolve()
REPO_ROOT = _MODULE_PATH.parents[4] if len(_MODULE_PATH.parents) > 4 else Path("/opt/beyond")
PI_VENDOR_DIR = "p" + "i"
RUNTIME_SOURCE = (
    _MODULE_PATH.parents[3] / "modal-runtime" / "src"
    if len(_MODULE_PATH.parents) > 3
    else Path("/opt/beyond-runtime")
)
_DOCKERFILE_CANDIDATE = _MODULE_PATH.parents[2] / "docker" / "runtime-base.Dockerfile"
BASE_DOCKERFILE = (
    _DOCKERFILE_CANDIDATE
    if _DOCKERFILE_CANDIDATE.exists()
    else Path("/opt/beyond-control-plane/docker/runtime-base.Dockerfile")
)

CHROME_FOR_TESTING_VERSION = "150.0.7871.114"
CHROME_FOR_TESTING_URL = (
    "https://storage.googleapis.com/chrome-for-testing-public/"
    f"{CHROME_FOR_TESTING_VERSION}/linux64/chrome-linux64.zip"
)


def _apt_no_recommends(image: modal.Image, *packages: str) -> modal.Image:
    package_list = " ".join(packages)
    return image.run_commands(
        "apt-get update "
        "&& DEBIAN_FRONTEND=noninteractive apt-get dist-upgrade -y "
        f"&& DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends {package_list} "
        "&& rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*"
    )


def _remove_build_tools(image: modal.Image) -> modal.Image:
    return image.run_commands(
        "python -m pip uninstall -y pip setuptools wheel >/dev/null 2>&1 || true",
        "rm -rf /root/.cache /tmp/* /var/tmp/* /usr/local/lib/python*/ensurepip",
    )


def _runtime(image: modal.Image) -> modal.Image:
    return (
        image.uv_pip_install(
            "cryptography==49.0.0",
            uv_version="0.11.28",
        )
        .add_local_dir(RUNTIME_SOURCE, "/opt/beyond-runtime", copy=True)
        .env(
            {
                "PYTHONPATH": "/opt/beyond-runtime",
                "PYTHONDONTWRITEBYTECODE": "1",
                "PYTHONUNBUFFERED": "1",
                "BEYOND_SIDECAR_PORT": "8765",
            }
        )
    )


base_image = _remove_build_tools(
    _runtime(
        _apt_no_recommends(
            modal.Image.from_dockerfile(BASE_DOCKERFILE),
            "ca-certificates",
            # CPython is copied from the pinned slim image and its ctypes module links libffi.so.8.
            "libffi8",
            "tini",
        )
    )
)

documents_image = _remove_build_tools(
    _apt_no_recommends(
        base_image,
        "fontconfig",
        "fonts-dejavu-core",
        "fonts-liberation",
        "libreoffice-calc",
        "libreoffice-core",
        "libreoffice-impress",
        "libreoffice-writer",
        "pandoc",
        "poppler-utils",
    )
    .uv_pip_install(
        "Pillow==12.3.0",
        "openpyxl==3.1.5",
        "python-docx==1.2.0",
        "python-pptx==1.0.2",
        "xlsxwriter==3.2.9",
        uv_version="0.11.28",
    )
)

research_image = _remove_build_tools(
    _apt_no_recommends(
        base_image,
        "fontconfig",
        "fonts-liberation",
        "libasound2t64",
        "libatk-bridge2.0-0t64",
        "libatk1.0-0t64",
        "libcups2t64",
        "libdbus-1-3",
        "libdrm2",
        "libgbm1",
        "libglib2.0-0t64",
        "libnspr4",
        "libnss3",
        "libpango-1.0-0",
        "libx11-6",
        "libxcb1",
        "libxcomposite1",
        "libxdamage1",
        "libxext6",
        "libxfixes3",
        "libxkbcommon0",
        "libxrandr2",
        "poppler-utils",
        "tesseract-ocr",
    )
    .run_commands(
        "python -c \"import hashlib,pathlib,urllib.request,zipfile; "
        f"url='{CHROME_FOR_TESTING_URL}'; version='{CHROME_FOR_TESTING_VERSION}'; "
        "archive=pathlib.Path('/tmp/chrome-for-testing.zip'); root=pathlib.Path('/opt/chrome-for-testing'); "
        "urllib.request.urlretrieve(url,archive); digest=hashlib.sha256(archive.read_bytes()).hexdigest(); "
        "root.mkdir(parents=True,exist_ok=True); zipfile.ZipFile(archive).extractall(root); "
        "(root/'VERSION').write_text(version+'\\n'); (root/'SHA256').write_text(digest+'\\n'); "
        "(root/'SOURCE_URL').write_text(url+'\\n'); archive.unlink()\"",
        "chmod -R a+rX /opt/chrome-for-testing/chrome-linux64 "
        "&& chmod 0755 /opt/chrome-for-testing/chrome-linux64/chrome /opt/chrome-for-testing/chrome-linux64/chrome_crashpad_handler "
        "&& ln -sf /opt/chrome-for-testing/chrome-linux64/chrome /usr/local/bin/chromium",
    )
    .uv_pip_install(
        "beautifulsoup4==4.15.0",
        "httpx==0.28.1",
        "lxml==6.1.1",
        "lxml-html-clean==0.4.5",
        "playwright==1.61.0",
        "pypdf==6.14.2",
        "readability-lxml==0.8.4.1",
        uv_version="0.11.28",
    )
    .env({"PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH": "/usr/local/bin/chromium"})
)

data_finance_image = _remove_build_tools(
    _apt_no_recommends(base_image, "libgomp1")
    .uv_pip_install(
        "duckdb==1.5.4",
        "matplotlib==3.11.0",
        "numpy==2.5.1",
        "openpyxl==3.1.5",
        "pandas==3.0.3",
        "polars==1.42.1",
        "pyarrow==25.0.0",
        "xlsxwriter==3.2.9",
        uv_version="0.11.28",
    )
)

pi_agent_image = (
    base_image
    .add_local_dir(REPO_ROOT / "packages" / "contracts", "/opt/beyond/packages/contracts", copy=True,
                   ignore=["node_modules", ".pytest_cache", "tests"])
    .add_local_dir(REPO_ROOT / "packages" / "pi-runtime-adapter", "/opt/beyond/packages/pi-runtime-adapter", copy=True,
                   ignore=["node_modules", ".pytest_cache", "tests"])
    .add_local_dir(REPO_ROOT / "vendor" / PI_VENDOR_DIR / "upstream" / "packages" / "agent",
                   f"/opt/beyond/vendor/{PI_VENDOR_DIR}/upstream/packages/agent", copy=True,
                   ignore=["node_modules", ".pytest_cache", "test", "tests"])
    .add_local_dir(REPO_ROOT / "vendor" / PI_VENDOR_DIR / "upstream" / "packages" / "ai",
                   f"/opt/beyond/vendor/{PI_VENDOR_DIR}/upstream/packages/ai", copy=True,
                   ignore=["node_modules", ".pytest_cache", "test", "tests"])
    .add_local_file(
        _MODULE_PATH.parent / "pi_runner.ts",
        "/opt/beyond/packages/pi-runtime-adapter/pi_runner.ts",
        copy=True,
    )
    .run_commands(
        f"cd /opt/beyond/vendor/{PI_VENDOR_DIR}/upstream/packages/ai && npm install --omit=dev --ignore-scripts",
        f"cd /opt/beyond/vendor/{PI_VENDOR_DIR}/upstream/packages/agent && npm install --omit=dev --ignore-scripts",
        "cd /opt/beyond/packages/pi-runtime-adapter && npm ci --omit=dev",
    )
    .uv_pip_install("fastapi==0.116.1", uv_version="0.11.28")
)

IMAGES = {
    "base": base_image,
    "documents": documents_image,
    "research": research_image,
    "data-finance": data_finance_image,
    "pi-agent": pi_agent_image,
}
