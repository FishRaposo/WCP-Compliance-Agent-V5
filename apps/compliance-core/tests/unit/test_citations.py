"""Tests for regulation citation grounding and live BM25 retrieval (W1)."""

from __future__ import annotations

from datetime import date

import pytest

from wcp_compliance.checks.overtime_check import check_overtime
from wcp_compliance.checks.signature_check import check_signature
from wcp_compliance.checks.wage_check import check_wage
from wcp_compliance.citations import registry
from wcp_compliance.dbwd_matching.rate_lookup import reset_corpus_cache as reset_dbwd
from wcp_compliance.models.schemas import (
    ContractorInfo,
    DBWDRateRecord,
    EmployeeRecord,
    ExtractedWCP,
    ProjectInfo,
)
from wcp_compliance.retrieval.hybrid import HybridSearcher
from wcp_compliance.rules.engine import run_rule_engine

# Every regulation_cite emitted by a deterministic check must ground to real text.
DETERMINISTIC_CITES = [
    "40 U.S.C. § 3142",
    "40 U.S.C. § 3141(2)(B)",
    "29 C.F.R. § 5.32",
    "29 C.F.R. § 5.5(a)(3)(i)",
    "29 C.F.R. § 5.5(a)(3)(ii)(B)",
    "29 C.F.R. § 5.5(a)(3)(ii)",
    "29 U.S.C. § 206(a)(1)",
]


@pytest.fixture(autouse=True)
def _reset_caches():
    registry.reset_corpus_cache()
    reset_dbwd()
    yield
    registry.reset_corpus_cache()
    reset_dbwd()


def test_corpus_is_non_empty():
    corpus = registry.get_corpus()
    assert len(corpus) >= 8
    assert all(c["chunk_id"] and c["text"] for c in corpus)


@pytest.mark.parametrize("cite", DETERMINISTIC_CITES)
def test_every_deterministic_cite_grounds(cite: str):
    grounded = registry.ground_citation(cite)
    assert grounded is not None, f"{cite} did not ground to a corpus chunk"
    assert grounded.text.strip(), f"{cite} grounded to empty text"
    assert grounded.regulation.strip()


def test_normalize_citation_tolerant():
    assert registry.normalize_citation("40 U.S.C. § 3142") == registry.normalize_citation(
        "40 U.S.C.  §3142"
    )
    # Subsections stay distinct.
    assert registry.normalize_citation("29 C.F.R. § 5.5(a)(3)(i)") != registry.normalize_citation(
        "29 C.F.R. § 5.5(a)(3)(ii)"
    )


def test_attach_citations_sets_refs_and_dedupes():
    emp = EmployeeRecord(
        name="Jane",
        trade_classification="Electrician",
        hours_worked=40.0,
        hourly_wage=55.0,
        gross_earnings=2200.0,
        net_wages=2050.0,
    )
    rate = DBWDRateRecord(
        trade="Electrician", locality="Washington, DC", rate=51.69, fringe=34.63,
        effective_date=date(2025, 1, 1),
    )
    checks = [check_wage(emp, rate)]
    citations = registry.attach_citations(checks)
    assert checks[0].citation_refs  # ref populated
    assert citations and citations[0].text.strip()


@pytest.mark.asyncio
async def test_run_rule_engine_produces_grounded_citations():
    extracted = ExtractedWCP(
        job_id="cite-001",
        contractor=ContractorInfo(name="Acme"),
        project=ProjectInfo(name="Job", location="Washington, DC"),
        employees=[
            EmployeeRecord(
                name="Bob Underpaid",
                trade_classification="Electrician",
                hours_worked=40.0,
                hourly_wage=30.0,  # below DBWD -> violation
                gross_earnings=1200.0,
                net_wages=1100.0,
            )
        ],
    )
    report = await run_rule_engine(extracted)
    assert report.citations, "report carries no grounded citations"
    assert all(c.text.strip() for c in report.citations)
    # The failing wage check should carry a citation_ref.
    wage_checks = [c for c in report.checks if c.check_type == "wage_rate"]
    assert wage_checks and wage_checks[0].citation_refs


def test_signature_and_overtime_cites_ground():
    # Two specific checks whose cites historically had no grounding.
    sig = check_signature(
        ExtractedWCP(
            job_id="x",
            contractor=ContractorInfo(name="A"),
            project=ProjectInfo(name="P"),
            employees=[],
            payroll_number=1,
            week_ending=date(2025, 6, 14),
            certification_date=date(2025, 6, 15),
        )
    )
    assert registry.ground_citation(sig.regulation_cite) is not None
    ot = check_overtime(
        EmployeeRecord(
            name="C", trade_classification="Electrician", hours_worked=40.0,
            hourly_wage=50.0, gross_earnings=2000.0, net_wages=1900.0,
        )
    )
    assert registry.ground_citation(ot.regulation_cite) is not None


@pytest.mark.asyncio
async def test_hybrid_search_returns_real_results():
    searcher = HybridSearcher()
    results = await searcher.search("prevailing wage overtime premium", top_k=3)
    assert results, "BM25 returned no results over the seeded corpus"
    assert all(r.get("text") for r in results)


@pytest.mark.asyncio
async def test_index_endpoint_adds_searchable_chunk():
    searcher = HybridSearcher()
    added = searcher.add_chunks(
        [
            {
                "id": "reg-test-xyz",
                "text": "unicorn sasquatch yeti compliance marker",
                "source": "TEST",
            }
        ]
    )
    assert added == 1
    results = await searcher.search("unicorn sasquatch", top_k=3)
    assert any("unicorn" in r.get("text", "").lower() for r in results)
    # Idempotent on chunk_id.
    assert searcher.add_chunks([{"id": "reg-test-xyz", "text": "dup", "source": "TEST"}]) == 0
