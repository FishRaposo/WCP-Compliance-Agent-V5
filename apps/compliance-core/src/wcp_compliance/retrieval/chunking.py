"""Text chunking for regulation documents.

Splits regulation text into semantic chunks with overlapping windows.
"""

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_CHUNK_SIZE = 500
DEFAULT_OVERLAP = 50


def chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_OVERLAP,
) -> list[dict[str, Any]]:
    if not text.strip():
        return []

    paragraphs = re.split(r"\n\n+", text.strip())
    chunks = []
    chunk_id = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if len(para) <= chunk_size:
            chunks.append({
                "chunk_id": f"chunk-{chunk_id}",
                "text": para,
                "start": 0,
                "end": len(para),
            })
            chunk_id += 1
        else:
            sentences = re.split(r"(?<=[.!?])\s+", para)
            current_chunk = ""
            for sentence in sentences:
                if len(current_chunk) + len(sentence) <= chunk_size:
                    current_chunk += " " + sentence if current_chunk else sentence
                else:
                    if current_chunk:
                        chunks.append({
                            "chunk_id": f"chunk-{chunk_id}",
                            "text": current_chunk.strip(),
                            "start": 0,
                            "end": len(current_chunk.strip()),
                        })
                        chunk_id += 1
                        current_chunk = current_chunk[-overlap:] + " " + sentence if overlap > 0 else sentence
                    else:
                        current_chunk = sentence

            if current_chunk.strip():
                chunks.append({
                    "chunk_id": f"chunk-{chunk_id}",
                    "text": current_chunk.strip(),
                    "start": 0,
                    "end": len(current_chunk.strip()),
                })
                chunk_id += 1

    logger.info("Chunked %d chars into %d chunks", len(text), len(chunks))
    return chunks


def chunk_regulation(
    regulation: str,
    section: str,
    text: str,
) -> list[dict[str, Any]]:
    """Chunk a regulation section with metadata."""
    chunks = chunk_text(text)
    for c in chunks:
        c["metadata"] = {"regulation": regulation, "section": section}
    return chunks
