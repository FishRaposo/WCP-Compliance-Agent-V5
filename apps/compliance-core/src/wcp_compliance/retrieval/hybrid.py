"""Hybrid RAG retrieval orchestrator.

Combines BM25 keyword search with vector similarity search
for regulation chunk retrieval.
"""

import logging
from dataclasses import dataclass, field
from typing import Any

from wcp_compliance.retrieval.bm25 import bm25_search
from wcp_compliance.retrieval.vector import vector_search

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    chunk_id: str
    text: str
    score: float
    rerank_score: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


class HybridSearcher:
    def __init__(self) -> None:
        self._bm25_index: dict[str, Any] = {}
        self._corpus: list[dict[str, Any]] = []
        self._corpus_loaded = False

    def _ensure_corpus(self) -> None:
        """Lazily back the searcher with the bundled regulation corpus.

        The corpus is the single source of truth shared with citation grounding
        (``citations/registry.py``). Imported lazily to avoid import-time cost.
        """
        if self._corpus_loaded:
            return
        try:
            from wcp_compliance.citations.registry import get_corpus

            self._corpus = get_corpus()
            self._corpus_loaded = True
        except Exception:
            logger.warning("Failed to load regulation corpus for retrieval", exc_info=True)

    def add_chunks(self, chunks: list[dict[str, Any]]) -> int:
        """Add regulation chunks to the shared corpus; returns count added."""
        from wcp_compliance.citations.registry import add_chunks as _add

        added = _add(chunks)
        # Re-bind to the (possibly extended) shared corpus list.
        self._corpus_loaded = False
        self._ensure_corpus()
        return added

    async def search(
        self,
        query: str,
        trade: str | None = None,
        locality: str | None = None,
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        self._ensure_corpus()
        results: list[dict[str, Any]] = []

        try:
            bm25_results = bm25_search(query, self._corpus, top_k)
            results.extend(bm25_results)
        except Exception:
            logger.warning("BM25 search failed", exc_info=True)

        if not results:
            try:
                vec_results = await vector_search(query, top_k)
                results.extend(vec_results)
            except Exception:
                logger.warning("Vector search failed", exc_info=True)

        if trade:
            trade_l = trade.lower()
            filtered = [r for r in results if trade_l in r.get("text", "").lower()]
            # Don't let a strict trade filter wipe out otherwise-relevant
            # regulation context — fall back to the unfiltered ranking.
            if filtered:
                results = filtered

        return results[:top_k]


hybrid_searcher = HybridSearcher()
