"""Compatibility adapters for adding pipeline metadata to existing wire payloads."""

from collections.abc import Mapping
from typing import Any


def attach_pipeline_metadata(
    payload: Mapping[str, Any],
    *,
    trace_context: Mapping[str, Any] | None = None,
    cost_latency: Mapping[str, Any] | None = None,
    evidence_manifest: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Return a copy with additive metadata and every legacy field unchanged."""
    adapted = dict(payload)
    if trace_context is not None:
        adapted["trace_context"] = dict(trace_context)
    if cost_latency is not None:
        adapted["cost_latency"] = dict(cost_latency)
    if evidence_manifest is not None:
        adapted["evidence_manifest"] = dict(evidence_manifest)
    return adapted
