# Security and Promotion Gate

## Threat boundary

The sandbox executes model-authored code and therefore must be treated as hostile even when the end user is trusted. Primary risks are credential theft, cross-run or cross-organization data access, unrestricted egress, persistence outside the assigned working set, resource exhaustion, tool-policy bypass, malicious outputs, vulnerable runtime dependencies, and incomplete teardown.

The provider plane mitigates only the portion it owns. It does not replace product authorization, gateway policy, approval, data classification, malware scanning, or output validation.

## Implemented controls

| Control | Implementation | Evidence |
|---|---|---|
| Master credential exclusion | Adapter rejects known administrative keys and generic `*_SECRET`/`*_API_KEY`; sidecar fails closed if forbidden master env names exist | provider tests and runtime tests |
| Short-lived identity | Ed25519 signed, run-bound, nonce-bearing, explicit capabilities, maximum 900-second lifetime | capability tests |
| Network default | `block_network=True` in remote smoke and default `blockNetwork` in provider | smoke/config |
| Filesystem scope | absolute path and allowlisted-root checks; per-run Volume subpath | provider tests and smoke |
| Resource bounds | CPU, memory, wall-time, and idle-time validation | provider tests/config |
| Private readiness | exec readiness probe; sidecar listens on loopback | app and smoke |
| Disposable compute | tagged sandbox termination on normal and exceptional paths | smoke plus zero-active provider state |
| Recoverability | stable filesystem snapshot and separate logical Volume restore; memory snapshot unused | smoke |
| Supply-chain inventory | exact CycloneDX SBOM for Python and Debian components in all four images | SBOM fixtures |
| Promotion fail-closed | OSV scan fails on high/critical or unclassified findings; rollout stays 0% | scan and rollout config |

## Controls required in Phase 4B

- The gateway must validate current WorkOS actor and organization membership, project access, agent version, skill/tool grants, approval, budget, and connection ownership on every call. The signed run capability is necessary but insufficient.
- Nonces for high-risk writes require server-side replay protection.
- Working-set construction must enforce source ACLs and minimize copied company knowledge.
- Semantic outputs must upload to authoritative object storage, pass type-specific validation and malware/content checks, and receive immutable hashes before completion.
- Per-organization and global concurrency reservations must be durable and released on every terminal path.
- Actual provider, model, tool, and storage usage must finalize from authoritative measurements.
- Security events need correlation IDs across API, coordinator, sandbox, gateway, storage, and webhook boundaries.
- Egress allowlists, if enabled, must be resolved from a published skill/agent manifest and organization policy. Arbitrary URLs from the model are not policy.

## Exact-image scan method

The smoke enumerates installed Python distributions and `dpkg-query` output inside each deployed image and writes CycloneDX 1.5 SBOMs. The scanner:

1. queries OSV `querybatch` for every exact ecosystem/name/version tuple;
2. fetches the full OSV record for every returned advisory;
3. uses the Debian 12 ecosystem urgency when it is assigned;
4. for `not yet assigned` Debian records, queries the corresponding CVE record and computes CVSS as a conservative fallback;
5. prefers reviewed advisory severity for PyPI and otherwise computes CVSS;
6. deduplicates the same advisory/package/version appearing in multiple image SBOMs while retaining the affected image list;
7. blocks promotion for high, critical, or unclassified records;
8. retains unimportant, low, and medium records for review rather than hiding them.

This scan is a dated point-in-time gate. OSV and Debian coverage can be incomplete, CVSS does not equal exploitability in this exact sandbox, and a clean scan does not prove absence of vulnerabilities. Continuous registry/image scanning and a formal exception process remain required.

## Current scan result

The historical `2026-07-11.2` report covered 1,853 component occurrences and 935 unique version queries. It recorded:

- 7 critical findings;
- 23 high findings;
- 34 medium findings;
- 9 low findings;
- 108 Debian `unimportant` findings;
- 36 unclassified findings requiring manual review.

The blocking set is dominated by Debian Bookworm packages in the base and capability images, including curl, Perl, Python 3.11 pulled by document/research packages, and capability-pack dependencies. Chromium has multiple newly published unclassified records. The exact list, versions, affected images, advisory summaries, CVSS values, and severity basis live in `fixtures/phase4/modal-osv-scan.json`.

The remediated `2026-07-11.4` exact-image report covers 515 component occurrences and 248 unique versions. It records 0 critical, 0 high, and 0 unclassified findings, so the image security gate passes. All 66 historical critical/high/unclassified records are individually classified in `fixtures/phase4/releases/2026-07-11.4/remediation-review.json`: 38 packages were removed and 28 were replaced by exact versions not affected by the prior advisory.

## Remediation path

1. Refresh Debian indexes and rebuild on every security evaluation; confirm whether Bookworm security updates resolve each exact version.
2. Remove packages that are not required at runtime. In particular, reassess curl in the base image and the full LibreOffice/Chromium dependency footprint.
3. Evaluate a maintained newer base distribution or a minimal/distroless split only with output parity, cold-start, package availability, and supportability evidence.
4. For each unresolved finding, record reachability, attack preconditions, sandbox network mode, privilege, affected capability pack, upstream fix availability, compensating controls, owner, expiry, and approval. “Not reachable” must be evidence-backed.
5. Do not create a blanket exception for an entire distro, package family, or CVSS class.
6. Rebuild to a new immutable release name; never replace an existing release in place.
7. Rerun probes, the extended smoke, SBOM generation, the OSV gate, failure injection, and product parity.
8. Require a passing report or narrowly approved, time-bounded exceptions before any canary.

## Promotion checklist

Promotion remains denied until all are true:

- exact image IDs match the reviewed release manifest;
- local locks, tests, typecheck, and npm audit pass;
- all remote image probes pass;
- lifecycle, cancellation, timeout, outputs, teardown, and both recovery paths pass;
- no master credential is present and the real gateway rechecks policy;
- the security report has no unapproved high/critical or unclassified finding;
- real usage and cost finalization are reconciled;
- legacy Finance parity and failure injection pass;
- a bounded internal canary has success/error/latency/cost thresholds and an automatic 0% rollback trigger;
- a human authorized for production routing approves the nonzero percentage.

Until then, `infra/modal/rollout.json` is the authority: disabled, 0%, legacy retained.
