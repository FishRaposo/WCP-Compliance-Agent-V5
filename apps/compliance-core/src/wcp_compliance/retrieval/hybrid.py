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

    async def search(
        self,
        query: str,
        trade: str | None = None,
        locality: str | None = None,
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
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
            results = [r for r in results if trade.lower() in r.get("text", "").lower()]

        return results[:top_k]


hybrid_searcher = HybridSearcher()
