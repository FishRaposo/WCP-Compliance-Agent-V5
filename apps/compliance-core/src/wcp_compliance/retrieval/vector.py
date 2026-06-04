"""Vector similarity search via pgvector.

Falls back gracefully when pgvector/embeddings are unavailable.
"""

import logging

from typing import Any, cast

logger = logging.getLogger(__name__)


async def vector_search(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    """Vector similarity search against regulation chunks.

    Falls back to empty results when pgvector is unavailable.
    """
    try:
        import aiohttp

        data_platform_url = "http://localhost:8001"
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{data_platform_url}/internal/regulation-chunks/search",
                json={"query": query, "top_k": top_k},
                timeout=aiohttp.ClientTimeout(total=5),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return cast(list[dict[str, Any]], data.get("results", []))
    except Exception:
        logger.debug("Vector search unavailable, returning empty")

    return []
