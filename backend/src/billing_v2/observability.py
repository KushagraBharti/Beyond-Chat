from __future__ import annotations

import logging
from dataclasses import dataclass
from os import environ


@dataclass(frozen=True)
class ObservabilitySettings:
    sentry_enabled: bool = False
    sentry_dsn: str | None = None
    otel_enabled: bool = False
    otel_exporter_endpoint: str | None = None
    service_name: str = "beyond-control-plane"

    @classmethod
    def from_env(cls) -> "ObservabilitySettings":
        sentry_dsn = environ.get("SENTRY_DSN") or None
        otel_endpoint = environ.get("OTEL_EXPORTER_OTLP_ENDPOINT") or None
        return cls(
            sentry_enabled=environ.get("SENTRY_ENABLED", "false").lower() == "true" and bool(sentry_dsn),
            sentry_dsn=sentry_dsn,
            otel_enabled=environ.get("OTEL_ENABLED", "false").lower() == "true" and bool(otel_endpoint),
            otel_exporter_endpoint=otel_endpoint,
            service_name=environ.get("OTEL_SERVICE_NAME", "beyond-control-plane"),
        )


class StructuredLogTelemetry:
    """Sentry/OTel-ready port that emits redacted structured attributes only."""

    def __init__(self, logger: logging.Logger | None = None):
        self.logger = logger or logging.getLogger("beyond.billing_v2")

    def counter(self, name: str, value: int = 1, **attributes: str) -> None:
        self.logger.info("metric=%s value=%s attributes=%s", name, value, attributes)

    def error(self, error: Exception, **attributes: str) -> None:
        self.logger.error("billing_error=%s attributes=%s", type(error).__name__, attributes, exc_info=error)
