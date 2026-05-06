"""Phoenix (Arize) observability setup for Compliance Core.

Configures OpenTelemetry exporter to send traces/spans to a Phoenix
server for visualization and analysis.
"""

import logging

logger = logging.getLogger(__name__)

DEFAULT_PHOENIX_ENDPOINT = "http://localhost:6006/v1/traces"


def setup_phoenix(endpoint: str | None = None) -> None:
    """Configure OpenTelemetry to export traces to Phoenix."""
    phoenix_endpoint = endpoint or DEFAULT_PHOENIX_ENDPOINT

    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import SERVICE_NAME, Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        resource = Resource(attributes={
            SERVICE_NAME: "wcp-compliance-core",
            "phoenix.enabled": "true",
        })

        provider = TracerProvider(resource=resource)
        exporter = OTLPSpanExporter(endpoint=phoenix_endpoint)
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        logger.info("Phoenix tracing configured at %s", phoenix_endpoint)
    except ImportError:
        logger.info("OpenTelemetry not installed, Phoenix tracing disabled")
    except Exception:
        logger.warning("Phoenix setup failed", exc_info=True)
