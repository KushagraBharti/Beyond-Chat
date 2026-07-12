# Architecture and Boundaries

## Responsibility split

The product control plane owns durable runs, identity, authorization, budgets, event ordering, approvals, tool policy, artifact metadata, and recovery decisions. Modal owns isolated ephemeral compute. The runtime sidecar translates a run-scoped capability into a small private API but is not an authorization authority for organization data.

```text
Browser / product API
        |
        v
Durable run coordinator ----> database event log + object references
        |
        | SandboxProvider contract
        v
ModalSandboxProvider ----> Modal app/image/volume APIs
        |
        v
Disposable sandbox
  - Beyond sidecar on loopback
  - task working set
  - run-scoped capability only
  - no master credentials
  - network blocked by default
        |
        +----> workspace volume subpath for durable working set
        +----> artifact volume subpath for semantic outputs/manifests
```

The remote smoke uses a deterministic fake model and echo tool to prove the private transport and capability boundary without injecting production provider credentials. Phase 4B must connect the sandbox to a signed internal gateway that rechecks organization, project, actor, current membership, policy, approval, connection ownership, and budget for every consequential operation.

## Provider adapter

`ModalSandboxProvider` implements the product contract:

- `create` validates resource limits, resolves a pinned image, mounts configured volumes, blocks network by default, starts the sidecar, and waits for an exec readiness probe.
- `start` recreates a stopped logical sandbox from the stored spec.
- `stop` and `terminate` are idempotent and wait for provider teardown.
- `exec` emits normalized start/stdout/stderr/exit events and rejects secret-shaped environment keys.
- `upload` verifies byte size and SHA-256 before writing under allowlisted roots.
- `download` reads only allowlisted paths and materializes content-addressed artifact metadata.
- `checkpoint` creates a stable filesystem snapshot and a product-level manifest that explicitly records `memory_snapshot: false`.
- `restore` accepts only Modal filesystem checkpoints and creates a fresh sandbox.
- `exposePort` refuses non-allowlisted ports.
- `usage` reports requested CPU/memory and elapsed metadata; actual billed usage remains provider evidence until Phase 4B usage finalization.
- provider failures map to product errors such as timeout, rate limited, sandbox lost, invalid artifact, or unavailable.

The adapter currently holds its logical registry in process memory. Durable sandbox attempt records, idempotency across API restarts, actual event cursors, object-store uploads, run-capability issuance, and budget lifecycle belong in the Phase 4B coordinator integration.

## Runtime sidecar and run capability

The runtime uses an Ed25519-signed compact token. Claims bind:

- exact run ID;
- explicit capabilities;
- issue and expiry time;
- unique nonce;
- maximum lifetime of 900 seconds.

Verification is fail-closed for malformed signatures, wrong run, expiry, future issue time, unknown capability, replay-shaped malformed input, and noncanonical base64 encodings. The sidecar refuses to start if a forbidden master-credential environment name is present.

The current private endpoints cover readiness, durable event append/replay, deterministic fake model, echo tool, and cancellation. They are a provider-plane proof, not the final public app-server protocol.

## Image composition

Release `2026-07-11.4` is layered so common runtime changes invalidate one base and capability-specific packages remain isolated. The final OS is digest-pinned Ubuntu 26.04; the Python `/usr/local` tree comes from a separately digest-pinned Python 3.12.12 slim build stage, with `libffi8` explicitly present for ABI compatibility:

- **Base:** Python 3.12, current pinned Python tooling, CA certificates, Tini, Beyond runtime, sidecar, and health check.
- **Documents:** LibreOffice headless, Pandoc, Poppler, fonts, Pillow, OpenPyXL, python-docx, python-pptx, and XlsxWriter.
- **Research:** Chromium, Poppler, Tesseract, Beautiful Soup, HTTPX, lxml, Playwright client, pypdf, and readability extraction.
- **Data/finance:** DuckDB, Matplotlib, NumPy, OpenPyXL, Pandas, Polars, PyArrow, and XlsxWriter.

Every remote smoke captures an exact CycloneDX 1.5 SBOM from installed Python distributions and Debian packages. The image definitions pin Python package versions; Debian packages are upgraded during build but remain subject to the distribution security lifecycle.

An image/media pack, Pi runtime, MCP client, real artifact uploader, telemetry exporter, and skill-manifest resolver are not yet part of this provider-plane release.

## Persistence and recovery

Three new volumes are reserved for this plane:

| Purpose | Name | ID | Mount policy |
|---|---|---|---|
| Cache | `beyond-chat-runtime-cache-v1` | `vo-32ghh7cJPxUHAg54jwujdl` | read-only in smoke |
| Working set | `beyond-chat-runtime-workspaces-v1` | `vo-Vji1FReSJUHavoZX6WsIEL` | per-run subpath |
| Semantic outputs | `beyond-chat-runtime-artifacts-v1` | `vo-k3pPcHikaFcfChazNxkILK` | per-run subpath |

The smoke proves two independent restore paths:

1. **Filesystem snapshot fast path:** take a stable filesystem snapshot, terminate the source sandbox, create a new sandbox from the snapshot image, remount the run volumes, and replay durable events.
2. **Logical fallback:** create a new sandbox from the pinned base image without the snapshot image, remount the run working-set and artifact subpaths, read the checkpoint manifest, and replay durable events.

No open process, socket, file descriptor, or secret is assumed to survive. Modal memory snapshots are not created. The final product must move authoritative events and artifact objects to Supabase/object storage rather than treating Modal Volume alone as the system of record.

## Resource policy

The smoke policy is one CPU, 1 GiB memory, 900-second run timeout, 300-second idle timeout, one concurrent smoke sandbox, and a 30-day filesystem-snapshot TTL. The TypeScript adapter has configurable hard ceilings and rejects non-finite, undersized, oversized, or malformed resource requests before provider mutation.

Published organization agents must resolve capability packs and resources through versioned product policy. Arbitrary per-run package installation is not a production feature.
