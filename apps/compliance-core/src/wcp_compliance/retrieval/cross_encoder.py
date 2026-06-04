"""Cross-encoder reranker for search results.

Re-ranks retrieved chunks using a cross-encoder model.
Falls back gracefully when sentence-transformers is not available.
"""

import logging

from typing import Any

logger = logging.getLogger(__name__)


async def rerank(
    query: str,
    results: list[dict[str, Any]],
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """Re-rank search results using a cross-encoder model.

    If cross-encoder is unavailable, returns results unchanged.
    """
    if not results:
        return []

    try:
        from sentence_transformers import CrossEncoder

        model_name = "cross-encoder/ms-marco-MiniLM-L-6-v2"
        model = CrossEncoder(model_name)

        pairs = [(query, r.get("text", "")) for r in results]
        scores = model.predict(pairs)

        scored = list(zip(results, scores))
        scored.sort(key=lambda x: x[1], reverse=True)

        for result, score in scored[:top_k]:
            result["rerank_score"] = float(score)

        return [r for r, _ in scored[:top_k]]
    except ImportError:
        logger.debug("Cross-encoder not available, returning raw results")
        return results[:top_k]
    except Exception:
        logger.warning("Cross-encoder rerank failed", exc_info=True)
        return results[:top_k]
