import logging
from typing import Any

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel

from wcp_compliance.citations.registry import get_corpus
from wcp_compliance.retrieval.hybrid import hybrid_searcher

logger = logging.getLogger(__name__)
router = APIRouter()


class SearchRequest(BaseModel):
    query: str = ""
    trade: str | None = None
    locality: str | None = None
    top_k: int = 5


class SearchResult(BaseModel):
    query: str
    results: list[dict[str, Any]]
    total: int


class IndexResponse(BaseModel):
    indexed: int
    total_corpus: int


@router.get("/", response_model=SearchResult)
async def search_get(
    q: str = Query(default="", min_length=0),
    limit: int = Query(default=10, le=50),
) -> SearchResult:
    logger.info("Search GET called with query=%s limit=%d", q, limit)
    if not q.strip():
        return SearchResult(query=q, results=[], total=0)

    results = await hybrid_searcher.search(q, top_k=limit)
    return SearchResult(query=q, results=results, total=len(results))


@router.post("/", response_model=SearchResult)
async def search_post(body: SearchRequest) -> SearchResult:
    logger.info("Search POST called with query=%s top_k=%d", body.query, body.top_k)
    if not body.query.strip():
        return SearchResult(query=body.query, results=[], total=0)

    results = await hybrid_searcher.search(
        body.query,
        trade=body.trade,
        locality=body.locality,
        top_k=body.top_k,
    )
    return SearchResult(query=body.query, results=results, total=len(results))


@router.post("/index", response_model=IndexResponse)
async def search_index(request: Request) -> IndexResponse:
    """Add regulation chunk(s) to the retrieval/grounding corpus.

    Accepts either a single chunk object or a list of chunks. Each chunk may use
    the corpus shape (``chunk_id``/``citation``/``section``) or the legacy seed
    shape (``id``/``source``/``category``); both are normalized.
    """
    payload = await request.json()
    chunks: list[dict[str, Any]] = payload if isinstance(payload, list) else [payload]
    added = hybrid_searcher.add_chunks(chunks)
    logger.info("Indexed %d new regulation chunk(s)", added)
    return IndexResponse(indexed=added, total_corpus=len(get_corpus()))
