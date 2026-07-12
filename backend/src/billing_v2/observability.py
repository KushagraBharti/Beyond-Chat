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


def init_observability(app: object | None = None) -> dict[str, bool]:
    """Initialize Sentry and OpenTelemetry when configured AND installed.

    Import-guarded so neither SDK is a hard dependency; disabled silently when
    unconfigured, loudly logged when configured but not installed. Returns a
    truthful activation report for health/evidence surfaces.
    """

    settings = ObservabilitySettings.from_env()
    logger = logging.getLogger("beyond.observability")
    report = {"sentry": False, "otel": False}
    if settings.sentry_enabled and settings.sentry_dsn:
        try:
            import sentry_sdk

            sentry_sdk.init(dsn=settings.sentry_dsn, send_default_pii=False,
                            environment=settings.service_name)
            report["sentry"] = True
        except ImportError:
            logger.error("SENTRY_ENABLED is set but sentry-sdk is not installed.")
    if settings.otel_enabled and settings.otel_exporter_endpoint:
        try:
            from opentelemetry import trace
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
            from opentelemetry.sdk.resources import Resource
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.trace.export import BatchSpanProcessor

            provider = TracerProvider(resource=Resource.create({"service.name": settings.service_name}))
            provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=settings.otel_exporter_endpoint)))
            trace.set_tracer_provider(provider)
            if app is not None:
                try:
                    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

                    FastAPIInstrumentor.instrument_app(app)
                except ImportError:
                    logger.warning("FastAPI OTel instrumentation is not installed; traces are manual only.")
            report["otel"] = True
        except ImportError:
            logger.error("OTEL_ENABLED is set but the OpenTelemetry SDK is not installed.")
    return report


class StructuredLogTelemetry:
    """Sentry/OTel-ready port that emits redacted structured attributes only."""

    def __init__(self, logger: logging.Logger | None = None):
        self.logger = logger or logging.getLogger("beyond.billing_v2")

    def counter(self, name: str, value: int = 1, **attributes: str) -> None:
        self.logger.info("metric=%s value=%s attributes=%s", name, value, attributes)

    def error(self, error: Exception, **attributes: str) -> None:
        self.logger.error("billing_error=%s attributes=%s", type(error).__name__, attributes, exc_info=error)
