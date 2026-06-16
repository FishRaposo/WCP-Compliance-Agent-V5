"""OpenTelemetry tracing setup for WCP Data Platform.

Gated: every entry point is a no-op unless ``OTEL_EXPORTER_OTLP_ENDPOINT`` is
set, so offline / mock mode never attempts a network export.
"""

import logging
import os
from collections.abc import Generator
from contextlib import contextmanager
from typing import Any

logger = logging.getLogger(__name__)

_TRACING_ENABLED = False


def _otel_endpoint() -> str | None:
    return os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT") or None


def setup_tracing() -> None:
    """Configure the OTLP exporter when an endpoint is set; otherwise no-op."""
    global _TRACING_ENABLED

    endpoint = _otel_endpoint()
    if not endpoint:
        logger.debug("OTEL endpoint not configured; tracing disabled")
        return

    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import SERVICE_NAME, Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        resource = Resource(attributes={
            SERVICE_NAME: "wcp-data-platform",
            "service.version": "5.0.0",
        })

        provider = TracerProvider(resource=resource)
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint)))
        trace.set_tracer_provider(provider)
        _TRACING_ENABLED = True

        logger.info("OpenTelemetry tracing initialized (endpoint=%s)", endpoint)
    except Exception:
        logger.info("OpenTelemetry unavailable, tracing disabled")


def instrument_app(app: Any) -> None:
    """Auto-instrument the FastAPI app when tracing is enabled and libs present."""
    if not _TRACING_ENABLED:
        return
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        FastAPIInstrumentor.instrument_app(app)
        logger.info("FastAPI instrumentation enabled")
    except Exception:
        logger.debug("FastAPI instrumentation unavailable", exc_info=True)


def get_tracer(name: str = "wcp-data-platform") -> Any:
    try:
        from opentelemetry import trace

        return trace.get_tracer(name)
    except Exception:
        return None


def create_span(name: str, attributes: dict[str, Any] | None = None) -> Any:
    tracer = get_tracer()
    if tracer is None:
        @contextmanager
        def _noop() -> Generator[None, None, None]:
            yield None

        return _noop()

    return tracer.start_as_current_span(name, attributes=attributes or {})
