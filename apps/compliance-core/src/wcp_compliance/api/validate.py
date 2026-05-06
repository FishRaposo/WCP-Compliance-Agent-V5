from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from wcp_compliance.extraction import extract_from_text
from wcp_compliance.models.schemas import DeterministicReport, ExtractedWCP
from wcp_compliance.rules.engine import run_rule_engine

router = APIRouter()


class ExtractAndValidateRequest(BaseModel):
    text: str | None = None


@router.post("/internal/validate", response_model=DeterministicReport)
async def validate_wcp(extracted: ExtractedWCP) -> DeterministicReport:
    try:
        return await run_rule_engine(extracted)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Validation failed: {str(e)}"
        ) from e


@router.post("/internal/extract-and-validate", response_model=DeterministicReport)
async def extract_and_validate(
    request: ExtractAndValidateRequest,
) -> DeterministicReport:
    if not request.text:
        raise HTTPException(status_code=400, detail="Provide 'text' for extraction")
    try:
        extracted = extract_from_text(request.text)
        return await run_rule_engine(extracted)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Extract-and-validate failed: {str(e)}"
        ) from e
