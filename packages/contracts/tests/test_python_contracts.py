import pytest
from pydantic import ValidationError

from generated.python import CostLatency, EvidenceManifest, ExtractedWCP, PipelineEvent, TraceContext


@pytest.mark.parametrize(
    ("model", "payload"),
    [
        (PipelineEvent, {"schema_version": "v2", "event_type": "artifact_received", "job_id": "job-1"}),
        (PipelineEvent, {"schema_version": "v1", "event_type": "unknown", "job_id": "job-1"}),
        (TraceContext, {"schema_version": "v2", "request_id": "request-1"}),
        (CostLatency, {"schema_version": "v2", "cost_usd": 0, "latency_ms": 0}),
        (EvidenceManifest, {"schema_version": "v2", "artifact_id": "artifact-1", "entries": []}),
    ],
)
def test_versioned_models_reject_invalid_versions_and_event_types(model, payload):
    with pytest.raises(ValidationError):
        model.model_validate(payload)


@pytest.mark.parametrize(
    "payload",
    [
        {"schema_version": "v1", "cost_usd": -0.01, "latency_ms": 0},
        {"schema_version": "v1", "cost_usd": 0, "latency_ms": -1},
    ],
)
def test_cost_latency_rejects_negative_values(payload):
    with pytest.raises(ValidationError):
        CostLatency.model_validate(payload)


@pytest.mark.parametrize(
    "entries",
    [
        [{}],
        [{"name": "source.pdf", "sha256": "not-a-sha"}],
        [{"name": "source.pdf", "sha256": "a" * 64, "bytes": -1}],
    ],
)
def test_evidence_manifest_validates_nested_entries(entries):
    with pytest.raises(ValidationError):
        EvidenceManifest.model_validate(
            {"schema_version": "v1", "artifact_id": "artifact-1", "entries": entries}
        )


def test_extracted_wcp_round_trips_canonical_ids_and_additive_offline_metadata():
    payload = {
        "job_id": "job-1",
        "report_id": "report-1",
        "artifact_id": "artifact-1",
        "contractor": {"name": "Test Corp"},
        "project": {"name": "Project X"},
        "employees": [],
        "offline_metadata": {"noncanonical_input_issues": ["wage_determination"]},
    }

    assert ExtractedWCP.model_validate(payload).model_dump(exclude_none=True) == payload
