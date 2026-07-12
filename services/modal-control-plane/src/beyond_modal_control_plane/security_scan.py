"""Query OSV for exact SBOM versions and classify actionable findings."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from cvss import CVSS2, CVSS3, CVSS4, CVSSError

OSV_QUERY_BATCH = "https://api.osv.dev/v1/querybatch"
OSV_VULNERABILITY = "https://api.osv.dev/v1/vulns/"
USER_AGENT = "beyond-chat-phase4-security-scan/2"
SEVERITY_ORDER = {"unknown": -1, "unimportant": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}


def _ecosystem(component: dict[str, Any]) -> str | None:
    for item in component.get("properties", []):
        if item.get("name") == "beyond:ecosystem":
            return item.get("value")
    if component.get("purl", "").startswith("pkg:pypi/"):
        return "PyPI"
    if component.get("purl", "").startswith("pkg:deb/debian/"):
        return "Debian:12"
    return None


def _fetch_vulnerability(vulnerability_id: str) -> dict[str, Any]:
    request = urllib.request.Request(
        OSV_VULNERABILITY + vulnerability_id,
        headers={"user-agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:  # noqa: S310 - fixed official OSV endpoint
            return json.loads(response.read())
    except (urllib.error.URLError, TimeoutError) as exc:
        raise RuntimeError(f"OSV detail query failed for {vulnerability_id}") from exc


def _cvss_score(detail: dict[str, Any]) -> float | None:
    scores: list[float] = []
    for severity in detail.get("severity") or []:
        vector = severity.get("score")
        if not isinstance(vector, str):
            continue
        try:
            if vector.startswith("CVSS:4"):
                scores.append(float(CVSS4(vector).scores()[0]))
            elif vector.startswith("CVSS:3"):
                scores.append(float(CVSS3(vector).scores()[0]))
            elif vector.startswith("AV:"):
                scores.append(float(CVSS2(vector).scores()[0]))
        except (CVSSError, ValueError, IndexError):
            continue
    return max(scores) if scores else None


def _debian_urgency(detail: dict[str, Any], ecosystem: str) -> str | None:
    for affected in detail.get("affected") or []:
        package = affected.get("package") or {}
        if package.get("ecosystem") != ecosystem:
            continue
        urgency = (affected.get("ecosystem_specific") or {}).get("urgency")
        if isinstance(urgency, str):
            return urgency.lower().replace("_", "-")
    return None


def _severity(detail: dict[str, Any], ecosystem: str, name: str) -> tuple[str, float | None, str]:
    """Return normalized severity, CVSS score, and the authoritative basis."""

    if ecosystem.startswith("Debian:"):
        urgency = _debian_urgency(detail, ecosystem)
        normalized = {
            "unimportant": "unimportant",
            "low": "low",
            "medium": "medium",
            "high": "high",
        }.get(urgency or "", "unknown")
        return normalized, _cvss_score(detail), "debian-urgency"

    if ecosystem.startswith("Ubuntu:"):
        ubuntu_priority = next(
            (
                item.get("score", "").lower()
                for item in detail.get("severity") or []
                if item.get("type") == "Ubuntu" and isinstance(item.get("score"), str)
            ),
            "",
        )
        normalized = {
            "negligible": "unimportant",
            "low": "low",
            "medium": "medium",
            "high": "high",
            "critical": "critical",
        }.get(ubuntu_priority, "unknown")
        return normalized, _cvss_score(detail), "ubuntu-priority"

    score = _cvss_score(detail)
    database_severity = (detail.get("database_specific") or {}).get("severity")
    if isinstance(database_severity, str) and database_severity.lower() in SEVERITY_ORDER:
        return database_severity.lower(), score, "osv-database-specific"
    if score is None:
        return "unknown", None, "unscored"
    if score >= 9.0:
        return "critical", score, "cvss"
    if score >= 7.0:
        return "high", score, "cvss"
    if score >= 4.0:
        return "medium", score, "cvss"
    return "low", score, "cvss"


def _severity_from_cve(detail: dict[str, Any]) -> tuple[str, float | None, str]:
    score = _cvss_score(detail)
    if score is None:
        return "unknown", None, "unscored"
    if score >= 9.0:
        return "critical", score, "cve-cvss-fallback"
    if score >= 7.0:
        return "high", score, "cve-cvss-fallback"
    if score >= 4.0:
        return "medium", score, "cve-cvss-fallback"
    return "low", score, "cve-cvss-fallback"


def scan(sboms: list[Path], output: Path) -> dict[str, Any]:
    inventory: list[dict[str, Any]] = []
    for path in sboms:
        payload = json.loads(path.read_text(encoding="utf-8"))
        for component in payload.get("components", []):
            ecosystem = _ecosystem(component)
            if ecosystem and component.get("name") and component.get("version"):
                inventory.append({
                    "sbom": path.name,
                    "name": component["name"],
                    "version": component["version"],
                    "ecosystem": ecosystem,
                    "purl": component.get("purl"),
                })
    unique_queries: list[dict[str, Any]] = []
    query_index: dict[tuple[str, str, str], int] = {}
    for item in inventory:
        key = (item["ecosystem"], item["name"], item["version"])
        if key not in query_index:
            query_index[key] = len(unique_queries)
            unique_queries.append({"version": item["version"], "package": {"ecosystem": item["ecosystem"], "name": item["name"]}})
    request = urllib.request.Request(
        OSV_QUERY_BATCH,
        data=json.dumps({"queries": unique_queries}).encode("utf-8"),
        headers={"content-type": "application/json", "user-agent": USER_AGENT},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310 - fixed official OSV endpoint
            batch = json.loads(response.read())
    except (urllib.error.URLError, TimeoutError) as exc:
        raise RuntimeError("OSV query failed; scan cannot be treated as passing") from exc
    query_results = batch.get("results", [])
    if len(query_results) != len(unique_queries):
        raise RuntimeError("OSV response cardinality mismatch")
    vulnerability_ids = sorted({vulnerability.get("id") for result in query_results for vulnerability in result.get("vulns", []) if vulnerability.get("id")})
    details: dict[str, dict[str, Any]] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(_fetch_vulnerability, identifier): identifier for identifier in vulnerability_ids}
        for future in concurrent.futures.as_completed(futures):
            identifier = futures[future]
            details[identifier] = future.result()

    cve_fallback_ids = sorted(
        identifier.removeprefix("DEBIAN-")
        for identifier, detail in details.items()
        if identifier.startswith("DEBIAN-CVE-")
        and all(
            _debian_urgency(detail, ecosystem) not in {"unimportant", "low", "medium", "high"}
            for ecosystem in {query["package"]["ecosystem"] for query in unique_queries if query["package"]["ecosystem"].startswith("Debian:")}
        )
    )
    cve_details: dict[str, dict[str, Any]] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(_fetch_vulnerability, identifier): identifier for identifier in cve_fallback_ids}
        for future in concurrent.futures.as_completed(futures):
            identifier = futures[future]
            try:
                cve_details[identifier] = future.result()
            except RuntimeError:
                cve_details[identifier] = {}

    findings: list[dict[str, Any]] = []
    for item in inventory:
        result = query_results[query_index[(item["ecosystem"], item["name"], item["version"])]]
        for vulnerability in result.get("vulns", []):
            identifier = vulnerability.get("id")
            detail = details.get(identifier, {})
            severity, score, basis = _severity(detail, item["ecosystem"], item["name"])
            advisory_summary = detail.get("summary")
            if severity == "unknown" and item["ecosystem"].startswith("Debian:") and identifier.startswith("DEBIAN-CVE-"):
                cve_detail = cve_details.get(identifier.removeprefix("DEBIAN-"), {})
                severity, score, basis = _severity_from_cve(cve_detail)
                advisory_summary = cve_detail.get("summary")
            findings.append({
                **item,
                "id": identifier,
                "modified": vulnerability.get("modified"),
                "summary": advisory_summary,
                "severity": severity,
                "cvss_score": score,
                "severity_basis": basis,
                "distribution_priority": (
                    _debian_urgency(detail, item["ecosystem"])
                    if item["ecosystem"].startswith("Debian:")
                    else next(
                        (entry.get("score") for entry in detail.get("severity") or [] if entry.get("type") == "Ubuntu"),
                        None,
                    )
                ),
            })
    findings.sort(key=lambda item: (item["id"] or "", item["sbom"], item["name"], item["version"]))
    unique_findings: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    for finding in findings:
        key = (finding["id"], finding["ecosystem"], finding["name"], finding["version"])
        record = unique_findings.setdefault(key, {**finding, "sboms": []})
        record["sboms"].append(finding["sbom"])
    deduplicated = sorted(unique_findings.values(), key=lambda item: (item["id"], item["ecosystem"], item["name"], item["version"]))
    for finding in deduplicated:
        finding.pop("sbom", None)
        finding["sboms"] = sorted(set(finding["sboms"]))

    counts = {severity: 0 for severity in SEVERITY_ORDER}
    for finding in deduplicated:
        counts[finding["severity"]] += 1
    blocking = [finding for finding in deduplicated if finding["severity"] in {"critical", "high"}]
    manual_review = [finding for finding in deduplicated if finding["severity"] == "unknown"]
    result = {
        "schema_version": 1,
        "captured_at": datetime.now(UTC).isoformat(),
        "source": OSV_QUERY_BATCH,
        "sboms": [str(path) for path in sboms],
        "components_scanned": len(inventory),
        "unique_versions_scanned": len(unique_queries),
        "findings": deduplicated,
        "finding_occurrence_count": len(findings),
        "finding_count": len(deduplicated),
        "severity_counts": counts,
        "blocking_count": len(blocking),
        "manual_review_count": len(manual_review),
        "passed": len(blocking) == 0 and len(manual_review) == 0,
        "gate": "no high/critical or unclassified findings in exact deployed-image SBOMs",
        "limitations": [
            "OSV coverage varies by ecosystem and package; this is not a substitute for continuous image scanning.",
            "The scan covers the exact Python and Debian package versions captured from each deployed image.",
            "Debian findings use Debian ecosystem urgency, Ubuntu findings use Canonical priority, and PyPI findings prefer advisory severity before CVSS.",
            "Unclassified findings fail this one-time gate and require manual review; unimportant/low/medium findings remain visible.",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sbom", type=Path, action="append", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = scan(args.sbom, args.output)
    summary = {key: result[key] for key in ("captured_at", "components_scanned", "unique_versions_scanned", "finding_count", "severity_counts", "blocking_count", "manual_review_count", "passed")}
    print(json.dumps(summary, sort_keys=True))
    if not result["passed"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
