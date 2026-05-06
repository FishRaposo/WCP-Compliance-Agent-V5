"""Observability metrics for WCP Compliance Core."""

import logging
from typing import Any

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Simple in-process metrics collector for decision evaluation."""

    def __init__(self) -> None:
        self._histograms: dict[str, list[float]] = {}
        self._counters: dict[str, int] = {}
        self._gauges: dict[str, float] = {}

    def record_decision_latency(self, ms: float) -> None:
        self._record_histogram("decision_latency_ms", ms)

    def record_token_usage(self, prompt_tokens: int, completion_tokens: int) -> None:
        self._record_histogram("token_usage_prompt", float(prompt_tokens))
        self._record_histogram("token_usage_completion", float(completion_tokens))

    def record_trust_score(self, score: float) -> None:
        self._record_histogram("trust_score", score)

    def increment_counter(self, name: str, value: int = 1) -> None:
        self._counters[name] = self._counters.get(name, 0) + value

    def set_gauge(self, name: str, value: float) -> None:
        self._gauges[name] = value

    def _record_histogram(self, name: str, value: float) -> None:
        if name not in self._histograms:
            self._histograms[name] = []
        self._histograms[name].append(value)

    def snapshot(self) -> dict[str, Any]:
        histograms = {}
        for name, values in self._histograms.items():
            if values:
                histograms[name] = {
                    "count": len(values),
                    "sum": sum(values),
                    "avg": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values),
                }
        return {
            "histograms": histograms,
            "counters": dict(self._counters),
            "gauges": dict(self._gauges),
        }

    def reset(self) -> None:
        self._histograms.clear()
        self._counters.clear()
        self._gauges.clear()


metrics = MetricsCollector()
