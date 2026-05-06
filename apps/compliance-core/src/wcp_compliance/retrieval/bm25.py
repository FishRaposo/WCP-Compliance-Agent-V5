"""Simple BM25 keyword search over regulation corpus."""

import logging
import math

logger = logging.getLogger(__name__)

K1 = 1.5
B = 0.75


def _tokenize(text: str) -> list[str]:
    return text.lower().split()


def bm25_search(query: str, corpus: list[dict], top_k: int = 5) -> list[dict]:
    if not corpus:
        return []

    tokenized_corpus = [_tokenize(doc.get("text", "")) for doc in corpus]
    query_tokens = _tokenize(query)
    avg_dl = sum(len(doc) for doc in tokenized_corpus) / len(tokenized_corpus)
    N = len(tokenized_corpus)

    _df: dict[str, int] = {}
    for doc in tokenized_corpus:
        for token in set(doc):
            _df[token] = _df.get(token, 0) + 1

    scored = []
    for i, doc in enumerate(tokenized_corpus):
        score = 0.0
        dl = len(doc)
        for token in query_tokens:
            if token not in _df:
                continue
            idf = math.log((N - _df[token] + 0.5) / (_df[token] + 0.5) + 1.0)
            tf = doc.count(token)
            score += idf * (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * dl / avg_dl))

        scored.append((score, i))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for score, idx in scored[:top_k]:
        if score > 0:
            results.append({
                "chunk_id": corpus[idx].get("chunk_id", f"chunk-{idx}"),
                "text": corpus[idx].get("text", ""),
                "score": round(score, 4),
            })

    return results
