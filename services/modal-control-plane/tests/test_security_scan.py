from beyond_modal_control_plane.security_scan import _severity, _severity_from_cve


def test_debian_urgency_is_scoped_to_exact_ecosystem() -> None:
    detail = {
        "affected": [
            {
                "package": {"ecosystem": "Debian:11", "name": "tar"},
                "ecosystem_specific": {"urgency": "high"},
            },
            {
                "package": {"ecosystem": "Debian:12", "name": "tar"},
                "ecosystem_specific": {"urgency": "unimportant"},
            },
        ]
    }
    assert _severity(detail, "Debian:12", "tar") == ("unimportant", None, "debian-urgency")


def test_pypi_prefers_reviewed_database_severity() -> None:
    detail = {
        "severity": [{"type": "CVSS_V3", "score": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H"}],
        "database_specific": {"severity": "HIGH"},
    }
    severity, score, basis = _severity(detail, "PyPI", "cryptography")
    assert severity == "high"
    assert score == 7.5
    assert basis == "osv-database-specific"


def test_unscored_pypi_fails_closed() -> None:
    assert _severity({}, "PyPI", "unknown") == ("unknown", None, "unscored")


def test_debian_unassigned_uses_cve_cvss_fallback() -> None:
    detail = {
        "severity": [{"type": "CVSS_V3", "score": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N"}],
    }
    assert _severity_from_cve(detail) == ("medium", 5.3, "cve-cvss-fallback")


def test_ubuntu_priority_overrides_generic_cvss() -> None:
    detail = {
        "severity": [
            {"type": "CVSS_V3", "score": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"},
            {"type": "Ubuntu", "score": "medium"},
        ]
    }
    assert _severity(detail, "Ubuntu:26.04:LTS", "example") == ("medium", 9.8, "ubuntu-priority")
