"""Regulation citation registry and grounding.

Loads a bundled regulation corpus (``regulation_corpus.json``) and grounds the
deterministic checks' ``regulation_cite`` strings against real regulation text.
This makes every decision traceable to the underlying Davis-Bacon / CWHSSA /
29 C.F.R. authority — even in fully offline mock mode (no network, no LLM).

The corpus is also the keyword-search corpus consumed by the hybrid retriever
(``retrieval/hybrid.py``), so a single bundled file is the single source of truth
for both grounding and RAG.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

from wcp_compliance.models.schemas import Citation, ComplianceCheck

logger = logging.getLogger(__name__)

_CORPUS_PATH = Path(__file__).parent / "regulation_corpus.json"

_CORPUS: list[dict[str, Any]] | None = None
_CITATION_INDEX: dict[str, dict[str, Any]] | None = None

# Minimal fallback so grounding still works if the bundled JSON is unreadable.
_FALLBACK_CHUNKS: list[dict[str, Any]] = [
    {
        "chunk_id": "reg-wage-rate",
        "citation": "40 U.S.C. § 3142",
        "regulation": "Davis-Bacon Act",
        "section": "40 U.S.C. § 3142",
        "category": "prevailing_wage",
        "text": (
            "Each laborer or mechanic must be paid not less than the prevailing "
            "wage determined by the Secretary of Labor for the classification of "
            "work actually performed."
        ),
    },
]


def normalize_citation(cite: str) -> str:
    """Normalize a citation string for tolerant matching.

    ``"40 U.S.C. § 3142"`` and ``"40 U.S.C.  §3142"`` both -> ``"40usc3142"``.
    Parentheses are preserved so subsection cites stay distinct
    (``"5.5(a)(3)(ii)"`` vs ``"5.5(a)(3)(i)"``).
    """
    s = (cite or "").lower().strip()
    s = s.replace("§", " ")
    s = re.sub(r"[^a-z0-9()]+", "", s)
    return s


def _normalize_chunk(raw: dict[str, Any]) -> dict[str, Any]:
    """Accept both corpus shape and the legacy seed shape ``{id,text,source}``."""
    chunk_id = str(raw.get("chunk_id") or raw.get("id") or "")
    citation = str(raw.get("citation") or raw.get("source") or raw.get("section") or "")
    section = str(raw.get("section") or citation)
    regulation = str(raw.get("regulation") or raw.get("category") or "Regulation")
    return {
        "chunk_id": chunk_id,
        "citation": citation,
        "regulation": regulation,
        "section": section,
        "category": str(raw.get("category", "")),
        "source": str(raw.get("source") or citation),
        "text": str(raw.get("text", "")),
    }


def _load_corpus() -> list[dict[str, Any]]:
    global _CORPUS

    if _CORPUS is not None:
        return _CORPUS

    try:
        raw = json.loads(_CORPUS_PATH.read_text(encoding="utf-8"))
        _CORPUS = [_normalize_chunk(item) for item in raw if item.get("text")]
        logger.info("Loaded %d regulation chunks from %s", len(_CORPUS), _CORPUS_PATH.name)
    except Exception:
        logger.warning("Failed to load regulation corpus; using fallback", exc_info=True)
        _CORPUS = [_normalize_chunk(item) for item in _FALLBACK_CHUNKS]

    return _CORPUS


def get_corpus() -> list[dict[str, Any]]:
    """Return the in-memory regulation corpus (loads lazily on first call)."""
    return _load_corpus()


def _citation_index() -> dict[str, dict[str, Any]]:
    global _CITATION_INDEX

    if _CITATION_INDEX is not None:
        return _CITATION_INDEX

    index: dict[str, dict[str, Any]] = {}
    for chunk in _load_corpus():
        key = normalize_citation(chunk.get("citation", ""))
        if key and key not in index:
            index[key] = chunk
    _CITATION_INDEX = index
    return index


def add_chunks(chunks: list[dict[str, Any]]) -> int:
    """Append regulation chunks to the corpus (idempotent on ``chunk_id``).

    Used by the dynamic ``POST /internal/search/index`` endpoint. Returns the
    number of newly added chunks.
    """
    corpus = _load_corpus()
    existing_ids = {c["chunk_id"] for c in corpus}
    added = 0
    for raw in chunks:
        chunk = _normalize_chunk(raw)
        if not chunk["chunk_id"] or not chunk["text"]:
            continue
        if chunk["chunk_id"] in existing_ids:
            continue
        corpus.append(chunk)
        existing_ids.add(chunk["chunk_id"])
        added += 1

    if added:
        # Invalidate the derived citation index so new chunks become groundable.
        global _CITATION_INDEX
        _CITATION_INDEX = None

    return added


def _match_chunk(cite: str) -> dict[str, Any] | None:
    if not cite:
        return None

    index = _citation_index()
    key = normalize_citation(cite)

    chunk = index.get(key)
    if chunk is not None:
        return chunk

    # Tolerant fallback: a subsection cite grounds to its parent section chunk.
    for indexed_key, candidate in index.items():
        if key.startswith(indexed_key) or indexed_key.startswith(key):
            return candidate

    return None


def ground_citation(cite: str) -> Citation | None:
    """Resolve a ``regulation_cite`` string to a grounded :class:`Citation`."""
    chunk = _match_chunk(cite)
    if chunk is None:
        return None
    return Citation(
        regulation=chunk.get("regulation", ""),
        section=chunk.get("section") or chunk.get("citation", ""),
        text=chunk.get("text", ""),
    )


def attach_citations(checks: list[ComplianceCheck]) -> list[Citation]:
    """Ground each check's ``regulation_cite`` and return deduped report citations.

    Mutates each check's ``citation_refs`` to point at its grounding chunk and
    returns the deduplicated, grounded :class:`Citation` list for the report.
    The result is identical in mock mode and real mode (pure, in-process).
    """
    report_citations: list[Citation] = []
    seen_chunk_ids: set[str] = set()

    for check in checks:
        chunk = _match_chunk(check.regulation_cite)
        if chunk is None:
            continue
        check.citation_refs = [chunk["chunk_id"]]
        chunk_id = chunk["chunk_id"]
        if chunk_id not in seen_chunk_ids:
            seen_chunk_ids.add(chunk_id)
            report_citations.append(
                Citation(
                    regulation=chunk.get("regulation", ""),
                    section=chunk.get("section") or chunk.get("citation", ""),
                    text=chunk.get("text", ""),
                )
            )

    return report_citations


def reset_corpus_cache() -> None:
    """Reset cached corpus/index (test idiom; mirrors dbwd ``reset_corpus_cache``)."""
    global _CORPUS, _CITATION_INDEX
    _CORPUS = None
    _CITATION_INDEX = None
