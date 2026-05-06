"""OpenTelemetry tracing setup for WCP Data Platform."""

import logging

logger = logging.getLogger(__name__)


def setup_tracing() -> None:
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
        exporter = OTLPSpanExporter(
            endpoint="http://localhost:4318/v1/traces"
        )
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        logger.info("OpenTelemetry tracing initialized")
    except Exception:
        logger.info("OpenTelemetry unavailable, tracing disabled")


def get_tracer(name: str = "wcp-data-platform"):
    try:
        from opentelemetry import trace
        return trace.get_tracer(name)
    except Exception:
        return None


def create_span(name: str, attributes: dict | None = None):
    tracer = get_tracer()
    if tracer is None:
        from contextlib import contextmanager

        @contextmanager
        def _noop():
            yield None

        return _noop()

    return tracer.start_as_current_span(name, attributes=attributes or {})
