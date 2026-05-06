from __future__ import annotations

import logging
import re
import string
from datetime import date

from wcp_compliance.models.schemas import DBWDRateRecord
from wcp_compliance.normalization.trade_aliases import IN_MEMORY_ALIASES

logger = logging.getLogger(__name__)

_IN_MEMORY_CORPUS: dict[str, DBWDRateRecord] | None = None

_FALLBACK_CORPUS: list[dict[str, object]] = [
    {
        "trade": "Electrician",
        "locality": "Washington, DC",
        "rate": 51.69,
        "fringe": 34.63,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Plumber",
        "locality": "Washington, DC",
        "rate": 47.85,
        "fringe": 28.42,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Carpenter",
        "locality": "Washington, DC",
        "rate": 43.20,
        "fringe": 25.10,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Laborer",
        "locality": "Washington, DC",
        "rate": 28.50,
        "fringe": 15.75,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Ironworker",
        "locality": "Washington, DC",
        "rate": 52.30,
        "fringe": 30.15,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Equipment Operator",
        "locality": "Washington, DC",
        "rate": 44.60,
        "fringe": 22.80,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Painter",
        "locality": "Washington, DC",
        "rate": 38.90,
        "fringe": 18.50,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Sheet Metal Worker",
        "locality": "Washington, DC",
        "rate": 46.75,
        "fringe": 27.30,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "HVAC Technician",
        "locality": "Washington, DC",
        "rate": 49.10,
        "fringe": 29.45,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Welder",
        "locality": "Washington, DC",
        "rate": 48.25,
        "fringe": 26.90,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Mason",
        "locality": "Washington, DC",
        "rate": 42.15,
        "fringe": 23.60,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Roofer",
        "locality": "Washington, DC",
        "rate": 39.50,
        "fringe": 19.25,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Glazier",
        "locality": "Washington, DC",
        "rate": 41.80,
        "fringe": 22.40,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Insulation Worker",
        "locality": "Washington, DC",
        "rate": 37.60,
        "fringe": 20.15,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Tile Setter",
        "locality": "Washington, DC",
        "rate": 40.25,
        "fringe": 21.80,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Drywall Installer",
        "locality": "Washington, DC",
        "rate": 35.90,
        "fringe": 17.65,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Concrete Finisher",
        "locality": "Washington, DC",
        "rate": 38.40,
        "fringe": 19.90,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Surveyor",
        "locality": "Washington, DC",
        "rate": 45.30,
        "fringe": 24.50,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Flagger",
        "locality": "Washington, DC",
        "rate": 22.75,
        "fringe": 12.30,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
    {
        "trade": "Truck Driver",
        "locality": "Washington, DC",
        "rate": 30.20,
        "fringe": 16.45,
        "effective_date": "2025-01-01",
        "wage_determination_number": "DC-2025-001",
    },
]


def _load_corpus() -> dict[str, DBWDRateRecord]:
    global _IN_MEMORY_CORPUS

    if _IN_MEMORY_CORPUS is not None:
        return _IN_MEMORY_CORPUS

    _IN_MEMORY_CORPUS = {}
    for item in _FALLBACK_CORPUS:
        record = DBWDRateRecord(
            trade=str(item["trade"]),
            locality=str(item["locality"]),
            rate=float(str(item["rate"])),
            fringe=float(str(item["fringe"])),
            effective_date=date.fromisoformat(str(item["effective_date"])),
            wage_determination_number=str(item.get("wage_determination_number", "")),
        )
        key = record.trade.lower().replace(" ", "_")
        _IN_MEMORY_CORPUS[key] = record

    return _IN_MEMORY_CORPUS


def _normalize_trade(trade: str) -> str:
    normalized = trade.lower().strip()
    normalized = normalized.translate(str.maketrans("", "", string.punctuation))
    normalized = re.sub(r"\s+", " ", normalized)
    canonical = IN_MEMORY_ALIASES.get(normalized, normalized)
    return canonical.lower().strip().replace(" ", "_")


def _normalize_locality(locality: str) -> str:
    normalized = locality.lower().strip()
    normalized = normalized.translate(str.maketrans("", "", string.punctuation))
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized


def _parse_lookup_date(effective_date: str) -> date:
    try:
        return date.fromisoformat(effective_date)
    except ValueError as exc:
        raise ValueError(
            f"Invalid effective date '{effective_date}'. Expected YYYY-MM-DD"
        ) from exc


def _matches_lookup(record: DBWDRateRecord, locality: str, lookup_date: date) -> bool:
    return (
        _normalize_locality(record.locality) == _normalize_locality(locality)
        and record.effective_date <= lookup_date
    )


def _levenshtein_distance(a: str, b: str) -> int:
    if len(a) < len(b):
        return _levenshtein_distance(b, a)

    if len(b) == 0:
        return len(a)

    previous_row: list[int] = list(range(len(b) + 1))
    for i, c1 in enumerate(a):
        current_row = [i + 1]
        for j, c2 in enumerate(b):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def _fuzzy_match(trade: str, corpus: dict[str, DBWDRateRecord]) -> DBWDRateRecord | None:
    normalized = _normalize_trade(trade)

    if len(normalized) < 3:
        return None

    best_match: tuple[str, int] | None = None

    for key in corpus.keys():
        distance = _levenshtein_distance(normalized, key)
        if distance <= 3:
            if best_match is None or distance < best_match[1]:
                best_match = (key, distance)

    if best_match:
        return corpus[best_match[0]]

    return None


def _lookup_in_memory(trade: str, locality: str, lookup_date: date) -> DBWDRateRecord:
    corpus = _load_corpus()
    normalized = _normalize_trade(trade)
    scoped_corpus = {
        key: record
        for key, record in corpus.items()
        if _matches_lookup(record, locality, lookup_date)
    }

    if not scoped_corpus:
        raise ValueError(
            f"No DBWD rates found for locality '{locality}' on {lookup_date.isoformat()}"
        )

    if normalized in scoped_corpus:
        return scoped_corpus[normalized]

    fuzzy_result = _fuzzy_match(trade, scoped_corpus)
    if fuzzy_result:
        return fuzzy_result

    available = sorted(set(r.trade for r in scoped_corpus.values()))
    raise ValueError(
        f"Trade '{trade}' not found in DBWD corpus. "
        f"Available trades: {', '.join(available)}"
    )


async def get_dbwd_rate(trade: str, locality: str, effective_date: str) -> DBWDRateRecord:
    lookup_date = _parse_lookup_date(effective_date)
    return _lookup_in_memory(trade, locality, lookup_date)


def reset_corpus_cache() -> None:
    global _IN_MEMORY_CORPUS
    _IN_MEMORY_CORPUS = None
