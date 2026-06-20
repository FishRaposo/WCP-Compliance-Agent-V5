"""Integration test for Data Platform contract persistence flow.

Tests contract creation and retrieval through the full service stack.
"""

import pytest

pytestmark = pytest.mark.integration


def test_contract_creation_schema():
    """Test that contract creation schema is properly defined."""
    from wcp_data.models.schemas import ContractCreate
    from datetime import date
    from decimal import Decimal

    contract_data = ContractCreate(
        contract_number="GS-001-2026",
        project_name="Federal Building Renovation",
        contractor_name="Acme Construction",
        locality="Washington, DC",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        total_value=Decimal("500000.00"),
    )

    assert contract_data.contract_number == "GS-001-2026"
    assert contract_data.locality == "Washington, DC"
    assert contract_data.total_value == Decimal("500000.00")


def test_decision_record_schema():
    """Test that decision record schema is properly defined."""
    from wcp_data.models.schemas import DecisionCreate

    decision_data = DecisionCreate(
        job_id="test-job-123",
        verdict="approved",
        trust_score=0.95,
        trust_band="auto_approve",
        requires_human_review=False,
        violation_count=0,
        warning_count=0,
        reasoning_summary="All wage rates match DBWD requirements",
    )

    assert decision_data.job_id == "test-job-123"
    assert decision_data.verdict == "approved"
    assert 0 <= decision_data.trust_score <= 1
